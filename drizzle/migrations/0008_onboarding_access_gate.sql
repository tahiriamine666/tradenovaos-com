ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_step integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS market_types text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS trading_experience text,
  ADD COLUMN IF NOT EXISTS main_trading_problem text,
  ADD COLUMN IF NOT EXISTS selected_plan text,
  ADD COLUMN IF NOT EXISTS selected_billing text;

CREATE TABLE IF NOT EXISTS public.internal_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.internal_access TO service_role;
ALTER TABLE public.internal_access ENABLE ROW LEVEL SECURITY;

INSERT INTO public.internal_access (user_id)
SELECT id FROM auth.users
WHERE lower(email) IN ('tahiriamine889@gmail.com','tahiria740@gmail.com','tradenova111@gmail.com')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.has_internal_access(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.internal_access WHERE user_id = _uid)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan_type, subscription_plan, subscription_status, trial_ends_at)
  VALUES (NEW.id, NEW.email, 'free', 'free', 'inactive', NULL)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.get_user_plan_info()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  b record; p record;
  v_plan text; v_status text; v_trial timestamptz; v_renews timestamptz;
  v_customer text; v_sub text; v_active boolean; v_is_trial boolean;
  v_admin_override boolean := false; v_source text;
BEGIN
  SELECT * INTO b FROM public.billing_subscriptions
    WHERE user_id = auth.uid()
      AND lower(status) IN ('active','trialing','on_trial','past_due','on_hold')
    ORDER BY updated_at DESC LIMIT 1;

  SELECT plan_type, subscription_status, trial_ends_at, current_period_end, upgraded_manually
    INTO p FROM public.profiles WHERE id = auth.uid();

  v_admin_override := COALESCE(p.upgraded_manually,false) AND p.plan_type IS NOT NULL AND p.plan_type <> 'free';

  IF public.has_internal_access(auth.uid()) THEN
    v_source := 'internal'; v_plan := 'elite'; v_status := 'active';
  ELSIF v_admin_override THEN
    v_source := 'admin_override'; v_plan := p.plan_type;
    v_trial := p.trial_ends_at; v_renews := p.current_period_end;
    IF p.subscription_status = 'trialing' AND v_trial IS NOT NULL THEN
      v_status := CASE WHEN v_trial > now() THEN 'trialing' ELSE 'inactive' END;
    ELSE v_status := 'active'; END IF;
  ELSIF b IS NOT NULL THEN
    v_source := COALESCE(b.provider,'billing'); v_plan := b.plan;
    v_status := CASE
      WHEN lower(b.status) IN ('on_trial','trialing') THEN 'trialing'
      WHEN lower(b.status) IN ('past_due','on_hold') THEN 'past_due'
      ELSE 'active' END;
    v_trial := b.trial_ends_at; v_renews := b.renews_at;
    v_customer := b.customer_id; v_sub := b.subscription_id;
  ELSE
    v_source := 'none'; v_plan := 'free'; v_status := 'inactive';
  END IF;

  v_is_trial := v_status = 'trialing' AND (v_trial IS NULL OR v_trial > now());
  v_active := v_status = 'active' OR v_is_trial;

  RETURN jsonb_build_object(
    'plan', v_plan, 'status', v_status, 'source', v_source,
    'trial_ends_at', v_trial, 'current_period_end', v_renews,
    'customer_id', v_customer, 'subscription_id', v_sub,
    'admin_override', v_admin_override,
    'is_free', NOT v_active OR v_plan = 'free',
    'is_pro', v_active AND v_plan = 'pro',
    'is_elite', v_active AND v_plan = 'elite',
    'is_trial_active', v_is_trial,
    'billing_action_required', v_status = 'past_due'
  );
END; $$;

CREATE OR REPLACE FUNCTION public.get_access_state()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); p record; info jsonb; v_internal boolean; v_has boolean;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('authenticated', false); END IF;
  v_internal := public.has_internal_access(uid);
  SELECT onboarding_step, onboarding_completed, selected_plan, selected_billing INTO p
    FROM public.profiles WHERE id = uid;
  info := public.get_user_plan_info();
  v_has := v_internal OR COALESCE((info->>'is_pro')::boolean,false) OR COALESCE((info->>'is_elite')::boolean,false);
  RETURN jsonb_build_object(
    'authenticated', true,
    'internal', v_internal,
    'onboarding_step', COALESCE(p.onboarding_step,0),
    'onboarding_completed', v_internal OR COALESCE(p.onboarding_completed,false),
    'selected_plan', p.selected_plan,
    'selected_billing', p.selected_billing,
    'has_access', v_has,
    'billing_status', info->>'status',
    'trial_ends_at', info->>'trial_ends_at'
  );
END; $$;

CREATE OR REPLACE FUNCTION public.save_onboarding(
  p_step integer, p_market_types text[], p_experience text, p_problem text,
  p_completed boolean, p_plan text, p_billing text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_plan IS NOT NULL AND p_plan NOT IN ('pro','elite') THEN RAISE EXCEPTION 'invalid plan'; END IF;
  IF p_billing IS NOT NULL AND p_billing NOT IN ('monthly','yearly') THEN RAISE EXCEPTION 'invalid billing'; END IF;
  UPDATE public.profiles SET
    onboarding_step = GREATEST(0, LEAST(COALESCE(p_step, onboarding_step), 10)),
    market_types = COALESCE(p_market_types, market_types),
    trading_experience = COALESCE(left(p_experience,100), trading_experience),
    main_trading_problem = COALESCE(left(p_problem,300), main_trading_problem),
    onboarding_completed = onboarding_completed OR COALESCE(p_completed,false),
    selected_plan = COALESCE(p_plan, selected_plan),
    selected_billing = COALESCE(p_billing, selected_billing)
  WHERE id = auth.uid();
END; $$;

REVOKE EXECUTE ON FUNCTION public.has_internal_access(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_access_state() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_access_state() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.save_onboarding(integer,text[],text,text,boolean,text,text) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_onboarding(integer,text[],text,text,boolean,text,text) TO authenticated;