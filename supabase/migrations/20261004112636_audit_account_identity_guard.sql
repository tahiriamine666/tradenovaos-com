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


