CREATE OR REPLACE FUNCTION public.get_user_plan_info()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  b record;
  p record;
  v_plan text;
  v_status text;
  v_trial timestamptz;
  v_renews timestamptz;
  v_customer text;
  v_sub text;
  v_active boolean;
  v_is_pro boolean;
  v_is_elite boolean;
  v_is_trial boolean;
  v_admin_override boolean := false;
  v_source text;
BEGIN
  SELECT * INTO b
    FROM public.billing_subscriptions
    WHERE user_id = auth.uid()
      AND lower(status) IN ('active','trialing','on_trial','past_due','on_hold')
    ORDER BY updated_at DESC
    LIMIT 1;

  SELECT plan_type, subscription_plan, subscription_status, trial_ends_at,
         current_period_end, upgraded_manually
    INTO p FROM public.profiles WHERE id = auth.uid();

  v_admin_override := COALESCE(p.upgraded_manually, false)
                      AND p.plan_type IS NOT NULL
                      AND p.plan_type <> 'free';

  IF v_admin_override THEN
    v_source := 'admin_override';
    v_plan   := p.plan_type;
    v_trial  := p.trial_ends_at;
    v_renews := p.current_period_end;
    -- Manual upgrades are always entitled unless an explicit trial has lapsed.
    IF p.subscription_status = 'trialing' AND v_trial IS NOT NULL THEN
      v_status := CASE WHEN v_trial > now() THEN 'trialing' ELSE 'inactive' END;
    ELSE
      v_status := 'active';
    END IF;
  ELSIF b IS NOT NULL THEN
    v_source := COALESCE(b.provider, 'billing');
    v_plan := b.plan;
    v_status := CASE
      WHEN lower(b.status) IN ('on_trial','trialing') THEN 'trialing'
      WHEN lower(b.status) IN ('past_due','on_hold') THEN 'past_due'
      ELSE 'active'
    END;
    v_trial := b.trial_ends_at;
    v_renews := b.renews_at;
    v_customer := b.customer_id;
    v_sub := b.subscription_id;
  ELSIF p IS NOT NULL THEN
    v_source := 'profile';
    v_plan := COALESCE(p.plan_type, 'free');
    v_status := COALESCE(p.subscription_status, 'inactive');
    v_trial := p.trial_ends_at;
    v_renews := p.current_period_end;
  ELSE
    v_source := 'none';
    v_plan := 'free'; v_status := 'inactive';
  END IF;

  v_is_trial := v_status = 'trialing' AND (v_trial IS NULL OR v_trial > now());
  v_active   := v_status IN ('active','past_due') OR v_is_trial;
  v_is_pro   := v_active AND v_plan = 'pro';
  v_is_elite := v_active AND v_plan = 'elite';

  RETURN jsonb_build_object(
    'plan', v_plan,
    'status', v_status,
    'source', v_source,
    'trial_ends_at', v_trial,
    'current_period_end', v_renews,
    'customer_id', v_customer,
    'subscription_id', v_sub,
    'admin_override', v_admin_override,
    'is_free', NOT v_active OR v_plan = 'free',
    'is_pro', v_is_pro,
    'is_elite', v_is_elite,
    'is_trial_active', v_is_trial
  );
END;
$function$;