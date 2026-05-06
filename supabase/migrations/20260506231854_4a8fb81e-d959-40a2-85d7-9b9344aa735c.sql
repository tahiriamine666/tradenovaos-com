ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS playbook_id uuid REFERENCES public.playbooks(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_trades_playbook ON public.trades(playbook_id);