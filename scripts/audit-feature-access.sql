CREATE TABLE public.nova_usage (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,period_start date NOT NULL,
 credits_used integer NOT NULL DEFAULT 0 CHECK(credits_used>=0),updated_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(user_id,period_start)
);
ALTER TABLE public.nova_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.nova_usage FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.nova_usage TO authenticated;
GRANT ALL ON public.nova_usage TO service_role;
CREATE POLICY own_nova_usage ON public.nova_usage FOR SELECT TO authenticated USING((select auth.uid())=user_id);
CREATE OR REPLACE FUNCTION public.get_nova_usage() RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); info jsonb; lim int; used int; anchor date; ps date; months int;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 info:=public.get_user_plan_info(uid);
 lim:=CASE WHEN (info->>'is_elite')::boolean THEN 1000 WHEN (info->>'is_pro')::boolean THEN 500 ELSE 0 END;
 SELECT created_at::date INTO anchor FROM public.subscriptions WHERE user_id=uid;
 IF anchor IS NULL OR anchor>current_date THEN anchor:=date_trunc('month',current_date)::date; END IF;
 months:=((extract(year from current_date)-extract(year from anchor))*12+extract(month from current_date)-extract(month from anchor))::int;
 ps:=(anchor+make_interval(months=>months))::date;
 IF ps>current_date THEN months:=months-1; ps:=(anchor+make_interval(months=>months))::date; END IF;
 SELECT credits_used INTO used FROM public.nova_usage WHERE user_id=uid AND period_start=ps;
 RETURN jsonb_build_object('plan',info->>'effective_plan','limit',lim,'used',coalesce(used,0),'period_start',ps,'resets_at',(anchor+make_interval(months=>months+1))::date);
END $$;
CREATE OR REPLACE FUNCTION public.consume_nova_credit() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE uid uuid:=auth.uid(); u jsonb; used int;
BEGIN
 IF uid IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE='42501'; END IF;
 u:=public.get_nova_usage();
 IF (u->>'limit')::int<=0 THEN RETURN u||jsonb_build_object('allowed',false); END IF;
 INSERT INTO public.nova_usage(user_id,period_start,credits_used) VALUES(uid,(u->>'period_start')::date,1)
 ON CONFLICT(user_id,period_start) DO UPDATE SET credits_used=nova_usage.credits_used+1,updated_at=now() WHERE nova_usage.credits_used<(u->>'limit')::int RETURNING credits_used INTO used;
 RETURN u||jsonb_build_object('allowed',used IS NOT NULL,'used',coalesce(used,(u->>'used')::int));
END $$;
REVOKE ALL ON FUNCTION public.get_nova_usage(),public.consume_nova_credit() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_nova_usage(),public.consume_nova_credit() TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_trading_account() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE info jsonb; n int;
BEGIN
 IF auth.role()='service_role' OR auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' THEN
   info:=public.get_user_plan_info(auth.uid());
   IF NOT coalesce((info->>'is_active')::boolean,false) THEN RAISE EXCEPTION 'An active subscription is required' USING ERRCODE='42501'; END IF;
   PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text,1));
   SELECT count(*) INTO n FROM public.trading_accounts WHERE user_id=NEW.user_id;
   IF NOT coalesce((info->>'is_elite')::boolean,false) AND n>=1 THEN RAISE EXCEPTION 'Pro includes one trading account' USING ERRCODE='42501'; END IF;
   IF NEW.metaapi_account_id IS NOT NULL THEN RAISE EXCEPTION 'Provider IDs are server managed' USING ERRCODE='42501'; END IF;
 ELSE
   IF OLD.metaapi_account_id IS NOT NULL AND (NEW.platform IS DISTINCT FROM OLD.platform OR NEW.account_number IS DISTINCT FROM OLD.account_number OR NEW.login IS DISTINCT FROM OLD.login OR NEW.server IS DISTINCT FROM OLD.server) THEN RAISE EXCEPTION 'Create a separate connection to change the linked account identity' USING ERRCODE='42501'; END IF;
   IF NEW.metaapi_account_id IS DISTINCT FROM OLD.metaapi_account_id OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN RAISE EXCEPTION 'Provider IDs and ownership are server managed' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER protect_trading_account BEFORE INSERT OR UPDATE ON public.trading_accounts FOR EACH ROW EXECUTE FUNCTION public.protect_trading_account();
