ALTER TABLE public.trade_plans ADD COLUMN IF NOT EXISTS pair text NOT NULL DEFAULT '';
UPDATE public.trade_plans SET pair = 'EURUSD' WHERE pair = '';
ALTER TABLE public.trade_plans DROP CONSTRAINT IF EXISTS trade_plans_user_id_plan_date_key;
ALTER TABLE public.trade_plans ADD CONSTRAINT trade_plans_user_date_pair_key UNIQUE (user_id, plan_date, pair);