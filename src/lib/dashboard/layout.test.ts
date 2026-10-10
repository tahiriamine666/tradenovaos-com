import { describe, it, expect } from "vitest";
import { normalizeLayout, moveWidget, DEFAULT_LAYOUT } from "./layout";
import { greetingFor, hourInZone, greetingName, dashboardGreeting } from "./greeting";

describe("dashboard layout", () => {
  it("normalizes junk to default", () => expect(normalizeLayout(null)).toEqual(DEFAULT_LAYOUT));
  it("expands old KPIs, keeps all widgets and permits hiding each card", () => {
    const l = normalizeLayout({ order: ["recent", "bogus", "kpis"], hidden: ["kpis", "today"] });
    expect(l.order.slice(0, 3)).toEqual(["recent", "pnl", "winrate"]);
    expect(l.order).toHaveLength(12);
    expect(l.hidden).toEqual(["today"]);
  });
  it("deduplicates hidden cards and drops unknown ids", () => {
    expect(normalizeLayout({ hidden: ["pnl", "pnl", "equity", "bogus"] }).hidden).toEqual(["pnl", "equity"]);
  });
  it("moves widgets", () => {
    expect(moveWidget(["pnl", "rr", "today"], "pnl", "today")).toEqual(["rr", "today", "pnl"]);
    expect(moveWidget(["pnl", "rr", "today"], "today", "pnl")).toEqual(["today", "pnl", "rr"]);
  });
});

describe("greeting", () => {
  it("periods", () => {
    expect(greetingFor(0)).toBe("Good morning");
    expect(greetingFor(11)).toBe("Good morning");
    expect(greetingFor(12)).toBe("Good evening");
    expect(greetingFor(17)).toBe("Good evening");
    expect(greetingFor(23)).toBe("Good evening");
  });
  it("uses timezone", () => {
    const d = new Date("2026-10-10T08:00:00Z");
    expect(hourInZone(d, "UTC")).toBe(8);
    expect(hourInZone(d, "America/New_York")).toBe(4);
    expect(hourInZone(d, "Asia/Tokyo")).toBe(17);
  });
  it("name fallback", () => {
    expect(greetingName({ display_name: "Amine", full_name: "X Y" })).toBe("Amine");
    expect(greetingName({ display_name: "", full_name: "Amine Tahiri" })).toBe("Amine");
    expect(greetingName(null)).toBe("");
    expect(greetingName({ display_name: "  Amine Tahiri " })).toBe("Amine");
  });
  it("uses exact local-time greeting and graceful fallback", () => {
    expect(dashboardGreeting({ display_name: "Amine" }, new Date(2026, 9, 10, 11, 59))).toBe("Welcome back, Amine — Good morning");
    expect(dashboardGreeting(null, new Date(2026, 9, 10, 12))).toBe("Welcome back — Good evening");
  });
});
