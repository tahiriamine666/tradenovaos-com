-- Add fields needed by TraderScore and CSV import
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS rr numeric,
  ADD COLUMN IF NOT EXISTS discipline_score integer,
  ADD COLUMN IF NOT EXISTS execution_score integer,
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS stop_loss numeric,
  ADD COLUMN IF NOT EXISTS take_profit numeric,
  ADD COLUMN IF NOT EXISTS session text;

-- Import batches table for CSV import history
CREATE TABLE IF NOT EXISTS public.import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'processing',
  total_rows integer NOT NULL DEFAULT 0,
  imported_rows integer NOT NULL DEFAULT 0,
  failed_rows integer NOT NULL DEFAULT 0,
  error_log jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ib select" ON public.import_batches FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own ib insert" ON public.import_batches FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ib update" ON public.import_batches FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own ib delete" ON public.import_batches FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trg_import_batches_updated
BEFORE UPDATE ON public.import_batches
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();