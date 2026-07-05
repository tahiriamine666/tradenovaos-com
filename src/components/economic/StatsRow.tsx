import { useMemo } from "react";
import { MetricCard } from "@/components/ui/metric-card";
import type { EconomicEvent } from "@/lib/economic-calendar/types";

export function StatsRow({ events }: { events: EconomicEvent[] }) {
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today.getTime() + 24 * 3600 * 1000);
    const in24 = new Date(now.getTime() + 24 * 3600 * 1000);

    const todays = events.filter((e) => {
      const t = new Date(e.event_time);
      return t >= today && t < tomorrow;
    });
    const highImpactToday = todays.filter((e) => e.impact === "high").length;
    const upcoming24 = events.filter((e) => {
      const t = new Date(e.event_time);
      return t >= now && t <= in24;
    }).length;

    const volByCurrency = new Map<string, number>();
    for (const e of events) {
      const w = e.impact === "high" ? 3 : e.impact === "medium" ? 2 : 1;
      volByCurrency.set(e.currency, (volByCurrency.get(e.currency) ?? 0) + w);
    }
    let topCcy = "—";
    let topScore = 0;
    for (const [k, v] of volByCurrency) if (v > topScore) { topScore = v; topCcy = k; }

    return { highImpactToday, total: todays.length, upcoming24, topCcy };
  }, [events]);

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard label="High Impact Today" value={stats.highImpactToday} tone={stats.highImpactToday > 0 ? "danger" : "neutral"} />
      <MetricCard label="Total Events Today" value={stats.total} />
      <MetricCard label="Next 24h" value={stats.upcoming24} tone="primary" />
      <MetricCard label="Most Volatile Currency" value={stats.topCcy} tone="primary" />
    </div>
  );
}
