
CREATE TABLE public.trading_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  login text NOT NULL,
  password text NOT NULL,
  server text NOT NULL,
  platform text NOT NULL DEFAULT 'MT5',
  status text NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected','connecting','failed','disconnected')),
  is_default boolean NOT NULL DEFAULT false,
  last_connected_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX trading_accounts_one_default_per_user
  ON public.trading_accounts (user_id) WHERE is_default;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_accounts TO authenticated;
GRANT ALL ON public.trading_accounts TO service_role;

ALTER TABLE public.trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own trading accounts"
  ON public.trading_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own trading accounts"
  ON public.trading_accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own trading accounts"
  ON public.trading_accounts FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own trading accounts"
  ON public.trading_accounts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trading_accounts_set_updated_at
  BEFORE UPDATE ON public.trading_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Enforce plan-based account limits
CREATE OR REPLACE FUNCTION public.enforce_trading_account_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  info jsonb;
  v_count int;
  v_limit int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;

  info := public.get_user_plan_info();
  IF info IS NOT NULL AND COALESCE((info->>'is_elite')::boolean, false) THEN
    RETURN NEW; -- unlimited
  ELSIF info IS NOT NULL AND COALESCE((info->>'is_pro')::boolean, false) THEN
    v_limit := 3;
  ELSE
    v_limit := 1;
  END IF;

  SELECT count(*) INTO v_count FROM public.trading_accounts WHERE user_id = auth.uid();
  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'Trading account limit reached for your plan (% max). Upgrade to add more.', v_limit
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trading_accounts_enforce_limit
  BEFORE INSERT ON public.trading_accounts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_trading_account_limit();

-- Ensure setting is_default=true unsets any other default for the same user
CREATE OR REPLACE FUNCTION public.trading_accounts_single_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.trading_accounts
      SET is_default = false
      WHERE user_id = NEW.user_id AND id <> NEW.id AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trading_accounts_single_default_ins
  AFTER INSERT ON public.trading_accounts
  FOR EACH ROW WHEN (NEW.is_default) EXECUTE FUNCTION public.trading_accounts_single_default();

CREATE TRIGGER trading_accounts_single_default_upd
  AFTER UPDATE OF is_default ON public.trading_accounts
  FOR EACH ROW WHEN (NEW.is_default) EXECUTE FUNCTION public.trading_accounts_single_default();
