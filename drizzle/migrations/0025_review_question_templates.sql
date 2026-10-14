CREATE TABLE public.review_question_templates (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.review_question_templates TO authenticated;
GRANT ALL ON public.review_question_templates TO service_role;
ALTER TABLE public.review_question_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own review template select" ON public.review_question_templates FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own review template insert" ON public.review_question_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own review template update" ON public.review_question_templates FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own review template delete" ON public.review_question_templates FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER review_question_templates_updated_at BEFORE UPDATE ON public.review_question_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
COMMENT ON TABLE public.review_question_templates IS 'Per-user Weekly Review question template: [{id,text,active}] keyed by stable ids; inactive entries keep labels for historical answers.';