CREATE TABLE public.ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  insight_type TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  trades_analyzed INTEGER NOT NULL DEFAULT 0,
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ai select" ON public.ai_insights FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own ai insert" ON public.ai_insights FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ai update" ON public.ai_insights FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own ai delete" ON public.ai_insights FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER set_ai_insights_updated_at
BEFORE UPDATE ON public.ai_insights
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_ai_insights_user_created ON public.ai_insights (user_id, created_at DESC);