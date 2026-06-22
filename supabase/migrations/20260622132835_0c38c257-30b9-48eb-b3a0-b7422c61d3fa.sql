
-- 1) community_comments SELECT mirrors community_posts visibility
DROP POLICY IF EXISTS community_comments_select_if_post_visible ON public.community_comments;
CREATE POLICY community_comments_select_if_post_visible
ON public.community_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_posts p
    WHERE p.id = community_comments.post_id
      AND (
        p.user_id = auth.uid()
        OR p.visibility = 'public'
        OR (p.visibility = 'pro'   AND public.community_user_tier() = ANY (ARRAY['pro','elite']))
        OR (p.visibility = 'elite' AND public.community_user_tier() = 'elite')
      )
  )
);

-- 2) community-uploads: own files OR referenced by a post the caller can see
DROP POLICY IF EXISTS community_uploads_read_auth ON storage.objects;
CREATE POLICY community_uploads_read_auth
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'community-uploads'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (
      SELECT 1
      FROM public.community_posts p,
           unnest(COALESCE(p.image_urls, ARRAY[]::text[])) AS u
      WHERE u LIKE '%' || storage.objects.name
        AND (
          p.user_id = auth.uid()
          OR p.visibility = 'public'
          OR (p.visibility = 'pro'   AND public.community_user_tier() = ANY (ARRAY['pro','elite']))
          OR (p.visibility = 'elite' AND public.community_user_tier() = 'elite')
        )
    )
  )
);

-- 3) profiles UPDATE: freeze paddle_price_id too
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update"
ON public.profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND NOT (plan_type              IS DISTINCT FROM (SELECT p.plan_type              FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (subscription_plan      IS DISTINCT FROM (SELECT p.subscription_plan      FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (subscription_status    IS DISTINCT FROM (SELECT p.subscription_status    FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (trial_ends_at          IS DISTINCT FROM (SELECT p.trial_ends_at          FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (current_period_end     IS DISTINCT FROM (SELECT p.current_period_end     FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (paddle_subscription_id IS DISTINCT FROM (SELECT p.paddle_subscription_id FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (paddle_customer_id     IS DISTINCT FROM (SELECT p.paddle_customer_id     FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (paddle_price_id        IS DISTINCT FROM (SELECT p.paddle_price_id        FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (upgraded_manually      IS DISTINCT FROM (SELECT p.upgraded_manually      FROM public.profiles p WHERE p.id = auth.uid()))
  AND NOT (upgraded_at            IS DISTINCT FROM (SELECT p.upgraded_at            FROM public.profiles p WHERE p.id = auth.uid()))
);

-- Also freeze paddle_price_id in the billing-fields trigger
CREATE OR REPLACE FUNCTION public.prevent_profile_billing_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;

  IF NEW.plan_type IS DISTINCT FROM OLD.plan_type
     OR NEW.subscription_plan IS DISTINCT FROM OLD.subscription_plan
     OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     OR NEW.current_period_end IS DISTINCT FROM OLD.current_period_end
     OR NEW.paddle_subscription_id IS DISTINCT FROM OLD.paddle_subscription_id
     OR NEW.paddle_customer_id IS DISTINCT FROM OLD.paddle_customer_id
     OR NEW.paddle_price_id IS DISTINCT FROM OLD.paddle_price_id
     OR NEW.upgraded_manually IS DISTINCT FROM OLD.upgraded_manually
     OR NEW.upgraded_at IS DISTINCT FROM OLD.upgraded_at
  THEN
    RAISE EXCEPTION 'Billing fields cannot be modified directly';
  END IF;

  RETURN NEW;
END;
$function$;

-- 4) get_user_plan_info: honor trial_ends_at for is_pro / is_elite
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
    'is_free',
      p.plan_type = 'free'
      OR p.subscription_status NOT IN ('active','trialing')
      OR (p.subscription_status = 'trialing'
          AND p.trial_ends_at IS NOT NULL
          AND p.trial_ends_at <= now()),
    'is_pro',
      p.plan_type = 'pro' AND (
        p.subscription_status = 'active'
        OR (p.subscription_status = 'trialing'
            AND (p.trial_ends_at IS NULL OR p.trial_ends_at > now()))
      ),
    'is_elite',
      p.plan_type = 'elite' AND (
        p.subscription_status = 'active'
        OR (p.subscription_status = 'trialing'
            AND (p.trial_ends_at IS NULL OR p.trial_ends_at > now()))
      ),
    'is_trial_active',
      p.subscription_status = 'trialing'
      AND (p.trial_ends_at IS NULL OR p.trial_ends_at > now())
  );
END;
$function$;

-- 5) Realtime broadcast/presence: scope subscriptions to the authenticated user's own topic
DO $$
BEGIN
  EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
EXCEPTION WHEN insufficient_privilege THEN
  NULL;
END $$;

DROP POLICY IF EXISTS "authenticated read own topic" ON realtime.messages;
CREATE POLICY "authenticated read own topic"
ON realtime.messages FOR SELECT TO authenticated
USING (
  realtime.topic() = ('user:' || (auth.uid())::text)
  OR realtime.topic() LIKE ('user:' || (auth.uid())::text || ':%')
);

DROP POLICY IF EXISTS "authenticated write own topic" ON realtime.messages;
CREATE POLICY "authenticated write own topic"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (
  realtime.topic() = ('user:' || (auth.uid())::text)
  OR realtime.topic() LIKE ('user:' || (auth.uid())::text || ':%')
);
