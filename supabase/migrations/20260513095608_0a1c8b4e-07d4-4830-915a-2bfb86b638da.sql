
-- 1. Profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text NOT NULL DEFAULT 'inactive',
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS upgraded_at timestamptz;

-- Backfill plan_type from existing subscription_plan
UPDATE public.profiles SET plan_type = subscription_plan WHERE plan_type = 'free' AND subscription_plan <> 'free';

-- 2. admin_users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  notes text
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Security definer helper
CREATE OR REPLACE FUNCTION public.is_admin(_uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE id = _uid)
$$;

DROP POLICY IF EXISTS "admins read admin_users" ON public.admin_users;
CREATE POLICY "admins read admin_users" ON public.admin_users
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()) OR id = auth.uid());

-- 3. upgrade_requests table
CREATE TABLE IF NOT EXISTS public.upgrade_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_plan text NOT NULL CHECK (requested_plan IN ('pro','elite')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  payment_method text NOT NULL DEFAULT 'payoneer',
  payoneer_ref text,
  user_message text,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.upgrade_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own ur select" ON public.upgrade_requests;
CREATE POLICY "own ur select" ON public.upgrade_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "own ur insert" ON public.upgrade_requests;
CREATE POLICY "own ur insert" ON public.upgrade_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "admin ur update" ON public.upgrade_requests;
CREATE POLICY "admin ur update" ON public.upgrade_requests
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()));

-- 4. RPCs
CREATE OR REPLACE FUNCTION public.get_user_plan_info()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  p record;
BEGIN
  SELECT plan_type, subscription_status, trial_ends_at
    INTO p
    FROM public.profiles WHERE id = auth.uid();
  IF p IS NULL THEN
    RETURN jsonb_build_object('plan','free','status','inactive','is_free',true,'is_pro',false,'is_elite',false,'is_trial_active',false);
  END IF;
  RETURN jsonb_build_object(
    'plan', p.plan_type,
    'status', p.subscription_status,
    'trial_ends_at', p.trial_ends_at,
    'is_free', p.plan_type = 'free' OR p.subscription_status NOT IN ('active','trialing'),
    'is_pro', p.plan_type = 'pro' AND p.subscription_status IN ('active','trialing'),
    'is_elite', p.plan_type = 'elite' AND p.subscription_status IN ('active','trialing'),
    'is_trial_active', p.subscription_status = 'trialing' AND (p.trial_ends_at IS NULL OR p.trial_ends_at > now())
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.request_upgrade(p_plan text, p_payoneer_ref text, p_message text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_plan NOT IN ('pro','elite') THEN RAISE EXCEPTION 'invalid plan'; END IF;
  INSERT INTO public.upgrade_requests (user_id, requested_plan, payoneer_ref, user_message)
  VALUES (auth.uid(), p_plan, p_payoneer_ref, p_message)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_upgrade_user(target_user_id uuid, new_plan text, trial_days integer DEFAULT 0, notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'admin only'; END IF;
  IF new_plan NOT IN ('free','pro','elite') THEN RAISE EXCEPTION 'invalid plan'; END IF;
  UPDATE public.profiles SET
    plan_type = new_plan,
    subscription_plan = new_plan,
    subscription_status = CASE WHEN new_plan = 'free' THEN 'inactive'
                               WHEN trial_days > 0 THEN 'trialing'
                               ELSE 'active' END,
    trial_ends_at = CASE WHEN trial_days > 0 THEN now() + (trial_days || ' days')::interval ELSE NULL END,
    upgraded_at = now(),
    updated_at = now()
  WHERE id = target_user_id;
END;
$$;
