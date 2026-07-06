import { useMemo, useState } from "react";
import { CalendarClock, LayoutGrid, List, ActivitySquare, RefreshCw, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { FiltersBar } from "@/components/economic/FiltersBar";
import { StatsRow } from "@/components/economic/StatsRow";
import { EventsListView } from "@/components/economic/EventsListView";
import { EventsCalendarView } from "@/components/economic/EventsCalendarView";
import { EventsTimelineView } from "@/components/economic/EventsTimelineView";
import { EventDetailsDrawer } from "@/components/economic/EventDetailsDrawer";
import { useEvents } from "@/lib/economic-calendar/useEvents";
import { useBookmarks } from "@/lib/economic-calendar/useBookmarks";
import { useAlerts } from "@/lib/economic-calendar/useAlerts";
import type { CalendarViewMode, EconomicEvent, EventFilters } from "@/lib/economic-calendar/types";

function defaultFilters(): EventFilters {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from.getTime() + 7 * 24 * 3600 * 1000);
  return {
    from, to,
    country: "all", currency: "all", impact: "all", category: "all", search: "",
  };
}

const VIEW_TABS: { id: CalendarViewMode; label: string; icon: typeof List }[] = [
  { id: "list", label: "List", icon: List },
  { id: "calendar", label: "Calendar", icon: LayoutGrid },
  { id: "timeline", label: "Timeline", icon: ActivitySquare },
];

export default function EconomicCalendar() {
  const [filters, setFilters] = useState<EventFilters>(defaultFilters);
  const [view, setView] = useState<CalendarViewMode>("list");
  const [selected, setSelected] = useState<EconomicEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { events, allEvents, loading, syncing, refetch } = useEvents(filters);
  const { ids: bookmarkIds, toggle: toggleBookmark } = useBookmarks();
  const { setAlert } = useAlerts(events);

  const countries = useMemo(
    () => Array.from(new Set(allEvents.map((e) => e.country))).sort(),
    [allEvents],
  );
  const currencies = useMemo(
    () => Array.from(new Set(allEvents.map((e) => e.currency))).sort(),
    [allEvents],
  );

  const patch = (p: Partial<EventFilters>) => setFilters((f) => ({ ...f, ...p }));

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Economic Calendar"
          description="Track high-impact economic events and market-moving news."
        />
        <div className="flex items-center gap-2">
          {syncing && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
              <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
            </span>
          )}
          <Button size="sm" variant="outline" onClick={() => refetch()} disabled={syncing || loading}>
            <RefreshCw className={cn("mr-1.5 h-3.5 w-3.5", (syncing || loading) && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>


      <div className="space-y-5">
        <StatsRow events={events} />

        <FiltersBar
          filters={filters}
          onChange={patch}
          countries={countries}
          currencies={currencies}
        />

        <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1 sm:w-fit">
          {VIEW_TABS.map((t) => {
            const Icon = t.icon;
            const active = view === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label} View
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Markets are quiet today"
            description="No major economic releases scheduled for the selected range. Try widening filters or picking another week."
          />
        ) : view === "list" ? (
          <EventsListView
            events={events}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            bookmarkIds={bookmarkIds}
            onBookmark={toggleBookmark}
          />
        ) : view === "calendar" ? (
          <EventsCalendarView
            events={events}
            monthAnchor={filters.from}
            onSelectDay={(d) => { setSelectedDay(d); setView("timeline"); }}
            selectedDay={selectedDay}
          />
        ) : (
          <EventsTimelineView
            events={events}
            day={selectedDay ?? filters.from}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
          />
        )}
      </div>

      <EventDetailsDrawer
        event={selected}
        onClose={() => setSelected(null)}
        bookmarked={selected ? bookmarkIds.has(selected.id) : false}
        onBookmark={toggleBookmark}
        onSetAlert={setAlert}
      />
    </div>
  );
}
