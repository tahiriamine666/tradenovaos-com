import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ChartType = "candles" | "bars" | "line" | "area";
export type ChartTheme = "dark" | "light" | "custom";

export interface SavedLayout {
  id: string;
  name: string;
  symbol: string;
  interval: string;
  chart_type: ChartType;
  bullish_color: string;
  bearish_color: string;
  background_color: string;
  grid_color: string;
  created_at: string;
}

export interface ChartPreferences {
  preferred_symbol: string;
  preferred_theme: ChartTheme;
  chart_type: ChartType;
  bullish_color: string;
  bearish_color: string;
  wick_color: string;
  border_color: string;
  crosshair_color: string;
  background_color: string;
  grid_color: string;
  drawing_color: string;
  default_speed: number;
  show_execution_markers: boolean;
  show_trade_zones: boolean;
  show_economic_events: boolean;
  auto_center_chart: boolean;
  favorite_symbols: string[];
  recent_symbols: string[];
  saved_layouts: SavedLayout[];
  active_layout_id: string | null;
  drawing_prefs: {
    trendlines?: boolean;
    horizontal_lines?: boolean;
    fvg_boxes?: boolean;
    order_blocks?: boolean;
    text_notes?: boolean;
    line_color?: string;
    line_thickness?: number;
  };
}

export const DEFAULT_PREFS: ChartPreferences = {
  preferred_symbol: "NAS100",
  preferred_theme: "dark",
  chart_type: "candles",
  bullish_color: "#22c55e",
  bearish_color: "#ef4444",
  wick_color: "#9ca3af",
  border_color: "#9ca3af",
  crosshair_color: "#a78bfa",
  background_color: "#0b0f17",
  grid_color: "#1f2937",
  drawing_color: "#a78bfa",
  default_speed: 1,
  show_execution_markers: true,
  show_trade_zones: true,
  show_economic_events: true,
  auto_center_chart: true,
  favorite_symbols: ["EURUSD", "XAUUSD", "NAS100"],
  recent_symbols: [],
  saved_layouts: [],
  active_layout_id: null,
  drawing_prefs: {
    trendlines: true,
    horizontal_lines: true,
    fvg_boxes: true,
    order_blocks: true,
    text_notes: true,
    line_color: "#a78bfa",
    line_thickness: 2,
  },
};

export function useChartPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = React.useState<ChartPreferences>(DEFAULT_PREFS);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_chart_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setPrefs({
          ...DEFAULT_PREFS,
          ...data,
          favorite_symbols: (data.favorite_symbols as string[]) ?? DEFAULT_PREFS.favorite_symbols,
          recent_symbols: (data.recent_symbols as string[]) ?? [],
          saved_layouts: (data.saved_layouts as SavedLayout[]) ?? [],
          drawing_prefs: (data.drawing_prefs as any) ?? DEFAULT_PREFS.drawing_prefs,
        } as ChartPreferences);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const save = React.useCallback(
    async (patch: Partial<ChartPreferences>) => {
      if (!user) return;
      const next = { ...prefs, ...patch };
      setPrefs(next);
      await supabase.from("user_chart_preferences").upsert(
        {
          user_id: user.id,
          ...next,
          favorite_symbols: next.favorite_symbols as any,
          recent_symbols: next.recent_symbols as any,
          saved_layouts: next.saved_layouts as any,
          drawing_prefs: next.drawing_prefs as any,
        },
        { onConflict: "user_id" },
      );
    },
    [user, prefs],
  );

  const addRecentSymbol = React.useCallback(
    (symbol: string) => {
      const upper = symbol.toUpperCase();
      const next = [upper, ...prefs.recent_symbols.filter((s) => s !== upper)].slice(0, 8);
      save({ recent_symbols: next });
    },
    [prefs.recent_symbols, save],
  );

  return { prefs, setPrefs, save, loading, addRecentSymbol };
}
