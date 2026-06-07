import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: React.ReactNode;
  /** Primary + optional secondary CTA, already rendered as <Button>. */
  actions?: React.ReactNode;
  /** Optional checklist / requirement rows shown under description. */
  checklist?: { label: string; done?: boolean }[];
  className?: string;
}

/**
 * Universal empty state. Replaces every ad-hoc "no data yet" block.
 * Never use fake demo data — use this instead.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actions,
  checklist,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 px-6 py-14 text-center",
        className,
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background">
          <Icon className="h-5 w-5 text-muted-foreground" strokeWidth={1.75} />
        </div>
      )}
      <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {checklist && checklist.length > 0 && (
        <ul className="mt-5 space-y-1.5 text-left text-sm text-muted-foreground">
          {checklist.map((c, i) => (
            <li key={i} className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px]",
                  c.done
                    ? "border-success bg-success/10 text-success"
                    : "border-border text-muted-foreground",
                )}
              >
                {c.done ? "✓" : ""}
              </span>
              <span>{c.label}</span>
            </li>
          ))}
        </ul>
      )}
      {actions && <div className="mt-6 flex flex-wrap items-center justify-center gap-2">{actions}</div>}
    </div>
  );
}
