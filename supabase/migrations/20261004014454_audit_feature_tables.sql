CREATE TABLE public.trade_plan_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid REFERENCES public.trading_accounts(id) ON DELETE CASCADE,
  account_key text NOT NULL DEFAULT 'all',
  checklist_type text NOT NULL CHECK (checklist_type IN ('daily','weekly')),
  period_date date NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'empty' CHECK (status IN ('empty','partial','complete')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, account_key, checklist_type, period_date)
);
COMMENT ON COLUMN public.trade_plan_checklists.period_date IS 'Checklist date for daily, week start (Monday) for weekly';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_plan_checklists TO authenticated;
GRANT ALL ON public.trade_plan_checklists TO service_role;
ALTER TABLE public.trade_plan_checklists ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own checklists select" ON public.trade_plan_checklists FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own checklists insert" ON public.trade_plan_checklists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own checklists update" ON public.trade_plan_checklists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own checklists delete" ON public.trade_plan_checklists FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX trade_plan_checklists_lookup ON public.trade_plan_checklists (user_id, account_key, checklist_type, period_date DESC);
CREATE TRIGGER trg_trade_plan_checklists_updated BEFORE UPDATE ON public.trade_plan_checklists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.trade_plan_checklists DROP CONSTRAINT IF EXISTS trade_plan_checklists_checklist_type_check;
ALTER TABLE public.trade_plan_checklists ADD CONSTRAINT trade_plan_checklists_checklist_type_check CHECK (checklist_type = ANY (ARRAY['daily','weekly','weekly_outlook']));

CREATE TABLE public.checklist_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checklist_models TO authenticated;
GRANT ALL ON public.checklist_models TO service_role;
ALTER TABLE public.checklist_models ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own models select" ON public.checklist_models FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own models insert" ON public.checklist_models FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own models update" ON public.checklist_models FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own models delete" ON public.checklist_models FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER trg_checklist_models_updated BEFORE UPDATE ON public.checklist_models FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
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
CREATE TABLE public.economic_calendar_preferences (
  user_id uuid PRIMARY KEY,
  default_filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  preferred_view text NOT NULL DEFAULT 'list',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.economic_calendar_preferences TO authenticated;
GRANT ALL ON public.economic_calendar_preferences TO service_role;
ALTER TABLE public.economic_calendar_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own econ prefs" ON public.economic_calendar_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER econ_prefs_updated BEFORE UPDATE ON public.economic_calendar_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.economic_calendar_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.economic_calendar_presets TO authenticated;
GRANT ALL ON public.economic_calendar_presets TO service_role;
ALTER TABLE public.economic_calendar_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own econ presets" ON public.economic_calendar_presets FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX econ_presets_user_idx ON public.economic_calendar_presets(user_id, created_at);
CREATE TRIGGER econ_presets_updated BEFORE UPDATE ON public.economic_calendar_presets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.trade_plan_checklists ADD CONSTRAINT checklist_account_ownership CHECK ((account_id IS NULL AND account_key='all') OR (account_id IS NOT NULL AND account_key=account_id::text));
DROP POLICY "Own checklists insert" ON public.trade_plan_checklists;
DROP POLICY "Own checklists update" ON public.trade_plan_checklists;
CREATE POLICY "Own checklists insert" ON public.trade_plan_checklists FOR INSERT TO authenticated WITH CHECK ((select auth.uid())=user_id AND (account_id IS NULL OR EXISTS(SELECT 1 FROM public.trading_accounts a WHERE a.id=account_id AND a.user_id=(select auth.uid()))));
CREATE POLICY "Own checklists update" ON public.trade_plan_checklists FOR UPDATE TO authenticated USING ((select auth.uid())=user_id) WITH CHECK ((select auth.uid())=user_id AND (account_id IS NULL OR EXISTS(SELECT 1 FROM public.trading_accounts a WHERE a.id=account_id AND a.user_id=(select auth.uid()))));



