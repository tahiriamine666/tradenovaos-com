
CREATE TABLE public.economic_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_time timestamptz NOT NULL,
  country text NOT NULL,
  currency text NOT NULL,
  title text NOT NULL,
  category text,
  impact text NOT NULL CHECK (impact IN ('low','medium','high')),
  forecast text,
  previous text,
  actual text,
  unit text,
  source text,
  description text,
  volatility_score numeric,
  affected_symbols text[] DEFAULT '{}'::text[],
  external_id text,
  source_provider text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_provider, external_id)
);
CREATE INDEX economic_events_time_idx ON public.economic_events (event_time);
CREATE INDEX economic_events_currency_idx ON public.economic_events (currency);
CREATE INDEX economic_events_impact_idx ON public.economic_events (impact);
GRANT SELECT ON public.economic_events TO authenticated;
GRANT ALL ON public.economic_events TO service_role;
ALTER TABLE public.economic_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read economic events"
  ON public.economic_events FOR SELECT TO authenticated USING (true);
CREATE TRIGGER economic_events_updated_at
  BEFORE UPDATE ON public.economic_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.event_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.economic_events(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_bookmarks TO authenticated;
GRANT ALL ON public.event_bookmarks TO service_role;
ALTER TABLE public.event_bookmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own event bookmarks"
  ON public.event_bookmarks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.event_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.economic_events(id) ON DELETE CASCADE,
  remind_minutes_before int NOT NULL DEFAULT 30 CHECK (remind_minutes_before IN (15,30,60)),
  channel text NOT NULL DEFAULT 'inapp',
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, event_id, remind_minutes_before)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_alerts TO authenticated;
GRANT ALL ON public.event_alerts TO service_role;
ALTER TABLE public.event_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own event alerts"
  ON public.event_alerts FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER event_alerts_updated_at
  BEFORE UPDATE ON public.event_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
