-- Read-only snapshot of the deployed functions, inspected 2026-10-10.
-- Test fixture ONLY; never applied as a production migration.
CREATE OR REPLACE FUNCTION public.admin_set_plan(p_user_id uuid, p_plan text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_old jsonb; v_email text; v_admin_email text; v_action text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_plan NOT IN ('pro','elite') THEN RAISE EXCEPTION 'Invalid plan'; END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN RAISE EXCEPTION 'Expiration must be in the future'; END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();
  v_old := public.plan_info_for(p_user_id);
  v_action := CASE WHEN COALESCE((v_old->>'admin_override')::boolean,false) THEN 'change_override' ELSE 'activate_override' END;
  UPDATE public.profiles SET plan_type = p_plan, subscription_plan = p_plan, subscription_status = 'active',
    trial_ends_at = NULL, upgraded_manually = true, upgraded_at = now(),
    manual_override_expires_at = p_expires_at, updated_at = now()
  WHERE id = p_user_id;
  INSERT INTO public.admin_audit_log (admin_id, admin_email, target_user_id, target_email, action, old_value, new_value, reason)
  VALUES (auth.uid(), v_admin_email, p_user_id, v_email, v_action,
    jsonb_build_object('plan', v_old->>'plan', 'status', v_old->>'status', 'source', v_old->>'source'),
    jsonb_build_object('plan', p_plan, 'status', 'active', 'source', 'admin_override', 'expires_at', p_expires_at),
    NULLIF(trim(p_reason),''));
  RETURN public.plan_info_for(p_user_id);
END; $function$;

CREATE OR REPLACE FUNCTION public.plan_info_for(_uid uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  b record; p record;
  v_plan text; v_status text; v_trial timestamptz; v_renews timestamptz;
  v_customer text; v_sub text; v_active boolean; v_is_trial boolean;
  v_admin_override boolean := false; v_source text;
BEGIN
  SELECT * INTO b FROM public.billing_subscriptions
    WHERE user_id = _uid AND lower(status) IN ('active','trialing','on_trial','past_due','on_hold')
    ORDER BY updated_at DESC LIMIT 1;
  SELECT plan_type, subscription_status, trial_ends_at, current_period_end, upgraded_manually, manual_override_expires_at
    INTO p FROM public.profiles WHERE id = _uid;
  v_admin_override := COALESCE(p.upgraded_manually,false) AND p.plan_type IS NOT NULL AND p.plan_type <> 'free'
    AND (p.manual_override_expires_at IS NULL OR p.manual_override_expires_at > now());
  IF public.has_internal_access(_uid) THEN
    v_source := 'internal'; v_plan := 'elite'; v_status := 'active';
  ELSIF v_admin_override THEN
    v_source := 'admin_override'; v_plan := p.plan_type;
    v_trial := p.trial_ends_at; v_renews := COALESCE(p.manual_override_expires_at, p.current_period_end);
    IF p.subscription_status = 'trialing' AND v_trial IS NOT NULL THEN
      v_status := CASE WHEN v_trial > now() THEN 'trialing' ELSE 'inactive' END;
    ELSE v_status := 'active'; END IF;
  ELSIF b IS NOT NULL THEN
    v_source := COALESCE(b.provider,'billing'); v_plan := b.plan;
    v_status := CASE WHEN lower(b.status) IN ('on_trial','trialing') THEN 'trialing'
      WHEN lower(b.status) IN ('past_due','on_hold') THEN 'past_due' ELSE 'active' END;
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
    'override_expires_at', p.manual_override_expires_at,
    'is_free', NOT v_active OR v_plan = 'free',
    'is_pro', v_active AND v_plan = 'pro',
    'is_elite', v_active AND v_plan = 'elite',
    'is_trial_active', v_is_trial,
    'billing_action_required', v_status = 'past_due');
END; $function$;


