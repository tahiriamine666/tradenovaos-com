// Reads economic_events from the DB, filtered client-side after a time-range fetch.
// Also triggers an FMP sync via edge function and auto-refreshes every 60s.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fmpProvider } from "./providers/fmp";
import type { EconomicEvent, EventFilters } from "./types";
import { resolveRange } from "./range";

export function useEvents(filters: EventFilters) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const { from, to } = useMemo(() => resolveRange(filters.range), [filters.range]);
  const fromISO = from.toISOString();
  const toISO = to.toISOString();

  const loadFromDb = useCallback(async () => {
    const { data, error } = await supabase
      .from("economic_events" as never)
      .select("*, event_time:starts_at, title:event_name, country:country_code, affected_symbols:affected_pairs, external_id:source_id, source_provider:source")
      .gte("starts_at", fromISO)
      .lte("starts_at", toISO)
      .order("starts_at", { ascending: true });
    if (error) setError(error.message);
    setEvents((data ?? []) as unknown as EconomicEvent[]);
  }, [fromISO, toISO]);

  const sync = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      await fmpProvider.fetchEvents({ from: new Date(fromISO), to: new Date(toISO) });
    } catch (e) {
      // Non-fatal: fall through to DB read
      console.warn("Economic calendar sync failed", e);
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [fromISO, toISO]);

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
      if (filters.countries.length && !filters.countries.includes(e.country)) return false;
      if (filters.currencies.length && !filters.currencies.includes(e.currency)) return false;
      if (filters.impacts.length && !filters.impacts.includes(e.impact)) return false;
      if (filters.categories.length && !filters.categories.includes(e.category ?? "Other")) return false;
      if (q && !(e.title.toLowerCase().includes(q) || e.currency.toLowerCase().includes(q) || e.country.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [events, filters]);

  return { events: filtered, allEvents: events, from, to, loading, syncing, error, refetch };
}
