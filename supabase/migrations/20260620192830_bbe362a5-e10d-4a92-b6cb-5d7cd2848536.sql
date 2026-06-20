
-- Update handle_new_user to start a 7-day Pro trial
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, plan_type, subscription_plan, subscription_status, trial_ends_at)
  VALUES (NEW.id, NEW.email, 'pro', 'pro', 'trialing', now() + interval '7 days')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Backfill: any existing user who has never been on a trial and is not paying gets a 7-day trial
UPDATE public.profiles
SET plan_type = 'pro',
    subscription_plan = 'pro',
    subscription_status = 'trialing',
    trial_ends_at = now() + interval '7 days',
    updated_at = now()
WHERE trial_ends_at IS NULL
  AND COALESCE(upgraded_manually, false) = false
  AND (subscription_status IS NULL OR subscription_status IN ('inactive','free'))
  AND (paddle_subscription_id IS NULL);
