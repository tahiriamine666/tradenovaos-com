
-- Add multi-platform columns to trading_accounts
ALTER TABLE public.trading_accounts
  ADD COLUMN IF NOT EXISTS account_number text,
  ADD COLUMN IF NOT EXISTS broker text,
  ADD COLUMN IF NOT EXISTS credentials jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Make legacy columns optional so non-MT5 platforms can use them selectively
ALTER TABLE public.trading_accounts
  ALTER COLUMN login DROP NOT NULL,
  ALTER COLUMN password DROP NOT NULL,
  ALTER COLUMN server DROP NOT NULL;

-- Backfill existing rows: normalize platform, copy login->account_number, wrap password into credentials
UPDATE public.trading_accounts
   SET platform = lower(platform)
 WHERE platform IS NOT NULL AND platform <> lower(platform);

UPDATE public.trading_accounts
   SET account_number = COALESCE(account_number, login)
 WHERE account_number IS NULL AND login IS NOT NULL;

UPDATE public.trading_accounts
   SET credentials = credentials || jsonb_build_object('password', password)
 WHERE password IS NOT NULL AND NOT (credentials ? 'password');

-- Normalize status values
UPDATE public.trading_accounts SET status = 'disconnected'
  WHERE status IS NULL OR status NOT IN ('connected','syncing','disconnected','error','connecting','failed');

-- Constrain platform + status going forward
ALTER TABLE public.trading_accounts DROP CONSTRAINT IF EXISTS trading_accounts_platform_chk;
ALTER TABLE public.trading_accounts
  ADD CONSTRAINT trading_accounts_platform_chk
  CHECK (platform IN ('mt5','ctrader','dxtrade','tradelocker','alpha_trader'));

ALTER TABLE public.trading_accounts DROP CONSTRAINT IF EXISTS trading_accounts_status_chk;
ALTER TABLE public.trading_accounts
  ADD CONSTRAINT trading_accounts_status_chk
  CHECK (status IN ('connected','syncing','disconnected','error'));
