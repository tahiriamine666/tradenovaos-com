// Single source of truth for Economic Calendar impact colors.
// ForexFactory-aligned palette (owner request 2026-10-12): High red #EF4444, Medium orange
// #F97316, Low yellow #EAB308, Holiday / Non-Economic white #FFFFFF.
// Every impact surface (filter swatches, event rows, badges, calendar cells, timeline bars)
// reads these classes, so the views cannot drift apart. Colors resolve to the semantic
// tokens in src/index.css — never literal hexes or Tailwind palette names here.
import type { FilterImpact } from "./types";

/** Solid fill: dots, filter swatches, timeline bars. */
export const IMPACT_DOT: Record<FilterImpact, string> = {
  high: "bg-impact-high",
  medium: "bg-impact-medium",
  low: "bg-impact-low",
  holiday: "bg-impact-holiday",
};

/** Tinted pill: impact badge background / text / border. */
export const IMPACT_BADGE: Record<FilterImpact, string> = {
  high: "bg-impact-high/10 text-impact-high border-impact-high/30",
  medium: "bg-impact-medium/10 text-impact-medium border-impact-medium/30",
  low: "bg-impact-low/10 text-impact-low border-impact-low/30",
  holiday: "bg-impact-holiday/10 text-impact-holiday border-impact-holiday/30",
};

/** Compact count chips inside calendar day cells. */
export const IMPACT_CHIP: Record<FilterImpact, string> = {
  high: "bg-impact-high/10 text-impact-high",
  medium: "bg-impact-medium/10 text-impact-medium",
  low: "bg-impact-low/10 text-impact-low",
  holiday: "bg-impact-holiday/10 text-impact-holiday",
};

/** Text-only accent (e.g. legends). */
export const IMPACT_TEXT: Record<FilterImpact, string> = {
  high: "text-impact-high",
  medium: "text-impact-medium",
  low: "text-impact-low",
  holiday: "text-impact-holiday",
};
