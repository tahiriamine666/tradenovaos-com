
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS upgraded_manually boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.admin_search_users(p_query text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)) FROM (
      SELECT p.id, p.email, p.display_name,
        COALESCE(p.plan_type,'free') AS plan_type,
        COALESCE(p.subscription_status,'inactive') AS subscription_status,
        COALESCE(p.upgraded_manually,false) AS upgraded_manually
      FROM public.profiles p
      WHERE p.email ILIKE '%' || p_query || '%'
         OR p.display_name ILIKE '%' || p_query || '%'
      ORDER BY p.email
      LIMIT 10
    ) x
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.admin_upgrade_by_email(
  p_email text,
  p_plan text,
  p_status text DEFAULT 'active',
  p_trial_days integer DEFAULT 0,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_plan NOT IN ('free','pro','elite') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid plan');
  END IF;
  IF p_status NOT IN ('active','trialing','inactive','canceled','past_due') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;

  SELECT id INTO v_user_id FROM public.profiles WHERE lower(email) = lower(p_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found: ' || p_email);
  END IF;

  UPDATE public.profiles SET
    plan_type = p_plan,
    subscription_plan = p_plan,
    subscription_status = p_status,
    trial_ends_at = CASE WHEN p_trial_days > 0 THEN now() + (p_trial_days || ' days')::interval ELSE NULL END,
    upgraded_manually = (p_plan <> 'free'),
    upgraded_at = now(),
    updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id, 'plan', p_plan, 'status', p_status);
END $$;

CREATE OR REPLACE FUNCTION public.admin_extend_trial(p_email text, p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_current timestamptz;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin access required'; END IF;

  SELECT id, trial_ends_at INTO v_user_id, v_current
    FROM public.profiles WHERE lower(email) = lower(p_email) LIMIT 1;
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'User not found');
  END IF;

  UPDATE public.profiles SET
    trial_ends_at = COALESCE(GREATEST(v_current, now()), now()) + (p_days || ' days')::interval,
    subscription_status = 'trialing',
    updated_at = now()
  WHERE id = v_user_id;

  RETURN jsonb_build_object('success', true, 'user_id', v_user_id);
END $$;
