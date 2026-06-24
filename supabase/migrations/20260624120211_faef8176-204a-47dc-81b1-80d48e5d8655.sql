
-- 1) billing_subscriptions: source of truth for Lemon Squeezy
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id text,
  subscription_id text UNIQUE,
  variant_id text,
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free','pro','elite')),
  status text NOT NULL DEFAULT 'inactive',
  trial_ends_at timestamptz,
  renews_at timestamptz,
  ends_at timestamptz,
  update_payment_method_url text,
  customer_portal_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.billing_subscriptions TO authenticated;
GRANT ALL ON public.billing_subscriptions TO service_role;

ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own billing row"
  ON public.billing_subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE policies: only service_role can write.

CREATE TRIGGER billing_subscriptions_set_updated_at
  BEFORE UPDATE ON public.billing_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS billing_subscriptions_customer_id_idx
  ON public.billing_subscriptions(customer_id);

-- 2) Plan helpers now read from billing_subscriptions first.

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
BEGIN
  SELECT * INTO b FROM public.billing_subscriptions WHERE user_id = auth.uid();
  SELECT plan_type, subscription_status, trial_ends_at, current_period_end
    INTO p FROM public.profiles WHERE id = auth.uid();

  IF b IS NOT NULL AND b.status IN ('on_trial','active','past_due') THEN
    v_plan := b.plan;
    v_status := CASE
      WHEN b.status = 'on_trial' THEN 'trialing'
      ELSE b.status
    END;
    v_trial := b.trial_ends_at;
    v_renews := b.renews_at;
    v_customer := b.customer_id;
    v_sub := b.subscription_id;
  ELSIF p IS NOT NULL THEN
    -- Fallback: admin-managed / legacy profile state
    v_plan := COALESCE(p.plan_type, 'free');
    v_status := COALESCE(p.subscription_status, 'inactive');
    v_trial := p.trial_ends_at;
    v_renews := p.current_period_end;
  ELSE
    v_plan := 'free'; v_status := 'inactive';
  END IF;

  v_is_trial := v_status = 'trialing' AND (v_trial IS NULL OR v_trial > now());
  v_active   := v_status = 'active' OR v_is_trial;
  v_is_pro   := v_active AND v_plan = 'pro';
  v_is_elite := v_active AND v_plan = 'elite';

  RETURN jsonb_build_object(
    'plan', v_plan,
    'status', v_status,
    'trial_ends_at', v_trial,
    'current_period_end', v_renews,
    'customer_id', v_customer,
    'subscription_id', v_sub,
    'is_free', NOT v_active OR v_plan = 'free',
    'is_pro', v_is_pro,
    'is_elite', v_is_elite,
    'is_trial_active', v_is_trial
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.community_user_tier()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE((get_user_plan_info()->>'plan')::text, 'free')
  FROM (SELECT 1) _
  WHERE (
    (get_user_plan_info()->>'is_pro')::boolean
    OR (get_user_plan_info()->>'is_elite')::boolean
  );
$function$;
