CREATE TABLE public.economic_calendar_preferences (
  user_id uuid PRIMARY KEY,
  default_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferred_view text NOT NULL DEFAULT 'list',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.economic_calendar_preferences TO authenticated;
GRANT ALL ON public.economic_calendar_preferences TO service_role;
ALTER TABLE public.economic_calendar_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own econ prefs" ON public.economic_calendar_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER econ_prefs_updated BEFORE UPDATE ON public.economic_calendar_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.economic_calendar_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.economic_calendar_presets TO authenticated;
GRANT ALL ON public.economic_calendar_presets TO service_role;
ALTER TABLE public.economic_calendar_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own econ presets" ON public.economic_calendar_presets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX econ_presets_user_idx ON public.economic_calendar_presets(user_id, created_at);
CREATE TRIGGER econ_presets_updated BEFORE UPDATE ON public.economic_calendar_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();