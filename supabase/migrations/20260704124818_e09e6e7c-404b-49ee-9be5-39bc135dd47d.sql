ALTER TABLE public.trades ADD COLUMN IF NOT EXISTS trading_account_id uuid REFERENCES public.trading_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_trades_trading_account_id ON public.trades(trading_account_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_account ON public.trades(user_id, trading_account_id);