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