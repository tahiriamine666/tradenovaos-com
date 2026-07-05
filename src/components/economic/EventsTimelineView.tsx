import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { EconomicEvent } from "@/lib/economic-calendar/types";

interface Props {
  events: EconomicEvent[];
  day: Date;
  onSelect: (e: EconomicEvent) => void;
  selectedId: string | null;
}

export function EventsTimelineView({ events, day, onSelect, selectedId }: Props) {
  const dayEvents = useMemo(() => events.filter((e) => new Date(e.event_time).toDateString() === day.toDateString()), [events, day]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="font-heading text-lg font-semibold text-foreground">
          {day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div className="text-xs text-muted-foreground">{dayEvents.length} events</div>
      </div>

      <div className="relative">
        <div className="grid grid-cols-24 gap-0 border-b border-border pb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="col-span-1 border-l border-border/40 pl-1">{h.toString().padStart(2, "0")}</div>
          ))}
        </div>
        <div className="relative mt-2 h-40">
          {dayEvents.map((e) => {
            const t = new Date(e.event_time);
            const pct = ((t.getHours() * 60 + t.getMinutes()) / (24 * 60)) * 100;
            const isSel = e.id === selectedId;
            const color = e.impact === "high" ? "bg-danger" : e.impact === "medium" ? "bg-warning" : "bg-success";
            return (
              <button
                key={e.id}
                onClick={() => onSelect(e)}
                className={cn(
                  "absolute top-0 h-full w-[3px] rounded transition-all hover:w-2",
                  color, isSel && "w-2 ring-2 ring-primary",
                )}
                style={{ left: `${pct}%` }}
                title={`${e.title} · ${t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              />
            );
          })}
        </div>
        <div className="mt-3 space-y-1">
          {dayEvents.map((e) => (
            <button
              key={e.id}
              onClick={() => onSelect(e)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/40",
                selectedId === e.id && "border-primary bg-primary/10",
              )}
            >
              <span className="tabular-nums text-muted-foreground">
                {new Date(e.event_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="font-medium text-foreground">{e.currency}</span>
              <span className="flex-1 truncate">{e.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
