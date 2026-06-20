
-- Harden support_messages INSERT policy: prevent impersonation via user_id
DROP POLICY IF EXISTS "authenticated users can submit support messages" ON public.support_messages;
CREATE POLICY "authenticated users can submit support messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()));

-- Harden profiles UPDATE policy: defense-in-depth, disallow modifying billing columns at the policy level
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND plan_type IS NOT DISTINCT FROM (SELECT plan_type FROM public.profiles WHERE id = auth.uid())
  AND subscription_plan IS NOT DISTINCT FROM (SELECT subscription_plan FROM public.profiles WHERE id = auth.uid())
  AND subscription_status IS NOT DISTINCT FROM (SELECT subscription_status FROM public.profiles WHERE id = auth.uid())
  AND trial_ends_at IS NOT DISTINCT FROM (SELECT trial_ends_at FROM public.profiles WHERE id = auth.uid())
  AND current_period_end IS NOT DISTINCT FROM (SELECT current_period_end FROM public.profiles WHERE id = auth.uid())
  AND paddle_subscription_id IS NOT DISTINCT FROM (SELECT paddle_subscription_id FROM public.profiles WHERE id = auth.uid())
  AND paddle_customer_id IS NOT DISTINCT FROM (SELECT paddle_customer_id FROM public.profiles WHERE id = auth.uid())
  AND upgraded_manually IS NOT DISTINCT FROM (SELECT upgraded_manually FROM public.profiles WHERE id = auth.uid())
  AND upgraded_at IS NOT DISTINCT FROM (SELECT upgraded_at FROM public.profiles WHERE id = auth.uid())
);
