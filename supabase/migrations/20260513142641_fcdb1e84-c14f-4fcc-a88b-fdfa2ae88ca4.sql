CREATE TABLE public.support_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone can submit support messages"
ON public.support_messages FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "admins can view support messages"
ON public.support_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND lower(u.email) IN ('tahiria740@gmail.com', 'tahiriamine889@gmail.com')
  )
);

CREATE POLICY "admins can update support messages"
ON public.support_messages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid()
    AND lower(u.email) IN ('tahiria740@gmail.com', 'tahiriamine889@gmail.com')
  )
);