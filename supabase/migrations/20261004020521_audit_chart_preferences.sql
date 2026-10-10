
CREATE TABLE public.user_chart_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_symbol text DEFAULT 'NAS100',
  preferred_theme text DEFAULT 'dark',
  chart_type text DEFAULT 'candles',
  bullish_color text DEFAULT '#22c55e',
  bearish_color text DEFAULT '#ef4444',
  wick_color text DEFAULT '#9ca3af',
  border_color text DEFAULT '#9ca3af',
  crosshair_color text DEFAULT '#a78bfa',
  background_color text DEFAULT '#0b0f17',
  grid_color text DEFAULT '#1f2937',
  drawing_color text DEFAULT '#a78bfa',
  default_speed numeric DEFAULT 1,
  show_execution_markers boolean DEFAULT true,
  show_trade_zones boolean DEFAULT true,
  show_economic_events boolean DEFAULT true,
  auto_center_chart boolean DEFAULT true,
  favorite_symbols jsonb DEFAULT '[]'::jsonb,
  recent_symbols jsonb DEFAULT '[]'::jsonb,
  saved_layouts jsonb DEFAULT '[]'::jsonb,
  active_layout_id text,
  drawing_prefs jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_chart_preferences TO authenticated;
GRANT ALL ON public.user_chart_preferences TO service_role;

ALTER TABLE public.user_chart_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chart prefs"
  ON public.user_chart_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_chart_prefs_updated_at
  BEFORE UPDATE ON public.user_chart_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
