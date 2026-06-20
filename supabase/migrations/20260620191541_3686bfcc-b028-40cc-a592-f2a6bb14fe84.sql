
-- Tighten premium lessons RLS to require non-expired trial
DROP POLICY IF EXISTS "paid users can read premium lessons" ON public.lessons;
CREATE POLICY "paid users can read premium lessons"
ON public.lessons FOR SELECT TO authenticated
USING (
  ((COALESCE(is_premium, false) = true) OR (COALESCE(is_pro, false) = true))
  AND EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.plan_type = ANY (ARRAY['pro'::text,'elite'::text])
      AND (
        p.subscription_status = 'active'
        OR (p.subscription_status = 'trialing' AND (p.trial_ends_at IS NULL OR p.trial_ends_at > now()))
      )
  )
);

-- Require user_id = auth.uid() on support message inserts (no anonymous NULL user_id rows)
DROP POLICY IF EXISTS "authenticated users can submit support messages" ON public.support_messages;
CREATE POLICY "authenticated users can submit support messages"
ON public.support_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- Allow users to read their own submitted support messages
DROP POLICY IF EXISTS "users can view own support messages" ON public.support_messages;
CREATE POLICY "users can view own support messages"
ON public.support_messages FOR SELECT TO authenticated
USING (user_id = auth.uid());
