
-- 1. Prevent privilege escalation via direct profile update
CREATE OR REPLACE FUNCTION public.prevent_profile_billing_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role / SECURITY DEFINER paths (auth.uid() IS NULL in those contexts when invoked as service)
  IF auth.uid() IS NULL THEN
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

DROP TRIGGER IF EXISTS trg_prevent_profile_billing_self_update ON public.profiles;
CREATE TRIGGER trg_prevent_profile_billing_self_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_billing_self_update();

-- 2. Fix learning streak cross-user write
CREATE OR REPLACE FUNCTION public.update_learning_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last date;
  v_streak int;
  v_today date := CURRENT_DATE;
BEGIN
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  SELECT last_study_date, streak_days INTO v_last, v_streak
  FROM public.learning_stats WHERE user_id = p_user_id;

  IF v_last IS NULL THEN
    v_streak := 1;
  ELSIF v_last = v_today THEN
    v_streak := COALESCE(v_streak, 1);
  ELSIF v_last = v_today - 1 THEN
    v_streak := COALESCE(v_streak, 0) + 1;
  ELSE
    v_streak := 1;
  END IF;

  INSERT INTO public.learning_stats (user_id, streak_days, last_study_date, updated_at)
  VALUES (p_user_id, v_streak, v_today, now())
  ON CONFLICT (user_id) DO UPDATE
    SET streak_days = EXCLUDED.streak_days,
        last_study_date = EXCLUDED.last_study_date,
        updated_at = now();
END;
$$;
