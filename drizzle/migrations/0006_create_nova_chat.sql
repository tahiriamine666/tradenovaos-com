CREATE TABLE public.nova_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New conversation',
  preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nova_conversations TO authenticated;
GRANT ALL ON public.nova_conversations TO service_role;
ALTER TABLE public.nova_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nova conversations" ON public.nova_conversations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX nova_conversations_user_idx ON public.nova_conversations(user_id, updated_at DESC);
CREATE TRIGGER nova_conversations_updated BEFORE UPDATE ON public.nova_conversations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.nova_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.nova_conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nova_messages TO authenticated;
GRANT ALL ON public.nova_messages TO service_role;
ALTER TABLE public.nova_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nova messages" ON public.nova_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.nova_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE INDEX nova_messages_conv_idx ON public.nova_messages(conversation_id, created_at);

CREATE TABLE public.nova_preferences (
  user_id uuid PRIMARY KEY,
  trading_style text,
  main_session text,
  markets text[] NOT NULL DEFAULT '{}',
  custom_notes text,
  response_style text NOT NULL DEFAULT 'concise',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.nova_preferences TO authenticated;
GRANT ALL ON public.nova_preferences TO service_role;
ALTER TABLE public.nova_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own nova prefs" ON public.nova_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER nova_preferences_updated BEFORE UPDATE ON public.nova_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();