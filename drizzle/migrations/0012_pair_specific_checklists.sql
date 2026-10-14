ALTER TABLE public.trade_plan_checklists ADD COLUMN IF NOT EXISTS pair text NOT NULL DEFAULT '';
ALTER TABLE public.trade_plan_checklists DROP CONSTRAINT trade_plan_checklists_checklist_type_check;
ALTER TABLE public.trade_plan_checklists ADD CONSTRAINT trade_plan_checklists_checklist_type_check CHECK (checklist_type = ANY (ARRAY['daily','weekly','weekly_outlook','pair_checklist']));
ALTER TABLE public.trade_plan_checklists DROP CONSTRAINT trade_plan_checklists_user_id_account_key_checklist_type_pe_key;
ALTER TABLE public.trade_plan_checklists ADD CONSTRAINT trade_plan_checklists_user_account_type_period_pair_key UNIQUE (user_id, account_key, checklist_type, period_date, pair);
COMMENT ON COLUMN public.trade_plan_checklists.pair IS 'Uppercase symbol for pair_checklist rows; empty string for non-pair outlooks/checklists';