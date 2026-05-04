ALTER TABLE public.playbooks
  ADD COLUMN IF NOT EXISTS entry_rules text,
  ADD COLUMN IF NOT EXISTS exit_rules text,
  ADD COLUMN IF NOT EXISTS risk_rules text,
  ADD COLUMN IF NOT EXISTS best_market_conditions text,
  ADD COLUMN IF NOT EXISTS checklist text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS rules_array text[] NOT NULL DEFAULT '{}';