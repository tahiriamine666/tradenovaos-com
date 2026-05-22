
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS mistakes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS screenshot_url text,
  ADD COLUMN IF NOT EXISTS emotion text,
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'main',
  ADD COLUMN IF NOT EXISTS ai_review jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_starred boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
