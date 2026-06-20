import * as React from "react";
import { cn } from "@/lib/utils";

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

export function MarkerStrip({ markers, onClick }: Props) {
  if (!markers.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card/50 px-3 py-2 text-xs text-muted-foreground">
        No execution markers yet — add entries, partials, exits below.
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
