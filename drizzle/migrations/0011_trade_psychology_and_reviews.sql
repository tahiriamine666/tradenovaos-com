ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS emotion_before text,
  ADD COLUMN IF NOT EXISTS emotion_after text,
  ADD COLUMN IF NOT EXISTS confidence_score smallint CHECK (confidence_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS psych_discipline_score smallint CHECK (psych_discipline_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS stress_score smallint CHECK (stress_score BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS followed_plan boolean,
  ADD COLUMN IF NOT EXISTS impulsive_entry boolean,
  ADD COLUMN IF NOT EXISTS psychology_note text;
COMMENT ON COLUMN public.trades.psych_discipline_score IS 'Self-rated discipline 1-5 (Psychology section); legacy discipline_score keeps its own scale';

CREATE TABLE public.trading_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  account_id uuid REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  account_key text NOT NULL DEFAULT 'all',
  period_type text NOT NULL CHECK (period_type IN ('weekly','biweekly')),
  period_start date NOT NULL,
  period_end date NOT NULL,
  process_rating smallint CHECK (process_rating BETWEEN 1 AND 10),
  execution_rating smallint CHECK (execution_rating BETWEEN 1 AND 10),
  risk_rating smallint CHECK (risk_rating BETWEEN 1 AND 10),
  psychology_rating smallint CHECK (psychology_rating BETWEEN 1 AND 10),
  what_worked text, what_didnt_work text, biggest_mistake text, best_decision text,
  recurring_patterns text, rules_followed text, rules_broken text, what_to_fix text,
  what_to_modify text, next_period_focus text, keep_doing text, stop_doing text,
  start_doing text, overall_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_key, period_type, period_start)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_reviews TO authenticated;
GRANT ALL ON public.trading_reviews TO service_role;
ALTER TABLE public.trading_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own reviews select" ON public.trading_reviews FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own reviews insert" ON public.trading_reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own reviews update" ON public.trading_reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own reviews delete" ON public.trading_reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trading_reviews_updated_at BEFORE UPDATE ON public.trading_reviews FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();