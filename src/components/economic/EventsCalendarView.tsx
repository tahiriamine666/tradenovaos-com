import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { EconomicEvent } from "@/lib/economic-calendar/types";

interface Props {
  events: EconomicEvent[];
  monthAnchor: Date;
  onSelectDay: (day: Date) => void;
  selectedDay?: Date | null;
}

export function EventsCalendarView({ events, monthAnchor, onSelectDay, selectedDay }: Props) {
  const { weeks, monthLabel } = useMemo(() => {
    const y = monthAnchor.getFullYear();
    const m = monthAnchor.getMonth();
    const first = new Date(y, m, 1);
    const startWeekDay = (first.getDay() + 6) % 7; // Mon=0
    const start = new Date(y, m, 1 - startWeekDay);
    const days: Date[] = [];
    for (let i = 0; i < 42; i++) days.push(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
    const weeks: Date[][] = [];
    for (let i = 0; i < 6; i++) weeks.push(days.slice(i * 7, i * 7 + 7));
    return { weeks, monthLabel: first.toLocaleDateString(undefined, { month: "long", year: "numeric" }) };
  }, [monthAnchor]);

  const byDay = useMemo(() => {
    const map = new Map<string, EconomicEvent[]>();
    for (const e of events) {
      const k = new Date(e.event_time).toDateString();
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
    }
    return map;
  }, [events]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 font-heading text-lg font-semibold text-foreground">{monthLabel}</div>
      <div className="grid grid-cols-7 gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d) => <div key={d} className="px-2 py-1">{d}</div>)}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {weeks.flat().map((d) => {
          const key = d.toDateString();
          const items = byDay.get(key) ?? [];
          const hi = items.filter((e) => e.impact === "high").length;
          const md = items.filter((e) => e.impact === "medium").length;
          const lo = items.filter((e) => e.impact === "low").length;
          const inMonth = d.getMonth() === monthAnchor.getMonth();
          const isSel = selectedDay && d.toDateString() === selectedDay.toDateString();
          return (
            <button
              key={key}
              onClick={() => onSelectDay(d)}
              className={cn(
                "min-h-[80px] rounded-lg border border-border/60 p-2 text-left transition-colors hover:border-primary/40",
                !inMonth && "opacity-40",
                isSel && "border-primary bg-primary/10",
              )}
            >
              <div className="text-xs font-medium text-foreground">{d.getDate()}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {hi > 0 && <span className="rounded bg-danger/10 px-1.5 text-[10px] font-semibold text-danger">{hi} H</span>}
                {md > 0 && <span className="rounded bg-warning/10 px-1.5 text-[10px] font-semibold text-warning">{md} M</span>}
                {lo > 0 && <span className="rounded bg-success/10 px-1.5 text-[10px] font-semibold text-success">{lo} L</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
