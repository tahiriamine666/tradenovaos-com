
-- Storage policies for setup-screenshots (first folder must equal auth.uid())
CREATE POLICY "setup-screenshots owner read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'setup-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "setup-screenshots user insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'setup-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "setup-screenshots user update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'setup-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "setup-screenshots user delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'setup-screenshots' AND (storage.foldername(name))[1] = auth.uid()::text);

-- replay_screenshots table
CREATE TABLE public.replay_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.replay_sessions(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  file_name text,
  file_size bigint,
  mime_type text,
  annotations jsonb NOT NULL DEFAULT '[]'::jsonb,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.replay_screenshots TO authenticated;
GRANT ALL ON public.replay_screenshots TO service_role;

ALTER TABLE public.replay_screenshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rs select" ON public.replay_screenshots
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own rs insert" ON public.replay_screenshots
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own rs update" ON public.replay_screenshots
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own rs delete" ON public.replay_screenshots
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_replay_screenshots_user_session
  ON public.replay_screenshots (user_id, session_id, order_index);

CREATE TRIGGER replay_screenshots_set_updated_at
  BEFORE UPDATE ON public.replay_screenshots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
