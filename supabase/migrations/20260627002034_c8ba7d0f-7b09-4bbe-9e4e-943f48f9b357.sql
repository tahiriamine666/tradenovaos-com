-- Enforce 50 trades/month for free users; pro/elite/trial unlimited.
CREATE OR REPLACE FUNCTION public.enforce_free_trade_monthly_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  info jsonb;
  v_count int;
BEGIN
  -- Service role / no auth context: allow (admin imports, edge functions)
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;

  info := public.get_user_plan_info();
  IF info IS NOT NULL AND (
       COALESCE((info->>'is_pro')::boolean, false)
       OR COALESCE((info->>'is_elite')::boolean, false)
     ) THEN
    RETURN NEW; -- pro/elite/active trial → unlimited
  END IF;

  SELECT count(*) INTO v_count
    FROM public.trades
    WHERE user_id = auth.uid()
      AND created_at >= date_trunc('month', now());

  IF v_count >= 50 THEN
    RAISE EXCEPTION 'Free plan limit reached: 50 trades per month. Upgrade to Pro for unlimited trades.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_free_trade_monthly_limit ON public.trades;
CREATE TRIGGER trg_enforce_free_trade_monthly_limit
BEFORE INSERT ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.enforce_free_trade_monthly_limit();
