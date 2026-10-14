ALTER TABLE public.trading_reviews
  ADD COLUMN IF NOT EXISTS answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS action_plan jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS completion_pct integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preset text;
ALTER TABLE public.trading_reviews ADD CONSTRAINT trading_reviews_status_check CHECK (status IN ('draft','complete'));
ALTER TABLE public.trading_reviews ADD CONSTRAINT trading_reviews_completion_check CHECK (completion_pct BETWEEN 0 AND 100);
ALTER TABLE public.trading_reviews ADD CONSTRAINT trading_reviews_range_check CHECK (period_end >= period_start);
ALTER TABLE public.trading_reviews ADD CONSTRAINT trading_reviews_identity_key UNIQUE (user_id, account_key, period_type, period_start, period_end);
ALTER TABLE public.trading_reviews DROP CONSTRAINT IF EXISTS trading_reviews_user_id_account_key_period_type_period_star_key;
CREATE INDEX IF NOT EXISTS trading_reviews_history_idx ON public.trading_reviews (user_id, account_key, period_type, period_start DESC);
COMMENT ON COLUMN public.trading_reviews.answers IS '14 reflection answers keyed by question id; legacy text columns are kept and shown read-only';

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS patience_score smallint CHECK (patience_score BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS plan_status text CHECK (plan_status IN ('yes','no','partial')),
  ADD COLUMN IF NOT EXISTS fomo boolean,
  ADD COLUMN IF NOT EXISTS revenge_trade boolean,
  ADD COLUMN IF NOT EXISTS hesitation boolean,
  ADD COLUMN IF NOT EXISTS overconfidence boolean,
  ADD COLUMN IF NOT EXISTS late_entry boolean,
  ADD COLUMN IF NOT EXISTS early_exit boolean,
  ADD COLUMN IF NOT EXISTS moved_stop boolean,
  ADD COLUMN IF NOT EXISTS planned_trade boolean,
  ADD COLUMN IF NOT EXISTS checklist_completed boolean,
  ADD COLUMN IF NOT EXISTS rule_violations text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS risk_amount numeric,
  ADD COLUMN IF NOT EXISTS risk_percent numeric,
  ADD COLUMN IF NOT EXISTS entry_reason text,
  ADD COLUMN IF NOT EXISTS exit_reason text;
COMMENT ON COLUMN public.trades.plan_status IS 'yes/no/partial; followed_plan boolean kept in sync (partial => NULL followed_plan unless already set)';
COMMENT ON COLUMN public.trades.patience_score IS '1-10 storage; UI shows 1-5 as value/2';