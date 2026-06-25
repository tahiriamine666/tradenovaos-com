
-- Fix 1: community_user_tier() should always return the actual tier string
CREATE OR REPLACE FUNCTION public.community_user_tier()
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  info jsonb;
BEGIN
  info := public.get_user_plan_info();
  IF info IS NULL THEN RETURN 'free'; END IF;
  IF COALESCE((info->>'is_elite')::boolean, false) THEN RETURN 'elite'; END IF;
  IF COALESCE((info->>'is_pro')::boolean, false) THEN RETURN 'pro'; END IF;
  RETURN 'free';
END;
$function$;

-- Fix 2: Harden billing field protection via BEFORE UPDATE trigger on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_billing_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Service role / no auth context: allow (edge functions, webhooks)
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  -- Admins may modify billing
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;

  IF NEW.plan_type IS DISTINCT FROM OLD.plan_type
     OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
     OR NEW.upgraded_manually IS DISTINCT FROM OLD.upgraded_manually
     OR NEW.upgraded_at IS DISTINCT FROM OLD.upgraded_at
  THEN
    RAISE EXCEPTION 'Billing fields cannot be modified directly';
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure the trigger is actually attached (drop+recreate to be deterministic)
DROP TRIGGER IF EXISTS prevent_profile_billing_self_update_trg ON public.profiles;
CREATE TRIGGER prevent_profile_billing_self_update_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_billing_self_update();
