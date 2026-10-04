-- Additive repair for the original TradeNova database. Existing data is retained.
ALTER TABLE public.trading_accounts
  ADD COLUMN IF NOT EXISTS account_name text,
  ADD COLUMN IF NOT EXISTS firm text,
  ADD COLUMN IF NOT EXISTS login text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'disconnected',
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS metaapi_account_id text,
  ADD COLUMN IF NOT EXISTS balance numeric,
  ADD COLUMN IF NOT EXISTS equity numeric,
  ADD COLUMN IF NOT EXISTS margin numeric,
  ADD COLUMN IF NOT EXISTS free_margin numeric,
  ADD COLUMN IF NOT EXISTS metrics jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS challenge jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sync_error text,
  ADD COLUMN IF NOT EXISTS last_connected_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;
UPDATE public.trading_accounts SET account_name=coalesce(nickname,broker||' '||account_number),login=account_number WHERE account_name IS NULL;
ALTER TABLE public.trading_accounts ALTER COLUMN account_name SET NOT NULL;

ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS trading_account_id uuid REFERENCES public.trading_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS weekly_context text,
  ADD COLUMN IF NOT EXISTS daily_bias text,
  ADD COLUMN IF NOT EXISTS timeframe text,
  ADD COLUMN IF NOT EXISTS before_screenshot_url text;
UPDATE public.trades t SET trading_account_id=t.account_id WHERE t.trading_account_id IS NULL AND EXISTS(SELECT 1 FROM public.trading_accounts a WHERE a.id=t.account_id AND a.user_id=t.user_id);
CREATE UNIQUE INDEX IF NOT EXISTS trades_account_external_unique ON public.trades(trading_account_id,external_id);

ALTER TABLE public.economic_events ADD COLUMN IF NOT EXISTS starts_at timestamptz;
UPDATE public.economic_events SET starts_at=(event_date + coalesce(event_time,time '00:00')) AT TIME ZONE coalesce(nullif(timezone,''),'UTC') WHERE starts_at IS NULL;
CREATE INDEX IF NOT EXISTS economic_events_starts_at_idx ON public.economic_events(starts_at);
CREATE UNIQUE INDEX IF NOT EXISTS economic_events_source_unique ON public.economic_events(source_id,source);

-- Prevent attaching a newly written trade to another user's account.
CREATE OR REPLACE FUNCTION public.check_trade_account_owner() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.trading_account_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.trading_accounts WHERE id=NEW.trading_account_id AND user_id=NEW.user_id) THEN
    RAISE EXCEPTION 'Trading account does not belong to this user' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER check_trade_account_owner BEFORE INSERT OR UPDATE OF trading_account_id,user_id ON public.trades FOR EACH ROW EXECUTE FUNCTION public.check_trade_account_owner();
