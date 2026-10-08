ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS manual_override_expires_at timestamptz;

CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_email text,
  target_user_id uuid,
  target_email text,
  action text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit_log TO authenticated;
GRANT ALL ON public.admin_audit_log TO service_role;
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit log" ON public.admin_audit_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX admin_audit_log_created_idx ON public.admin_audit_log (created_at DESC);

CREATE OR REPLACE FUNCTION public.prevent_profile_billing_self_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF NEW.plan_type IS DISTINCT FROM OLD.plan_type
     OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
     OR NEW.upgraded_manually IS DISTINCT FROM OLD.upgraded_manually
     OR NEW.upgraded_at IS DISTINCT FROM OLD.upgraded_at
     OR NEW.manual_override_expires_at IS DISTINCT FROM OLD.manual_override_expires_at
  THEN RAISE EXCEPTION 'Billing fields cannot be modified directly'; END IF;
  RETURN NEW;
END; $$;

-- Plan resolution for any user; internal only (not callable by clients).
CREATE OR REPLACE FUNCTION public.plan_info_for(_uid uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
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
END; $$;
REVOKE EXECUTE ON FUNCTION public.plan_info_for(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_user_plan_info()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT public.plan_info_for(auth.uid())
$$;

CREATE OR REPLACE FUNCTION public.admin_set_plan(p_user_id uuid, p_plan text, p_expires_at timestamptz DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
END; $$;

CREATE OR REPLACE FUNCTION public.admin_remove_override(p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_old jsonb; v_email text; v_admin_email text; v_bplan text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();
  v_old := public.plan_info_for(p_user_id);
  SELECT plan INTO v_bplan FROM public.billing_subscriptions
    WHERE user_id = p_user_id AND lower(status) IN ('active','trialing','on_trial','past_due','on_hold')
    ORDER BY updated_at DESC LIMIT 1;
  UPDATE public.profiles SET upgraded_manually = false, manual_override_expires_at = NULL,
    plan_type = COALESCE(v_bplan,'free'), subscription_plan = COALESCE(v_bplan,'free'),
    subscription_status = CASE WHEN v_bplan IS NULL THEN 'inactive' ELSE subscription_status END,
    updated_at = now()
  WHERE id = p_user_id;
  INSERT INTO public.admin_audit_log (admin_id, admin_email, target_user_id, target_email, action, old_value, new_value, reason)
  VALUES (auth.uid(), v_admin_email, p_user_id, v_email, 'remove_override',
    jsonb_build_object('plan', v_old->>'plan', 'status', v_old->>'status', 'source', v_old->>'source'),
    (SELECT jsonb_build_object('plan', x->>'plan', 'status', x->>'status', 'source', x->>'source') FROM (SELECT public.plan_info_for(p_user_id) x) s),
    NULLIF(trim(p_reason),''));
  RETURN public.plan_info_for(p_user_id);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(row_to_json(x) ORDER BY x.created_at DESC) FROM (
    SELECT p.id, p.email, COALESCE(NULLIF(p.display_name,''), NULLIF(p.full_name,'')) AS name, p.created_at,
      GREATEST(p.last_seen_at, u.last_sign_in_at) AS last_active_at,
      pi->>'plan' AS plan, pi->>'status' AS status, pi->>'source' AS source,
      (pi->>'admin_override')::boolean AS admin_override, p.manual_override_expires_at AS override_expires_at,
      (SELECT count(*) FROM public.trading_accounts a WHERE a.user_id = p.id) AS account_count,
      (SELECT count(*) FROM public.trades t WHERE t.user_id = p.id) AS trade_count
    FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id
    CROSS JOIN LATERAL (SELECT public.plan_info_for(p.id) AS pi) l
  ) x), '[]'::jsonb);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_user_detail(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT jsonb_build_object(
    'id', p.id, 'email', p.email, 'name', COALESCE(NULLIF(p.display_name,''), NULLIF(p.full_name,'')),
    'created_at', p.created_at, 'last_active_at', GREATEST(p.last_seen_at, u.last_sign_in_at),
    'plan_info', public.plan_info_for(p.id),
    'billing', (SELECT jsonb_build_object('provider', b.provider, 'plan', b.plan, 'status', b.status, 'renews_at', b.renews_at, 'ends_at', b.ends_at, 'updated_at', b.updated_at)
                FROM public.billing_subscriptions b WHERE b.user_id = p.id ORDER BY b.updated_at DESC LIMIT 1),
    'trade_count', (SELECT count(*) FROM public.trades WHERE user_id = p.id),
    'trades_30d', (SELECT count(*) FROM public.trades WHERE user_id = p.id AND created_at >= now() - interval '30 days'),
    'last_trade_at', (SELECT max(created_at) FROM public.trades WHERE user_id = p.id),
    'journal_count', (SELECT count(*) FROM public.journal_entries WHERE user_id = p.id),
    'last_journal_at', (SELECT max(created_at) FROM public.journal_entries WHERE user_id = p.id),
    'account_count', (SELECT count(*) FROM public.trading_accounts WHERE user_id = p.id),
    'plan_count', (SELECT count(*) FROM public.trade_plans WHERE user_id = p.id))
  INTO r FROM public.profiles p LEFT JOIN auth.users u ON u.id = p.id WHERE p.id = p_user_id;
  RETURN r;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_platform_analytics(p_days integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_since timestamptz; v_step interval; v_unit text; v_active int; v_trades int; r jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_days NOT IN (7,30,180) THEN RAISE EXCEPTION 'Invalid period'; END IF;
  v_since := now() - make_interval(days => p_days);
  v_unit := CASE WHEN p_days <= 30 THEN 'day' ELSE 'week' END;
  v_step := CASE WHEN p_days <= 30 THEN interval '1 day' ELSE interval '1 week' END;
  SELECT count(*) INTO v_active FROM (
    SELECT id AS uid FROM public.profiles WHERE last_seen_at >= v_since
    UNION SELECT user_id FROM public.trades WHERE created_at >= v_since
    UNION SELECT user_id FROM public.journal_entries WHERE created_at >= v_since) s;
  SELECT count(*) INTO v_trades FROM public.trades WHERE created_at >= v_since;
  WITH plans AS (SELECT public.plan_info_for(id) pi FROM public.profiles)
  SELECT jsonb_build_object(
    'period_days', p_days, 'bucket', v_unit,
    'new_users', (SELECT count(*) FROM public.profiles WHERE created_at >= v_since),
    'total_users', (SELECT count(*) FROM public.profiles),
    'active_users', v_active,
    'pro_users', (SELECT count(*) FROM plans WHERE (pi->>'is_pro')::boolean),
    'elite_users', (SELECT count(*) FROM plans WHERE (pi->>'is_elite')::boolean),
    'active_paid_users', (SELECT count(*) FROM plans WHERE ((pi->>'is_pro')::boolean OR (pi->>'is_elite')::boolean) AND pi->>'source' <> 'internal'),
    'override_users', (SELECT count(*) FROM plans WHERE (pi->>'admin_override')::boolean),
    'new_subscriptions', (SELECT count(*) FROM public.billing_subscriptions WHERE created_at >= v_since AND lower(status) NOT IN ('failed','pending')),
    'cancellations', (SELECT count(*) FROM public.billing_subscriptions WHERE updated_at >= v_since AND lower(status) IN ('cancelled','canceled','expired')),
    'trades_logged', v_trades,
    'journal_entries', (SELECT count(*) FROM public.journal_entries WHERE created_at >= v_since),
    'active_trading_accounts', (SELECT count(*) FROM public.trading_accounts WHERE lower(status) IN ('connected','active','synced')),
    'avg_trades_per_active_user', CASE WHEN v_active > 0 THEN round(v_trades::numeric / v_active, 1) END,
    'series', (SELECT jsonb_agg(jsonb_build_object(
        'bucket', b,
        'total_users', (SELECT count(*) FROM public.profiles WHERE created_at < b + v_step),
        'new_users', (SELECT count(*) FROM public.profiles WHERE created_at >= b AND created_at < b + v_step),
        'trades', (SELECT count(*) FROM public.trades WHERE created_at >= b AND created_at < b + v_step),
        'paid_activations', (SELECT count(*) FROM public.billing_subscriptions WHERE created_at >= b AND created_at < b + v_step AND lower(status) NOT IN ('failed','pending'))
          + (SELECT count(*) FROM public.admin_audit_log WHERE created_at >= b AND created_at < b + v_step AND action = 'activate_override')
      ) ORDER BY b)
      FROM generate_series(date_trunc(v_unit, v_since), date_trunc(v_unit, now()), v_step) b)
  ) INTO r;
  RETURN r;
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_set_plan(uuid,text,timestamptz,text), public.admin_remove_override(uuid,text), public.admin_list_users(), public.admin_user_detail(uuid), public.admin_platform_analytics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_plan(uuid,text,timestamptz,text), public.admin_remove_override(uuid,text), public.admin_list_users(), public.admin_user_detail(uuid), public.admin_platform_analytics(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan_info() TO authenticated;