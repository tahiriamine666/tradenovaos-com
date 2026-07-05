import { cn } from "@/lib/utils";
import type { ImpactLevel } from "@/lib/economic-calendar/types";

const STYLES: Record<ImpactLevel, string> = {
  high: "bg-danger/10 text-danger border-danger/30",
  medium: "bg-warning/10 text-warning border-warning/30",
  low: "bg-success/10 text-success border-success/30",
};

export function ImpactBadge({ impact, className }: { impact: ImpactLevel; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
      STYLES[impact],
      className,
    )}>
      <span className={cn(
        "h-1.5 w-1.5 rounded-full",
        impact === "high" ? "bg-danger" : impact === "medium" ? "bg-warning" : "bg-success",
      )} />
      {impact}
    </span>
  );
}

export function ImpactDots({ impact }: { impact: ImpactLevel }) {
  const filled = impact === "high" ? 3 : impact === "medium" ? 2 : 1;
  const color = impact === "high" ? "bg-danger" : impact === "medium" ? "bg-warning" : "bg-success";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${impact} impact`}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={cn("h-1.5 w-1.5 rounded-full", i < filled ? color : "bg-muted")} />
      ))}
    </span>
  );
}
