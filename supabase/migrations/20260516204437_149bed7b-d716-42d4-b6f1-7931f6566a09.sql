-- Paddle BYOK integration: add subscription tracking fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text,
  ADD COLUMN IF NOT EXISTS paddle_price_id text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_paddle_customer_id ON public.profiles(paddle_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_paddle_subscription_id ON public.profiles(paddle_subscription_id);

-- Update get_user_plan_info to include Paddle fields
CREATE OR REPLACE FUNCTION public.get_user_plan_info()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  p record;
BEGIN
  SELECT plan_type, subscription_status, trial_ends_at, current_period_end,
         paddle_subscription_id, paddle_customer_id
    INTO p
    FROM public.profiles WHERE id = auth.uid();
  IF p IS NULL THEN
    RETURN jsonb_build_object('plan','free','status','inactive','is_free',true,'is_pro',false,'is_elite',false,'is_trial_active',false);
  END IF;
  RETURN jsonb_build_object(
    'plan', p.plan_type,
    'status', p.subscription_status,
    'trial_ends_at', p.trial_ends_at,
    'current_period_end', p.current_period_end,
    'paddle_subscription_id', p.paddle_subscription_id,
    'paddle_customer_id', p.paddle_customer_id,
    'is_free', p.plan_type = 'free' OR p.subscription_status NOT IN ('active','trialing'),
    'is_pro', p.plan_type = 'pro' AND p.subscription_status IN ('active','trialing'),
    'is_elite', p.plan_type = 'elite' AND p.subscription_status IN ('active','trialing'),
    'is_trial_active', p.subscription_status = 'trialing' AND (p.trial_ends_at IS NULL OR p.trial_ends_at > now())
  );
END;
$function$;