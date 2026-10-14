/// <reference types="node" />
// Impact colors are an owner-approved exception to the black/white/blue palette: they must
// match ForexFactory exactly (High #EF4444, Medium #F97316, Low #EAB308, Holiday #FFFFFF)
// and every impact surface must read them from the shared maps, never from ad-hoc classes.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FILTER_IMPACTS } from "./eventTypes";
import { IMPACT_BADGE, IMPACT_CHIP, IMPACT_DOT, IMPACT_TEXT } from "./impactStyles";
import type { FilterImpact } from "./types";

const readSrc = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = readSrc("../../index.css");

/** Decode an HSL-triplet token written the way src/index.css writes them, e.g. "0 84% 60%". */
function tokenHex(name: string): string {
  const m = new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%\\s*;`).exec(css);
  if (!m) throw new Error(`--${name} missing from src/index.css`);
  const h = Number(m[1]);
  const s = Number(m[2]) / 100;
  const l = Number(m[3]) / 100;
  const a = s * Math.min(l, 1 - l);
  const ch = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${ch(0)}${ch(8)}${ch(4)}`.toUpperCase();
}

const REQUESTED: Record<FilterImpact, string> = {
  high: "#EF4444",
  medium: "#F97316",
  low: "#EAB308",
  holiday: "#FFFFFF",
};

const BUCKETS = FILTER_IMPACTS.map((i) => i.id);

describe("Economic Calendar impact colors", () => {
  it("tokens resolve to the exact ForexFactory hexes", () => {
    expect(tokenHex("impact-high")).toBe(REQUESTED.high);
    expect(tokenHex("impact-medium")).toBe(REQUESTED.medium);
    expect(tokenHex("impact-low")).toBe(REQUESTED.low);
    expect(tokenHex("impact-holiday")).toBe(REQUESTED.holiday);
  });

  it("covers all four buckets in every impact surface map", () => {
    for (const map of [IMPACT_DOT, IMPACT_BADGE, IMPACT_CHIP, IMPACT_TEXT]) {
      expect(Object.keys(map).sort()).toEqual([...BUCKETS].sort());
    }
  });

  it("points each bucket at its own token, never another bucket's", () => {
    for (const b of BUCKETS) {
      expect(IMPACT_DOT[b]).toBe(`bg-impact-${b}`);
      expect(IMPACT_TEXT[b]).toBe(`text-impact-${b}`);
      for (const [name, cls] of Object.entries({ badge: IMPACT_BADGE[b], chip: IMPACT_CHIP[b] })) {
        expect(cls, `${name} for ${b}`).toContain(`impact-${b}`);
        for (const other of BUCKETS.filter((x) => x !== b)) {
          expect(cls, `${name} for ${b}`).not.toContain(`impact-${other}`);
        }
      }
    }
  });

  it("keeps impact components off the legacy state colors", () => {
    for (const f of ["ImpactBadge.tsx", "EventsTimelineView.tsx", "EventsCalendarView.tsx", "FiltersBar.tsx"]) {
      expect(readSrc(`../../components/economic/${f}`), f).not.toMatch(/\b(bg|text|border)-(danger|warning|success)\b/);
    }
  });

  it("routes holiday events to the white holiday color in rows and the details drawer", () => {
    expect(readSrc("../../components/economic/EventsListView.tsx")).toContain("bucket={impactBucket(e)}");
    expect(readSrc("../../components/economic/EventDetailsDrawer.tsx")).toContain("bucket={impactBucket(event)}");
  });
});
