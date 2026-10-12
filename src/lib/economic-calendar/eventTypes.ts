// Event-type + impact buckets for the Advanced Filters panel.
// The data source only stores impact low/medium/high and a coarse category, so types are
// derived from the event title with keyword rules (same approach the sync function uses).
import type { EconomicEvent, FilterImpact } from "./types";

export const EVENT_TYPES = [
  "Growth", "Inflation", "Employment", "Central Bank", "Bonds",
  "Housing", "Consumer Surveys", "Business Surveys", "Speeches", "Misc",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const FILTER_IMPACTS: { id: FilterImpact; label: string }[] = [
  { id: "high", label: "High Impact" },
  { id: "medium", label: "Medium Impact" },
  { id: "low", label: "Low Impact" },
  { id: "holiday", label: "Holiday / Non-Economic" },
];

export const PANEL_CURRENCIES = ["AUD", "CAD", "CHF", "CNY", "EUR", "GBP", "JPY", "NZD", "USD"];

const HOLIDAY = /holiday|non-economic|market closed|observance|\bobserved\b/i;

export function impactBucket(e: Pick<EconomicEvent, "title" | "impact">): FilterImpact {
  if (HOLIDAY.test(e.title)) return "holiday";
  return e.impact;
}

const RULES: [EventType, RegExp][] = [
  ["Speeches", /speaks|speech|testif|press conference|hearing|remarks/i],
  ["Central Bank", /rate decision|interest rate|fomc|monetary policy|policy rate|cash rate|refi rate|minutes|rate statement|central bank|\b(ecb|boe|boj|rba|rbnz|snb|boc|pboc|fed)\b/i],
  ["Bonds", /bond|auction|t-bill|treasury|gilt|bund|\bbtp\b|\boat\b|yield/i],
  ["Inflation", /cpi|ppi|inflation|price index|prices|pce|deflator|hicp/i],
  ["Employment", /non-farm|nfp|employment|unemployment|payroll|jobless|jobs|claims|earnings|wage|\badp\b|labor|labour|claimant/i],
  ["Housing", /housing|home|building|mortgage|construction|starts|permits|house price|hpi/i],
  ["Consumer Surveys", /consumer (confidence|sentiment|expectations)|michigan|gfk|westpac consumer|conference board/i],
  ["Business Surveys", /pmi|\bism\b|business|ifo|zew|tankan|empire state|philly|philadelphia|richmond|\bnab\b|survey|sentiment|confidence|outlook/i],
  ["Growth", /gdp|retail sales|industrial|production|trade balance|exports|imports|current account|durable|factory orders|sales|spending|output|capacity|inventories|orders/i],
];

export function classifyEventType(title: string): EventType {
  if (HOLIDAY.test(title)) return "Misc";
  for (const [t, re] of RULES) if (re.test(title)) return t;
  return "Misc";
}

/** Map category values saved before the event-type filter existed. */
const LEGACY: Record<string, EventType> = {
  "Interest Rates": "Central Bank", GDP: "Growth", Manufacturing: "Business Surveys",
  "Consumer Confidence": "Consumer Surveys", Trade: "Growth", Retail: "Growth", Other: "Misc",
};
export function normalizeEventTypes(v: string[]): string[] {
  return [...new Set(v.map((c) => LEGACY[c] ?? c).filter((c) => (EVENT_TYPES as readonly string[]).includes(c)))];
}

/** OR within a section, AND between sections; empty section = all. */
export function matchesFilters(
  e: EconomicEvent,
  f: { currencies: string[]; impacts: FilterImpact[]; categories: string[]; countries: string[]; search: string },
): boolean {
  if (f.countries.length && !f.countries.includes(e.country)) return false;
  if (f.currencies.length && !f.currencies.includes(e.currency)) return false;
  if (f.impacts.length && !f.impacts.includes(impactBucket(e))) return false;
  if (f.categories.length && !f.categories.includes(classifyEventType(e.title))) return false;
  const q = f.search.trim().toLowerCase();
  if (q && !(e.title.toLowerCase().includes(q) || e.currency.toLowerCase().includes(q) || e.country.toLowerCase().includes(q))) return false;
  return true;
}
