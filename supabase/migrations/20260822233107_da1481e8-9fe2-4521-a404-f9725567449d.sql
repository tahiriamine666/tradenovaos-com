ALTER TABLE public.trading_accounts
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'broker',
  ADD COLUMN IF NOT EXISTS firm text,
  ADD COLUMN IF NOT EXISTS metaapi_account_id text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS balance numeric,
  ADD COLUMN IF NOT EXISTS equity numeric,
  ADD COLUMN IF NOT EXISTS margin numeric,
  ADD COLUMN IF NOT EXISTS free_margin numeric,
  ADD COLUMN IF NOT EXISTS initial_balance numeric,
  ADD COLUMN IF NOT EXISTS metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS challenge jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sync_error text,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS trades_account_external_id_key
  ON public.trades (trading_account_id, external_id)
  WHERE external_id IS NOT NULL;