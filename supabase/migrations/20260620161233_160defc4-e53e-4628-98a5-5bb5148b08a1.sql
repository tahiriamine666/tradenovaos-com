
DROP POLICY IF EXISTS "anyone can submit support messages" ON public.support_messages;
CREATE POLICY "authenticated users can submit support messages"
  ON public.support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
REVOKE INSERT ON public.support_messages FROM anon;

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  email, full_name, display_name, bio, avatar_url, timezone,
  preferred_market, risk_per_trade, default_account_type, trading_style,
  last_seen_at, updated_at
) ON public.profiles TO authenticated;

DROP POLICY IF EXISTS "lessons public read" ON public.lessons;

CREATE POLICY "free lessons are public"
  ON public.lessons
  FOR SELECT
  TO anon, authenticated
  USING (COALESCE(is_premium, false) = false AND COALESCE(is_pro, false) = false);

CREATE POLICY "paid users can read premium lessons"
  ON public.lessons
  FOR SELECT
  TO authenticated
  USING (
    (COALESCE(is_premium, false) = true OR COALESCE(is_pro, false) = true)
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.plan_type IN ('pro', 'elite')
        AND p.subscription_status IN ('active', 'trialing')
    )
  );

CREATE POLICY "admins can read all lessons"
  ON public.lessons
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));
