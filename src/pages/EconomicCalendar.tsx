import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCalendarPreferences } from "@/lib/economic-calendar/usePreferences";
import { DEFAULT_FILTERS, normalizeFilters } from "@/lib/economic-calendar/range";
import { CalendarClock, LayoutGrid, List, ActivitySquare, RefreshCw, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { FiltersBar, MAJOR_CURRENCIES } from "@/components/economic/FiltersBar";
import { StatsRow } from "@/components/economic/StatsRow";
import { EventsListView } from "@/components/economic/EventsListView";
import { EventsCalendarView } from "@/components/economic/EventsCalendarView";
import { EventsTimelineView } from "@/components/economic/EventsTimelineView";
import { EventDetailsDrawer } from "@/components/economic/EventDetailsDrawer";
import { useEvents } from "@/lib/economic-calendar/useEvents";
import { useBookmarks } from "@/lib/economic-calendar/useBookmarks";
import { useAlerts } from "@/lib/economic-calendar/useAlerts";
import type { CalendarViewMode, EconomicEvent, EventFilters } from "@/lib/economic-calendar/types";

// Current (temporary) filters live in sessionStorage so refresh / in-app navigation keep them.
// The saved default + preferred view live server-side (economic_calendar_preferences).
const SESSION_KEY = "econ-calendar-current";
const VIEW_KEY = "econ-calendar-view";

function loadSession(): EventFilters | null {
  try { const raw = sessionStorage.getItem(SESSION_KEY); return raw ? normalizeFilters(JSON.parse(raw)) : null; } catch { return null; }
}
function loadLocalView(): CalendarViewMode {
  const v = localStorage.getItem(VIEW_KEY);
  return v === "calendar" || v === "timeline" ? v : "list";
}

const VIEW_TABS: { id: CalendarViewMode; label: string; icon: typeof List }[] = [
  { id: "list", label: "List", icon: List },
  { id: "calendar", label: "Calendar", icon: LayoutGrid },
  { id: "timeline", label: "Timeline", icon: ActivitySquare },
];

export default function EconomicCalendar() {
  const prefs = useCalendarPreferences();
  const fromSession = useRef(loadSession());
  const [filters, setFilters] = useState<EventFilters>(() => fromSession.current ?? { ...DEFAULT_FILTERS });
  const [view, setViewState] = useState<CalendarViewMode>(loadLocalView);
  const [known, setKnown] = useState<{ currencies: string[]; countries: string[] }>({ currencies: [], countries: [] });

  // Apply the saved default once (only when this tab has no temporary filters yet) and the saved view.
  const applied = useRef(false);
  useEffect(() => {
    if (!prefs.loaded || applied.current) return;
    applied.current = true;
    if (!fromSession.current && prefs.defaults) setFilters({ ...prefs.defaults, search: "" });
    if (prefs.view) { setViewState(prefs.view); try { localStorage.setItem(VIEW_KEY, prefs.view); } catch { /* */ } }
  }, [prefs.loaded, prefs.defaults, prefs.view]);

  useEffect(() => { try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(filters)); } catch { /* */ } }, [filters]);

  // Every currency / country the data source has provided, not just this range's.
  useEffect(() => {
    supabase.from("economic_events").select("currency,country").limit(5000).then(({ data }) => {
      const rows = data ?? [];
      setKnown({ currencies: [...new Set(rows.map((r) => r.currency))], countries: [...new Set(rows.map((r) => r.country))] });
    });
  }, []);
  const [selected, setSelected] = useState<EconomicEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const { events, allEvents, from, loading, syncing, refetch } = useEvents(filters);
  const { ids: bookmarkIds, toggle: toggleBookmark } = useBookmarks();
  const { setAlert } = useAlerts(events);

  const countries = useMemo(
    () => Array.from(new Set([...known.countries, ...allEvents.map((e) => e.country)])).filter(Boolean).sort(),
    [allEvents, known.countries],
  );
  const currencies = useMemo(() => {
    const extra = Array.from(new Set([...known.currencies, ...allEvents.map((e) => e.currency)])).filter((c) => c && !MAJOR_CURRENCIES.includes(c)).sort();
    return [...MAJOR_CURRENCIES, ...extra];
  }, [allEvents, known.currencies]);

  const patch = (p: Partial<EventFilters>) => {
    setFilters((f) => ({ ...f, ...p }));
  };

  const setView = (v: CalendarViewMode) => {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* storage unavailable */ }
    prefs.saveView(v);
  };

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
          presets={prefs.presets}
          onSaveDefault={prefs.saveDefault}
          onCreatePreset={prefs.createPreset}
          onUpdatePreset={prefs.updatePreset}
          onDeletePreset={prefs.deletePreset}
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

        {loading && allEvents.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title={allEvents.length === 0 ? "No events found for this range" : "No events match your filters"}
            description={allEvents.length === 0
              ? "We couldn't load economic events for the selected dates. Try refreshing or picking another week."
              : "Try clearing filters or widening the date range to see more events."}
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
            monthAnchor={from}
            onSelectDay={(d) => { setSelectedDay(d); setViewState("timeline"); }}
            selectedDay={selectedDay}
          />
        ) : (
          <EventsTimelineView
            events={events}
            day={selectedDay ?? from}
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
