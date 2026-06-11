import * as React from "react";
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Execution } from "./types";

interface Props {
  executions: Execution[];
  onDelete: (id: string) => void;
  onClose: (id: string, exitPrice: number) => void;
}

export function ExecutionTimeline({ executions, onDelete, onClose }: Props) {
  if (executions.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-border bg-card/40 px-4 py-6 text-xs text-muted-foreground">
        No executions yet — record entries from the right panel.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="relative h-10 border-b border-border px-4">
        <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-border" />
        {executions.map((ex, i) => {
          const pos = (i / Math.max(executions.length - 1, 1)) * 100;
          const tone =
            ex.action === "exit"
              ? ex.pnl_r != null && ex.pnl_r >= 0
                ? "bg-success"
                : "bg-danger"
              : ex.direction === "long"
                ? "bg-success"
                : "bg-danger";
          return (
            <div
              key={ex.id}
              title={`${ex.action} @ ${ex.price}`}
              style={{ left: `calc(${pos}% + 16px)` }}
              className={cn(
                "absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-card",
                tone,
              )}
            />
          );
        })}
      </div>

      <ul className="divide-y divide-border max-h-44 overflow-y-auto">
        {executions.map((ex) => {
          const Icon = ex.direction === "long" ? ArrowUp : ArrowDown;
          const dirTone = ex.direction === "long" ? "text-success" : "text-danger";
          const open = ex.action === "entry" && ex.pnl_r == null;
          return (
            <li key={ex.id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <Icon className={cn("h-3.5 w-3.5 shrink-0", dirTone)} />
              <span className="w-14 text-xs uppercase tracking-wider text-muted-foreground">
                {ex.action}
              </span>
              <span className="tabular-nums">@ {ex.price}</span>
              <span className="text-xs text-muted-foreground tabular-nums">size {ex.size}</span>
              {ex.rr != null && (
                <span className="text-xs text-muted-foreground tabular-nums">{ex.rr}R target</span>
              )}
              {ex.pnl_r != null && (
                <span
                  className={cn(
                    "ml-auto text-xs font-medium tabular-nums",
                    ex.pnl_r >= 0 ? "text-success" : "text-danger",
                  )}
                >
                  {ex.pnl_r >= 0 ? "+" : ""}
                  {ex.pnl_r.toFixed(2)}R
                </span>
              )}
              <div className="ml-auto flex items-center gap-1">
                {open && (
                  <button
                    onClick={() => {
                      const v = window.prompt("Exit price:");
                      const px = v ? parseFloat(v) : NaN;
                      if (isFinite(px)) onClose(ex.id, px);
                    }}
                    className="rounded border border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    Close
                  </button>
                )}
                <button
                  onClick={() => onDelete(ex.id)}
                  className="rounded p-1 text-muted-foreground hover:text-danger"
                  title="Delete"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
