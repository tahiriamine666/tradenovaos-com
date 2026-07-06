import { Bell, Bookmark, BookmarkCheck, X } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CountryFlag } from "./CountryFlag";
import { ImpactBadge } from "./ImpactBadge";
import { AiInsightCard } from "./AiInsightCard";
import { SymbolChart } from "./SymbolChart";
import type { EconomicEvent } from "@/lib/economic-calendar/types";

interface Props {
  event: EconomicEvent | null;
  onClose: () => void;
  bookmarked: boolean;
  onBookmark: (id: string) => void;
  onSetAlert: (id: string, minutes: 5 | 15 | 30 | 60) => void;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-background/60 p-3">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="mt-1 font-heading text-lg font-semibold tabular-nums text-foreground">{value ?? "—"}</span>
    </div>
  );
}

export function EventDetailsDrawer({ event, onClose, bookmarked, onBookmark, onSetAlert }: Props) {
  return (
    <Sheet open={!!event} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-xl">
        {event && (
          <div className="flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <CountryFlag code={event.country} className="text-3xl" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{event.currency}</span>
                    <ImpactBadge impact={event.impact} />
                  </div>
                  <h2 className="mt-1 font-heading text-xl font-semibold text-foreground">{event.title}</h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {new Date(event.event_time).toLocaleString(undefined, {
                      weekday: "short", month: "short", day: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                    {event.source && ` · ${event.source}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" onClick={() => onBookmark(event.id)} title="Bookmark">
                  {bookmarked
                    ? <BookmarkCheck className="h-4 w-4 text-primary" />
                    : <Bookmark className="h-4 w-4" />}
                </Button>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="icon" variant="ghost" title="Set reminder">
                      <Bell className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-2" align="end">
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Remind me before</p>
                    {[5, 15, 30, 60].map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
                          onSetAlert(event.id, m as 5 | 15 | 30 | 60);
                        }}
                        className="flex w-full items-center rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      >{m} minutes before</button>
                    ))}
                  </PopoverContent>
                </Popover>
                <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Row label="Actual" value={event.actual} />
              <Row label="Forecast" value={event.forecast} />
              <Row label="Previous" value={event.previous} />
              <Row label="Volatility" value={event.volatility_score?.toFixed(1)} />
            </div>

            {event.description && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <h4 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</h4>
                <p className="text-sm leading-relaxed text-foreground">{event.description}</p>
              </div>
            )}

            {event.affected_symbols && event.affected_symbols.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Affected Symbols</h4>
                <div className="flex flex-wrap gap-1.5">
                  {event.affected_symbols.map((s) => (
                    <span key={s} className="rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-foreground">{s}</span>
                  ))}
                </div>
              </div>
            )}

            <AiInsightCard event={event} />

            <SymbolChart currency={event.currency} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
