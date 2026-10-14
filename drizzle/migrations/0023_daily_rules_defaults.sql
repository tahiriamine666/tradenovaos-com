CREATE TABLE public.daily_plan_rules (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  rules jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.daily_plan_rules IS 'Per-user persistent Daily Plan rules template; auto-fills each new day''s Rules field (checked state stays per-day in trade_plans).';
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_plan_rules TO authenticated;
GRANT ALL ON public.daily_plan_rules TO service_role;
ALTER TABLE public.daily_plan_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads daily plan rules" ON public.daily_plan_rules FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Owner inserts daily plan rules" ON public.daily_plan_rules FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner updates daily plan rules" ON public.daily_plan_rules FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner deletes daily plan rules" ON public.daily_plan_rules FOR DELETE TO authenticated USING (auth.uid() = user_id);