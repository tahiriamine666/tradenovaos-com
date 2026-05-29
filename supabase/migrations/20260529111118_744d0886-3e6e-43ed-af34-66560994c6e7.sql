
-- 1) Private trade-screenshots bucket + owner-only read
UPDATE storage.buckets SET public = false WHERE id = 'trade-screenshots';

DROP POLICY IF EXISTS "trade-screenshots public read" ON storage.objects;

CREATE POLICY "trade-screenshots owner read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'trade-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 2) Support messages: use is_admin() instead of hardcoded emails
DROP POLICY IF EXISTS "admins can view support messages" ON public.support_messages;
DROP POLICY IF EXISTS "admins can update support messages" ON public.support_messages;

CREATE POLICY "admins can view support messages"
ON public.support_messages FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "admins can update support messages"
ON public.support_messages FOR UPDATE TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));
