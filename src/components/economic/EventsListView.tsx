import { Fragment, useMemo } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { CountryFlag } from "./CountryFlag";
import { ImpactDots } from "./ImpactBadge";
import type { EconomicEvent } from "@/lib/economic-calendar/types";

interface Props {
  events: EconomicEvent[];
  selectedId: string | null;
  onSelect: (e: EconomicEvent) => void;
  bookmarkIds: Set<string>;
  onBookmark: (id: string) => void;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function parseNum(v: string | null): number | null {
  if (v == null) return null;
  const cleaned = v.replace(/[%,]/g, "").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function deviation(actual: string | null, forecast: string | null): { text: string; tone: "up" | "down" | "neutral" } {
  const a = parseNum(actual);
  const f = parseNum(forecast);
  if (a == null || f == null) return { text: "—", tone: "neutral" };
  if (f === 0) {
    const diff = a - f;
    return { text: diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2), tone: diff > 0 ? "up" : diff < 0 ? "down" : "neutral" };
  }
  const pct = ((a - f) / Math.abs(f)) * 100;
  const sign = pct > 0 ? "+" : "";
  return { text: `${sign}${pct.toFixed(1)}%`, tone: pct > 0 ? "up" : pct < 0 ? "down" : "neutral" };
}

export function EventsListView({ events, selectedId, onSelect, bookmarkIds, onBookmark }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, EconomicEvent[]>();
    for (const e of events) {
      const day = new Date(e.event_time).toDateString();
      const arr = map.get(day) ?? [];
      arr.push(e);
      map.set(day, arr);
    }
    return Array.from(map.entries());
  }, [events]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid grid-cols-[80px_28px_60px_1fr_60px_80px_80px_80px_70px_60px_32px] items-center gap-3 border-b border-border bg-muted/30 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Time</span><span /><span>Ccy</span><span>Event</span>
        <span>Impact</span><span className="text-right">Forecast</span>
        <span className="text-right">Previous</span><span className="text-right">Actual</span>
        <span className="text-right">Deviation</span>
        <span className="text-right">Vol</span><span />
      </div>

      {grouped.map(([day, rows]) => (
        <Fragment key={day}>
          <div className="border-b border-border bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
            {fmtDay(rows[0].event_time)}
          </div>
          {rows.map((e) => {
            const isSel = e.id === selectedId;
            const isMarked = bookmarkIds.has(e.id);
            const dev = deviation(e.actual, e.forecast);
            return (
              <button
                key={e.id}
                onClick={() => onSelect(e)}
                className={cn(
                  "grid w-full grid-cols-[80px_28px_60px_1fr_60px_80px_80px_80px_70px_60px_32px] items-center gap-3 border-b border-border px-4 py-3 text-left text-sm transition-colors hover:bg-muted/40",
                  isSel && "bg-primary/10",
                )}
              >
                <span className="tabular-nums text-muted-foreground">{fmtTime(e.event_time)}</span>
                <CountryFlag code={e.country} className="text-lg" />
                <span className="font-medium text-foreground">{e.currency}</span>
                <span className="truncate text-foreground">{e.title}</span>
                <ImpactDots impact={e.impact} />
                <span className="text-right tabular-nums text-muted-foreground">{e.forecast ?? "—"}</span>
                <span className="text-right tabular-nums text-muted-foreground">{e.previous ?? "—"}</span>
                <span className={cn("text-right tabular-nums", e.actual ? "font-semibold text-foreground" : "text-muted-foreground")}>{e.actual ?? "—"}</span>
                <span className={cn(
                  "text-right tabular-nums font-medium",
                  dev.tone === "up" && "text-success",
                  dev.tone === "down" && "text-danger",
                  dev.tone === "neutral" && "text-muted-foreground",
                )}>{dev.text}</span>
                <span className="text-right tabular-nums text-muted-foreground">{e.volatility_score?.toFixed(1) ?? "—"}</span>
                <span onClick={(ev) => { ev.stopPropagation(); onBookmark(e.id); }} className="justify-self-end">
                  {isMarked
                    ? <BookmarkCheck className="h-4 w-4 text-primary" />
                    : <Bookmark className="h-4 w-4 text-muted-foreground hover:text-foreground" />}
                </span>
              </button>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
