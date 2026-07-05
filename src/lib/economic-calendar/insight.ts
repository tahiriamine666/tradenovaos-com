// Deterministic AI-style trading insight generator. Swappable with an LLM later.
import type { EconomicEvent } from "./types";

const CURRENCY_PAIRS: Record<string, string[]> = {
  USD: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "NAS100"],
  EUR: ["EURUSD", "EURGBP", "EURJPY"],
  GBP: ["GBPUSD", "EURGBP", "GBPJPY"],
  JPY: ["USDJPY", "EURJPY", "GBPJPY"],
  AUD: ["AUDUSD", "AUDJPY"],
  CAD: ["USDCAD"],
  CHF: ["USDCHF", "EURCHF"],
  NZD: ["NZDUSD"],
};

const CATEGORY_HINTS: Record<string, string> = {
  Inflation: "Higher-than-forecast prints typically strengthen the currency short-term as rate expectations shift hawkish.",
  "Interest Rates": "Rate decisions and forward guidance drive the sharpest FX and index moves — expect widened spreads and slippage.",
  Employment: "Payroll surprises move the associated currency and rate-sensitive equity indices immediately on release.",
  GDP: "Growth surprises reprice the currency and correlated equity indices, with follow-through over hours.",
  Manufacturing: "PMI beats support the currency and cyclicals; deep misses accelerate risk-off flows.",
  "Consumer Confidence": "Sentiment surveys guide medium-term positioning rather than delivering an immediate spike.",
  "Central Bank": "Speeches and minutes can shift rate expectations sharply — trade the direction of the tone, not the headline.",
};

export function generateInsight(event: EconomicEvent): string[] {
  const bullets: string[] = [];
  const pairs = CURRENCY_PAIRS[event.currency] ?? [];
  const affected = event.affected_symbols?.length ? event.affected_symbols : pairs;

  const headline = `${event.title} expected to ${event.impact === "high" ? "significantly move" : event.impact === "medium" ? "move" : "modestly influence"} ${event.currency}.`;
  bullets.push(headline);

  if (event.category && CATEGORY_HINTS[event.category]) {
    bullets.push(CATEGORY_HINTS[event.category]);
  }

  if (affected.length) {
    bullets.push(`Watch ${affected.slice(0, 4).join(", ")}${affected.length > 4 ? " and related pairs" : ""}. Consider reducing size 15 min before release.`);
  }

  if (event.forecast && event.previous) {
    bullets.push(`Consensus: ${event.forecast} vs previous ${event.previous}. A beat favors ${event.currency}; a miss weighs on it.`);
  }

  return bullets;
}
