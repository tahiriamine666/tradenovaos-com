CREATE TABLE public.trade_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_date date NOT NULL DEFAULT CURRENT_DATE,
  market_bias text NOT NULL DEFAULT 'neutral',
  focus text,
  max_daily_loss numeric,
  max_risk_per_trade numeric,
  setups_to_trade text[] NOT NULL DEFAULT '{}',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, plan_date)
);

ALTER TABLE public.trade_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own tp select" ON public.trade_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own tp insert" ON public.trade_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tp update" ON public.trade_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own tp delete" ON public.trade_plans FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER trade_plans_set_updated_at
  BEFORE UPDATE ON public.trade_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();