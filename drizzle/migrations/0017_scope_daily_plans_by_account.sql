ALTER TABLE public.trade_plans ADD COLUMN IF NOT EXISTS account_id uuid;
ALTER TABLE public.trade_plans ADD COLUMN IF NOT EXISTS account_key text NOT NULL DEFAULT 'all';
ALTER TABLE public.trade_plans DROP CONSTRAINT IF EXISTS trade_plans_user_date_pair_key;
ALTER TABLE public.trade_plans ADD CONSTRAINT trade_plans_user_account_date_pair_key UNIQUE (user_id, account_key, plan_date, pair);
COMMENT ON COLUMN public.trade_plans.account_key IS 'Canonical account scope: all preserves historical unassigned plans; otherwise the owning trading account UUID. Never copy legacy plans into every account.';
CREATE OR REPLACE FUNCTION public.validate_plan_account_scope() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.account_key = 'all' THEN
    IF NEW.account_id IS NOT NULL THEN RAISE EXCEPTION 'Unassigned plan cannot have an account ID'; END IF;
  ELSE
    IF NEW.account_id IS NULL OR NEW.account_key <> NEW.account_id::text THEN RAISE EXCEPTION 'Plan account scope mismatch'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.trading_accounts WHERE id = NEW.account_id AND user_id = NEW.user_id) THEN RAISE EXCEPTION 'Plan account must belong to its owner'; END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER validate_plan_account_scope BEFORE INSERT OR UPDATE ON public.trade_plans FOR EACH ROW EXECUTE FUNCTION public.validate_plan_account_scope();