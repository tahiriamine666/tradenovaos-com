CREATE OR REPLACE FUNCTION public.enforce_trading_account_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE info jsonb; v_count int;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_admin(auth.uid()) OR public.has_internal_access(auth.uid()) THEN RETURN NEW; END IF;
  info := public.get_user_plan_info();
  IF info IS NOT NULL AND COALESCE((info->>'is_elite')::boolean,false) THEN RETURN NEW; END IF;
  SELECT count(*) INTO v_count FROM public.trading_accounts WHERE user_id = auth.uid();
  IF v_count >= 1 THEN
    RAISE EXCEPTION 'Your Pro plan includes 1 connected trading account. Upgrade to Elite to connect additional accounts.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END; $$;

CREATE TABLE IF NOT EXISTS public.nova_usage (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  credits_used integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_start)
);
GRANT SELECT ON public.nova_usage TO authenticated;
GRANT ALL ON public.nova_usage TO service_role;
ALTER TABLE public.nova_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nova usage read" ON public.nova_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Billing-cycle period: monthly from the subscription start date (calendar month otherwise).
CREATE OR REPLACE FUNCTION public.nova_period_start(_uid uuid)
RETURNS date LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE anchor date; n int;
BEGIN
  SELECT created_at::date INTO anchor FROM public.billing_subscriptions WHERE user_id = _uid;
  IF anchor IS NULL OR anchor > current_date THEN RETURN date_trunc('month', current_date)::date; END IF;
  n := (extract(year FROM age(current_date, anchor)) * 12 + extract(month FROM age(current_date, anchor)))::int;
  RETURN (anchor + make_interval(months => n))::date;
END; $$;

CREATE OR REPLACE FUNCTION public.get_nova_usage()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); info jsonb; v_limit int; v_used int; v_ps date; v_plan text;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  info := public.get_user_plan_info();
  v_plan := CASE WHEN COALESCE((info->>'is_elite')::boolean,false) THEN 'elite'
                 WHEN COALESCE((info->>'is_pro')::boolean,false) THEN 'pro' ELSE 'none' END;
  v_limit := CASE v_plan WHEN 'elite' THEN 1000 WHEN 'pro' THEN 500 ELSE 0 END;
  v_ps := public.nova_period_start(uid);
  SELECT credits_used INTO v_used FROM public.nova_usage WHERE user_id = uid AND period_start = v_ps;
  RETURN jsonb_build_object('plan', v_plan, 'limit', v_limit, 'used', COALESCE(v_used,0),
    'period_start', v_ps, 'resets_at', (v_ps + interval '1 month')::date);
END; $$;

CREATE OR REPLACE FUNCTION public.consume_nova_credit()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); u jsonb; v_used int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  u := public.get_nova_usage();
  IF (u->>'used')::int >= (u->>'limit')::int THEN
    RETURN u || jsonb_build_object('allowed', false);
  END IF;
  INSERT INTO public.nova_usage (user_id, period_start, credits_used)
  VALUES (uid, (u->>'period_start')::date, 1)
  ON CONFLICT (user_id, period_start) DO UPDATE SET credits_used = nova_usage.credits_used + 1, updated_at = now()
  RETURNING credits_used INTO v_used;
  RETURN u || jsonb_build_object('allowed', true, 'used', v_used);
END; $$;

REVOKE EXECUTE ON FUNCTION public.get_nova_usage() FROM anon;
REVOKE EXECUTE ON FUNCTION public.consume_nova_credit() FROM anon;
REVOKE EXECUTE ON FUNCTION public.nova_period_start(uuid) FROM anon;