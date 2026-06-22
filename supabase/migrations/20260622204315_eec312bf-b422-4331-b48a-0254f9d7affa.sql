CREATE OR REPLACE FUNCTION public.community_user_tier()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p.plan_type = 'elite' AND (
      p.subscription_status = 'active'
      OR (p.subscription_status = 'trialing'
          AND (p.trial_ends_at IS NULL OR p.trial_ends_at > now()))
    ) THEN 'elite'
    WHEN p.plan_type = 'pro' AND (
      p.subscription_status = 'active'
      OR (p.subscription_status = 'trialing'
          AND (p.trial_ends_at IS NULL OR p.trial_ends_at > now()))
    ) THEN 'pro'
    ELSE 'free'
  END
  FROM public.profiles p
  WHERE p.id = auth.uid()
$function$;