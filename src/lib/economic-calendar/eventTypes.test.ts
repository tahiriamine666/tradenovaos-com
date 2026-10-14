import { describe, expect, it } from "vitest";
import { classifyEventType, impactBucket, matchesFilters, normalizeEventTypes } from "./eventTypes";
import { DEFAULT_FILTERS, normalizeFilters } from "./range";
import type { EconomicEvent } from "./types";

const ev = (p: Partial<EconomicEvent>): EconomicEvent => ({
  id: "1", event_time: "2026-10-12T12:00:00Z", country: "US", currency: "USD", title: "CPI m/m", category: null,
  impact: "high", forecast: null, previous: null, actual: null, unit: null, source: null, description: null,
  volatility_score: null, affected_symbols: null, external_id: null, source_provider: null, ...p,
});
const base = { currencies: [], impacts: [], categories: [], countries: [], search: "" };

describe("economic calendar filters", () => {
  it("first-time default is High impact, USD only, all types, this week", () => {
    expect(DEFAULT_FILTERS.impacts).toEqual(["high"]);
    expect(DEFAULT_FILTERS.currencies).toEqual(["USD"]);
    expect(DEFAULT_FILTERS.categories).toEqual([]);
    expect(DEFAULT_FILTERS.range.preset).toBe("this_week");
  });
  it("OR within a section", () => {
    const f = { ...base, currencies: ["EUR", "USD"] };
    expect(matchesFilters(ev({ currency: "USD" }), f)).toBe(true);
    expect(matchesFilters(ev({ currency: "EUR" }), f)).toBe(true);
    expect(matchesFilters(ev({ currency: "JPY" }), f)).toBe(false);
  });
  it("AND between sections", () => {
    const f = { ...base, currencies: ["USD"], impacts: ["high" as const] };
    expect(matchesFilters(ev({ currency: "USD", impact: "medium" }), f)).toBe(false);
    expect(matchesFilters(ev({ currency: "EUR", impact: "high" }), f)).toBe(false);
    expect(matchesFilters(ev({ currency: "USD", impact: "high" }), f)).toBe(true);
  });
  it("holidays are their own impact bucket", () => {
    expect(impactBucket(ev({ title: "Bank Holiday", impact: "low" }))).toBe("holiday");
    expect(matchesFilters(ev({ title: "Bank Holiday", impact: "low" }), { ...base, impacts: ["low"] })).toBe(false);
  });
  it("classifies event types from titles", () => {
    expect(classifyEventType("Fed Chair Powell Speaks")).toBe("Speeches");
    expect(classifyEventType("Federal Funds Rate")).toBe("Central Bank");
    expect(classifyEventType("10-y Bond Auction")).toBe("Bonds");
    expect(classifyEventType("Non-Farm Employment Change")).toBe("Employment");
    expect(classifyEventType("ISM Manufacturing PMI")).toBe("Business Surveys");
    expect(classifyEventType("Advance GDP q/q")).toBe("Growth");
  });
  it("old saved presets map to new event types", () => {
    expect(normalizeEventTypes(["GDP", "Interest Rates", "Other"])).toEqual(["Growth", "Central Bank", "Misc"]);
    expect(normalizeFilters({ categories: ["Manufacturing"], impacts: ["high", "bogus"] }).categories).toEqual(["Business Surveys"]);
  });
});
