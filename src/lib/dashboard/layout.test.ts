import { describe, it, expect } from "vitest";
import { normalizeLayout, moveWidget, DEFAULT_LAYOUT } from "./layout";
import { greetingFor, hourInZone, greetingName } from "./greeting";

describe("dashboard layout", () => {
  it("normalizes junk to default", () => expect(normalizeLayout(null)).toEqual(DEFAULT_LAYOUT));
  it("never hides core, keeps all widgets", () => {
    const l = normalizeLayout({ order: ["recent", "bogus", "kpis"], hidden: ["kpis", "today"] });
    expect(l.order.slice(0, 2)).toEqual(["recent", "kpis"]);
    expect(l.order).toHaveLength(7);
    expect(l.hidden).toEqual(["today"]);
  });
  it("moves widgets", () => {
    expect(moveWidget(["a", "b", "c"] as any, "a" as any, "c" as any)).toEqual(["b", "c", "a"]);
    expect(moveWidget(["a", "b", "c"] as any, "c" as any, "a" as any)).toEqual(["c", "a", "b"]);
  });
});

describe("greeting", () => {
  it("periods", () => {
    expect(greetingFor(5)).toBe("Good Morning");
    expect(greetingFor(11)).toBe("Good Morning");
    expect(greetingFor(12)).toBe("Good Afternoon");
    expect(greetingFor(17)).toBe("Good Afternoon");
    expect(greetingFor(18)).toBe("Good Evening");
    expect(greetingFor(4)).toBe("Good Evening");
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
    expect(greetingName(null)).toBe("Trader");
  });
});
