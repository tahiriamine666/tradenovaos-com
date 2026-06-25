CREATE OR REPLACE FUNCTION public.enforce_pro_plan_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  info jsonb;
BEGIN
  -- Service role / no auth context: allow (edge functions, webhooks, seed)
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;
  -- Admins bypass
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;

  info := public.get_user_plan_info();
  IF info IS NULL
     OR NOT (COALESCE((info->>'is_pro')::boolean, false)
             OR COALESCE((info->>'is_elite')::boolean, false)) THEN
    RAISE EXCEPTION 'Pro or Elite subscription required to use this feature'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pro_plan_playbooks ON public.playbooks;
CREATE TRIGGER enforce_pro_plan_playbooks
  BEFORE INSERT ON public.playbooks
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pro_plan_insert();

DROP TRIGGER IF EXISTS enforce_pro_plan_trade_plans ON public.trade_plans;
CREATE TRIGGER enforce_pro_plan_trade_plans
  BEFORE INSERT ON public.trade_plans
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pro_plan_insert();

DROP TRIGGER IF EXISTS enforce_pro_plan_replay_sessions ON public.replay_sessions;
CREATE TRIGGER enforce_pro_plan_replay_sessions
  BEFORE INSERT ON public.replay_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pro_plan_insert();

DROP TRIGGER IF EXISTS enforce_pro_plan_journal_entries ON public.journal_entries;
CREATE TRIGGER enforce_pro_plan_journal_entries
  BEFORE INSERT ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pro_plan_insert();

DROP TRIGGER IF EXISTS enforce_pro_plan_community_posts ON public.community_posts;
CREATE TRIGGER enforce_pro_plan_community_posts
  BEFORE INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pro_plan_insert();