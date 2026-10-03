// Server-side Economic Calendar preferences (default filters + view) and named presets, scoped to auth.uid() via RLS.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeFilters } from "./range";
import type { CalendarViewMode, EventFilters } from "./types";

export interface FilterPreset { id: string; name: string; filters: EventFilters }

export function useCalendarPreferences() {
  const { user } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [defaults, setDefaults] = useState<EventFilters | null>(null);
  const [view, setView] = useState<CalendarViewMode | null>(null);
  const [presets, setPresets] = useState<FilterPreset[]>([]);

  const loadPresets = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("economic_calendar_presets").select("id,name,filters").eq("user_id", user.id).order("created_at");
    setPresets((data ?? []).map((p: any) => ({ id: p.id, name: p.name, filters: normalizeFilters(p.filters) })));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      const { data } = await supabase.from("economic_calendar_preferences").select("default_filters,preferred_view").eq("user_id", user.id).maybeSingle();
      if (!alive) return;
      if (data) {
        const df = data.default_filters as any;
        setDefaults(df && Object.keys(df).length ? normalizeFilters(df) : null);
        const v = data.preferred_view;
        setView(v === "calendar" || v === "timeline" ? v : "list");
      }
      await loadPresets();
      if (alive) setLoaded(true);
    })();
    return () => { alive = false; };
  }, [user, loadPresets]);

  const saveDefault = async (f: EventFilters) => {
    if (!user) return { error: "Not signed in" };
    const { search: _s, ...rest } = f;
    const { error } = await supabase.from("economic_calendar_preferences").upsert({ user_id: user.id, default_filters: rest as any }, { onConflict: "user_id" });
    if (!error) setDefaults({ ...f, search: "" });
    return { error: error?.message };
  };

  const saveView = async (v: CalendarViewMode) => {
    setView(v);
    if (!user) return;
    await supabase.from("economic_calendar_preferences").upsert({ user_id: user.id, preferred_view: v }, { onConflict: "user_id" });
  };

  const createPreset = async (name: string, f: EventFilters) => {
    if (!user) return { error: "Not signed in" };
    const { search: _s, ...rest } = f;
    const { error } = await supabase.from("economic_calendar_presets").insert({ user_id: user.id, name, filters: rest as any });
    if (!error) await loadPresets();
    return { error: error?.message };
  };
  const updatePreset = async (id: string, patch: { name?: string; filters?: EventFilters }) => {
    const body: any = {};
    if (patch.name) body.name = patch.name;
    if (patch.filters) { const { search: _s, ...rest } = patch.filters; body.filters = rest; }
    const { error } = await supabase.from("economic_calendar_presets").update(body).eq("id", id);
    if (!error) await loadPresets();
    return { error: error?.message };
  };
  const deletePreset = async (id: string) => {
    const { error } = await supabase.from("economic_calendar_presets").delete().eq("id", id);
    if (!error) setPresets((p) => p.filter((x) => x.id !== id));
    return { error: error?.message };
  };

  return { loaded, defaults, view, presets, saveDefault, saveView, createPreset, updatePreset, deletePreset };
}
