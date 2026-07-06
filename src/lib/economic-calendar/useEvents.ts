// Reads economic_events from the DB, filtered client-side after a time-range fetch.
// Also triggers an FMP sync via edge function and auto-refreshes every 60s.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmpProvider } from "./providers/fmp";
import type { EconomicEvent, EventFilters } from "./types";

export function useEvents(filters: EventFilters) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const fromISO = filters.from.toISOString();
  const toISO = filters.to.toISOString();

  const loadFromDb = useCallback(async () => {
    const { data, error } = await supabase
      .from("economic_events" as never)
      .select("*")
      .gte("event_time", fromISO)
      .lte("event_time", toISO)
      .order("event_time", { ascending: true });
    if (error) setError(error.message);
    setEvents((data ?? []) as unknown as EconomicEvent[]);
  }, [fromISO, toISO]);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      await fmpProvider.fetchEvents({ from: filters.from, to: filters.to });
    } catch (e) {
      // Non-fatal: fall through to DB read
      console.warn("Economic calendar sync failed", e);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [filters.from, filters.to]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await sync();
    await loadFromDb();
    setLoading(false);
  }, [sync, loadFromDb]);

  // Initial + range-change: sync then load
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      await loadFromDb(); // show cached rows immediately
      if (!alive) return;
      await sync();
      if (!alive) return;
      await loadFromDb();
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [fromISO, toISO, loadFromDb, sync]);

  // Auto-refresh every 60s while tab is visible
  useEffect(() => {
    const tick = async () => {
      if (document.hidden) return;
      await sync();
      await loadFromDb();
    };
    const h = setInterval(tick, 60_000);
    return () => clearInterval(h);
  }, [sync, loadFromDb]);

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return events.filter((e) => {
      if (filters.country !== "all" && e.country !== filters.country) return false;
      if (filters.currency !== "all" && e.currency !== filters.currency) return false;
      if (filters.impact !== "all" && e.impact !== filters.impact) return false;
      if (filters.category !== "all" && (e.category ?? "") !== filters.category) return false;
      if (q && !(e.title.toLowerCase().includes(q) || e.currency.toLowerCase().includes(q) || e.country.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [events, filters]);

  return { events: filtered, allEvents: events, loading, syncing, error, refetch };
}
