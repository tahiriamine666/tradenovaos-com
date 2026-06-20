
-- 1. replay_notes
CREATE TABLE public.replay_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.replay_sessions(id) ON DELETE CASCADE,
  what_i_saw text,
  why_entered text,
  why_exited text,
  mistakes text,
  lessons text,
  last_saved_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.replay_notes TO authenticated;
GRANT ALL ON public.replay_notes TO service_role;
ALTER TABLE public.replay_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own replay_notes" ON public.replay_notes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_replay_notes_updated BEFORE UPDATE ON public.replay_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. replay_executions
CREATE TABLE public.replay_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.replay_sessions(id) ON DELETE CASCADE,
  time timestamptz NOT NULL DEFAULT now(),
  action text NOT NULL,
  price numeric,
  size numeric,
  type text,
  pnl numeric,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_replay_executions_session ON public.replay_executions(session_id, order_index);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.replay_executions TO authenticated;
GRANT ALL ON public.replay_executions TO service_role;
ALTER TABLE public.replay_executions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own replay_executions" ON public.replay_executions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_replay_executions_updated BEFORE UPDATE ON public.replay_executions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. replay_markers
CREATE TABLE public.replay_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.replay_sessions(id) ON DELETE CASCADE,
  kind text NOT NULL,
  price numeric,
  time timestamptz,
  label text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_replay_markers_session ON public.replay_markers(session_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.replay_markers TO authenticated;
GRANT ALL ON public.replay_markers TO service_role;
ALTER TABLE public.replay_markers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own replay_markers" ON public.replay_markers FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_replay_markers_updated BEFORE UPDATE ON public.replay_markers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. replay_scores
CREATE TABLE public.replay_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.replay_sessions(id) ON DELETE CASCADE,
  execution integer,
  risk integer,
  psychology integer,
  plan_adherence integer,
  final_score integer,
  tier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.replay_scores TO authenticated;
GRANT ALL ON public.replay_scores TO service_role;
ALTER TABLE public.replay_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own replay_scores" ON public.replay_scores FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_replay_scores_updated BEFORE UPDATE ON public.replay_scores FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. replay_ai_reviews
CREATE TABLE public.replay_ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL REFERENCES public.replay_sessions(id) ON DELETE CASCADE,
  market_context text,
  entry_quality text,
  risk_management text,
  execution_quality text,
  emotional_discipline text,
  missed_opportunities text,
  improvements text,
  model text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.replay_ai_reviews TO authenticated;
GRANT ALL ON public.replay_ai_reviews TO service_role;
ALTER TABLE public.replay_ai_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own replay_ai_reviews" ON public.replay_ai_reviews FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_replay_ai_reviews_updated BEFORE UPDATE ON public.replay_ai_reviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
