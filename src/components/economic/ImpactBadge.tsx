import { cn } from "@/lib/utils";
import { IMPACT_BADGE, IMPACT_DOT } from "@/lib/economic-calendar/impactStyles";
import type { FilterImpact, ImpactLevel } from "@/lib/economic-calendar/types";

/**
 * `bucket` lets callers show the Holiday / Non-Economic color (white) for events that are
 * stored as low impact; it defaults to the stored impact level.
 */
export function ImpactBadge({ impact, bucket = impact, className }: { impact: ImpactLevel; bucket?: FilterImpact; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
      IMPACT_BADGE[bucket],
      className,
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", IMPACT_DOT[bucket])} />
      {bucket === "holiday" ? "holiday" : impact}
    </span>
  );
}

export function ImpactDots({ impact, bucket = impact }: { impact: ImpactLevel; bucket?: FilterImpact }) {
  const filled = impact === "high" ? 3 : impact === "medium" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={bucket === "holiday" ? "Holiday / Non-Economic" : `${impact} impact`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i < filled ? IMPACT_DOT[bucket] : "bg-muted")} />
      ))}
    </span>
  );
}
