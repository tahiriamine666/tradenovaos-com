// Reads economic_events from the DB, filtered client-side after a time-range fetch.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { EconomicEvent, EventFilters } from "./types";

export function useEvents(filters: EventFilters) {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fromISO = filters.from.toISOString();
  const toISO = filters.to.toISOString();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("economic_events" as never)
        .select("*")
        .gte("event_time", fromISO)
        .lte("event_time", toISO)
        .order("event_time", { ascending: true });
      if (!alive) return;
      if (error) setError(error.message);
      setEvents((data ?? []) as unknown as EconomicEvent[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [fromISO, toISO]);

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

  return { events: filtered, allEvents: events, loading, error };
}
