CREATE UNIQUE INDEX IF NOT EXISTS trades_account_external_uidx
  ON public.trades (trading_account_id, external_id);