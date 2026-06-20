import * as React from "react";
import { Newspaper } from "lucide-react";

// High-impact recurring events. Replaceable with a live feed later.
const RECURRING_EVENTS: { name: string; impact: string; dayOfMonth?: number; firstFridayOfMonth?: boolean }[] = [
  { name: "NFP", impact: "USD volatility spike", firstFridayOfMonth: true },
  { name: "CPI", impact: "Inflation read — major USD/equities move", dayOfMonth: 12 },
  { name: "FOMC", impact: "Rate decision + statement", dayOfMonth: 18 },
  { name: "Rate Decision (ECB)", impact: "EUR volatility", dayOfMonth: 6 },
];

function eventsForDate(d: Date): { name: string; impact: string }[] {
  const out: { name: string; impact: string }[] = [];
  const day = d.getUTCDate();
  const dow = d.getUTCDay();
  for (const e of RECURRING_EVENTS) {
    if (e.firstFridayOfMonth && dow === 5 && day <= 7) out.push({ name: e.name, impact: e.impact });
    else if (e.dayOfMonth && Math.abs(day - e.dayOfMonth) <= 2) out.push({ name: e.name, impact: e.impact });
  }
  return out;
}

export function NewsBadges({ date }: { date: string | null | undefined }) {
  const events = React.useMemo(() => (date ? eventsForDate(new Date(date)) : []), [date]);
  if (!events.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/5 px-3 py-2">
      <Newspaper className="h-3.5 w-3.5 text-purple-400" />
      <span className="text-[10px] uppercase tracking-wider text-purple-400">High-impact news</span>
      {events.map((e) => (
        <span
          key={e.name}
          className="rounded-md border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[11px] font-medium text-purple-300"
          title={e.impact}
        >
          {e.name}
        </span>
      ))}
    </div>
  );
}
