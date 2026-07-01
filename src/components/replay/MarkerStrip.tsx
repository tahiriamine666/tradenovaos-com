import * as React from "react";
import { cn } from "@/lib/utils";
import { Plus, ListPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ReplayMarker {
  id: string;
  kind: "entry" | "sl" | "tp" | "partial" | "exit" | "news";
  price?: number | null;
  time?: string | null;
  label?: string | null;
}

interface Props {
  markers: ReplayMarker[];
  onClick?: (m: ReplayMarker) => void;
  onAddExecution?: () => void;
}

const colorMap: Record<ReplayMarker["kind"], string> = {
  entry: "bg-primary text-primary-foreground border-primary",
  sl: "bg-red-500/15 text-red-500 border-red-500/40",
  tp: "bg-emerald-500/15 text-emerald-500 border-emerald-500/40",
  partial: "bg-amber-500/15 text-amber-500 border-amber-500/40",
  exit: "bg-slate-500/15 text-slate-400 border-slate-500/40",
  news: "bg-purple-500/15 text-purple-400 border-purple-500/40",
};

const kindLabel: Record<ReplayMarker["kind"], string> = {
  entry: "ENTRY",
  sl: "SL",
  tp: "TP",
  partial: "PARTIAL",
  exit: "EXIT",
  news: "NEWS",
};

export function MarkerStrip({ markers, onClick, onAddExecution }: Props) {
  if (!markers.length) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-card/50 px-3 py-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ListPlus className="h-3.5 w-3.5" />
          No executions logged yet — add your entry, partials, and exit to see them here and on the timeline.
        </div>
        {onAddExecution && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onAddExecution}>
            <Plus className="h-3 w-3" />
            Add execution
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border border-border bg-card/50 p-2">
      {markers.map((m) => (
        <button
          key={m.id}
          onClick={() => onClick?.(m)}
          className={cn(
            "rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition hover:scale-105",
            colorMap[m.kind],
          )}
          title={m.label ?? undefined}
        >
          {kindLabel[m.kind]}
          {m.price != null && (
            <span className="ml-1 font-mono text-[10px] opacity-80">{Number(m.price).toFixed(2)}</span>
          )}
        </button>
      ))}
    </div>
  );
}

