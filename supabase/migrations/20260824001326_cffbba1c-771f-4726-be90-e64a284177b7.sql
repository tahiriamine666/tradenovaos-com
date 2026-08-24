ALTER TABLE public.trading_accounts DROP CONSTRAINT IF EXISTS trading_accounts_status_check;
ALTER TABLE public.trading_accounts DROP CONSTRAINT IF EXISTS trading_accounts_status_chk;
UPDATE public.trading_accounts SET status = 'connecting' WHERE status = 'syncing';
UPDATE public.trading_accounts SET status = 'error' WHERE status = 'failed';
ALTER TABLE public.trading_accounts
  ADD CONSTRAINT trading_accounts_status_check
  CHECK (status = ANY (ARRAY['pending','connecting','connected','disconnected','error']));
ALTER TABLE public.trading_accounts ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.trading_accounts DROP CONSTRAINT IF EXISTS trading_accounts_platform_chk;
ALTER TABLE public.trading_accounts
  ADD CONSTRAINT trading_accounts_platform_chk
  CHECK (platform = ANY (ARRAY['mt5','mt4','ctrader','dxtrade','tradelocker','alpha_trader']));