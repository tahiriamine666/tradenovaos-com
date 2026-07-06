// Deterministic AI-style trading insight generator. Swappable with an LLM later.
import type { EconomicEvent } from "./types";

const CURRENCY_PAIRS: Record<string, string[]> = {
  USD: ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "NAS100", "US30"],
  EUR: ["EURUSD", "EURGBP", "EURJPY", "DAX"],
  GBP: ["GBPUSD", "EURGBP", "GBPJPY", "UK100"],
  JPY: ["USDJPY", "EURJPY", "GBPJPY", "JPN225"],
  AUD: ["AUDUSD", "AUDJPY", "AUS200"],
  CAD: ["USDCAD"],
  CHF: ["USDCHF", "EURCHF"],
  NZD: ["NZDUSD"],
};

const CURRENCY_IMPACT: Record<string, string> = {
  USD: "May move NAS100, S&P500, US30, and XAUUSD alongside broad USD pairs.",
  EUR: "Expect flow through EURUSD and DAX; watch EURGBP for cross reaction.",
  GBP: "GBPUSD and UK100 typically lead the reaction; EURGBP for relative moves.",
  JPY: "USDJPY and JPN225 tend to react first; carry pairs (AUDJPY, GBPJPY) amplify.",
  AUD: "AUDUSD and AUS200 lead; risk-on assets and copper often follow.",
  CAD: "USDCAD reacts alongside oil (WTI); watch crude flow for confirmation.",
  CHF: "Safe-haven demand shows in USDCHF and EURCHF quickly.",
  NZD: "NZDUSD leads; correlated with AUD and broad risk sentiment.",
};

const CATEGORY_HINTS: Record<string, string> = {
  Inflation: "Hotter prints usually strengthen the currency short-term as rate expectations shift hawkish; misses do the reverse.",
  "Interest Rates": "Rate decisions and forward guidance drive the sharpest FX and index moves — expect widened spreads and slippage.",
  Employment: "Payroll surprises move the currency and rate-sensitive equity indices immediately on release.",
  GDP: "Growth surprises reprice the currency and correlated equity indices with follow-through over hours.",
  Manufacturing: "PMI beats support the currency and cyclicals; deep misses accelerate risk-off flows.",
  "Consumer Confidence": "Sentiment surveys guide medium-term positioning rather than delivering an immediate spike.",
  "Central Bank": "Speeches and minutes can shift rate expectations sharply — trade the direction of the tone, not the headline.",
  Retail: "Consumer spending prints influence growth expectations and rate paths, especially in USD, GBP, AUD.",
  Housing: "Housing data feeds into rate outlook; look for reactions in USD and homebuilder equities.",
  Trade: "Trade balance shifts move commodity currencies (AUD, CAD, NZD) most.",
};

export function generateInsight(event: EconomicEvent): string[] {
  const bullets: string[] = [];
  const pairs = CURRENCY_PAIRS[event.currency] ?? [];
  const affected = event.affected_symbols?.length ? event.affected_symbols : pairs;

  const strength = event.impact === "high" ? "High probability of" : event.impact === "medium" ? "Moderate" : "Modest";
  bullets.push(`${strength} ${event.currency} volatility expected around ${event.title}.`);

  if (CURRENCY_IMPACT[event.currency]) {
    bullets.push(CURRENCY_IMPACT[event.currency]);
  }

  if (event.category && CATEGORY_HINTS[event.category]) {
    bullets.push(CATEGORY_HINTS[event.category]);
  }

  if (affected.length) {
    bullets.push(`Watch ${affected.slice(0, 5).join(", ")}${affected.length > 5 ? " and related pairs" : ""}. Consider reducing size 15 minutes before release.`);
  }

  if (event.forecast && event.previous) {
    bullets.push(`Consensus ${event.forecast} vs previous ${event.previous}. A beat favors ${event.currency}; a miss weighs on it.`);
  }

  if (event.impact === "high") {
    bullets.push("Manage risk: expect widened spreads, slippage, and rapid reversals in the first 60 seconds.");
  }

  return bullets;
}
