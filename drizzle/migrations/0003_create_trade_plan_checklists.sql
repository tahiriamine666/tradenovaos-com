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