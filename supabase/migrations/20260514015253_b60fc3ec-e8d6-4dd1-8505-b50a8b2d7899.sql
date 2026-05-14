CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.workspace_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  page text NOT NULL,
  layout jsonb NOT NULL DEFAULT '[]'::jsonb,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, page)
);

ALTER TABLE public.workspace_layouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own wl select" ON public.workspace_layouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own wl insert" ON public.workspace_layouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own wl update" ON public.workspace_layouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own wl delete" ON public.workspace_layouts FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_workspace_layouts_updated_at
BEFORE UPDATE ON public.workspace_layouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();