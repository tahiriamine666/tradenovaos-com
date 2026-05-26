ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS stress_score integer,
  ADD COLUMN IF NOT EXISTS stress_label text,
  ADD COLUMN IF NOT EXISTS what_went_well text,
  ADD COLUMN IF NOT EXISTS mistakes_list text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS emotional_trigger text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS session text,
  ADD COLUMN IF NOT EXISTS session_time text,
  ADD COLUMN IF NOT EXISTS ai_review jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS confidence_score integer;