-- 1. Allow admins to bypass billing protection trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_billing_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Service-role / SECURITY DEFINER without a session
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Admins are allowed to modify billing fields (manual upgrades, etc.)
  IF public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.plan_type IS DISTINCT FROM OLD.plan_type
     OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
     OR NEW.paddle_subscription_id IS DISTINCT FROM OLD.paddle_subscription_id
     OR NEW.paddle_customer_id IS DISTINCT FROM OLD.paddle_customer_id
     OR NEW.upgraded_manually IS DISTINCT FROM OLD.upgraded_manually
     OR NEW.upgraded_at IS DISTINCT FROM OLD.upgraded_at
  THEN
    RAISE EXCEPTION 'Billing fields cannot be modified directly';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Audit table for manual admin overrides
CREATE TABLE IF NOT EXISTS public.subscription_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  plan text NOT NULL,
  status text NOT NULL,
  trial_days integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.subscription_overrides TO authenticated;
GRANT ALL ON public.subscription_overrides TO service_role;

ALTER TABLE public.subscription_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read overrides"
  ON public.subscription_overrides FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins insert overrides"
  ON public.subscription_overrides FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND admin_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_subscription_overrides_user ON public.subscription_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_overrides_created ON public.subscription_overrides(created_at DESC);