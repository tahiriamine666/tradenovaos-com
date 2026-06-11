import * as React from "react";
import { Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReplaySession } from "./types";

interface Props {
  sessions: ReplaySession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  loading?: boolean;
}

export function SessionList({ sessions, activeId, onSelect, onNew, loading }: Props) {
  const [q, setQ] = React.useState("");
  const [outcome, setOutcome] = React.useState<"all" | "win" | "loss" | "breakeven">("all");

  const filtered = React.useMemo(() => {
    const ql = q.trim().toLowerCase();
    return sessions.filter((s) => {
      if (outcome !== "all" && s.outcome !== outcome) return false;
      if (!ql) return true;
      return (
        (s.title ?? "").toLowerCase().includes(ql) ||
        (s.pair ?? "").toLowerCase().includes(ql) ||
        (s.setup ?? "").toLowerCase().includes(ql)
      );
    });
  }, [sessions, q, outcome]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="space-y-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search sessions"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-9 pl-8"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "win", "loss", "breakeven"] as const).map((o) => (
            <button
              key={o}
              onClick={() => setOutcome(o)}
              className={cn(
                "flex-1 rounded-md border px-2 py-1 text-xs capitalize transition-colors",
                outcome === o
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {o === "all" ? "All" : o}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-lg border border-border bg-card/40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Play}
            title="No replays yet"
            description="Start one to practice without risk."
            actions={
              <Button size="sm" onClick={onNew}>
                Start Replay
              </Button>
            }
          />
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((s) => {
              const active = s.id === activeId;
              const Icon =
                s.outcome === "win" ? TrendingUp : s.outcome === "loss" ? TrendingDown : Minus;
              const tone =
                s.outcome === "win"
                  ? "text-success"
                  : s.outcome === "loss"
                    ? "text-danger"
                    : "text-muted-foreground";
              return (
                <li key={s.id}>
                  <button
                    onClick={() => onSelect(s.id)}
                    className={cn(
                      "w-full rounded-lg border px-3 py-2.5 text-left transition-colors",
                      active
                        ? "border-primary bg-primary/5"
                        : "border-border bg-card hover:border-border/80 hover:bg-accent/30",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {s.title || s.pair || "Untitled replay"}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {[s.pair, s.timeframe ? `${s.timeframe}m` : null, s.session_name]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <Icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", tone)} />
                    </div>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {new Date(s.replay_date + "T12:00:00").toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
