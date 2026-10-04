-- Read/write security regression; every test change is rolled back.
BEGIN;
DO $test$
DECLARE u uuid; other_user uuid; denied boolean := false; n int;
BEGIN
 SELECT id INTO u FROM auth.users ORDER BY id LIMIT 1;
 SELECT id INTO other_user FROM auth.users WHERE id<>u ORDER BY id LIMIT 1;
 IF other_user IS NULL THEN RAISE EXCEPTION 'Two existing users required'; END IF;
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 PERFORM set_config('request.jwt.claim.role','authenticated',true);
 EXECUTE 'SET LOCAL ROLE authenticated';
 INSERT INTO public.user_chart_preferences(user_id,preferred_symbol) VALUES(u,'AUDIT_CHECK')
 ON CONFLICT(user_id) DO UPDATE SET preferred_symbol=excluded.preferred_symbol;
 SELECT count(*) INTO n FROM public.user_chart_preferences WHERE user_id=u AND preferred_symbol='AUDIT_CHECK';
 IF n<>1 THEN RAISE EXCEPTION 'Own preferences could not be read'; END IF;
 BEGIN
   INSERT INTO public.user_chart_preferences(user_id) VALUES(other_user)
   ON CONFLICT(user_id) DO UPDATE SET preferred_symbol='UNAUTHORIZED';
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Cross-user preferences write was allowed'; END IF;
 SELECT count(*) INTO n FROM public.user_chart_preferences WHERE user_id=other_user;
 IF n<>0 THEN RAISE EXCEPTION 'Cross-user preferences read was allowed'; END IF;
 denied:=false;
 BEGIN
   PERFORM public.apply_dodo_snapshot(u,'{}'::jsonb,now());
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Client could write billing snapshots'; END IF;
 denied:=false;
 BEGIN
   PERFORM 1 FROM public.billing_checkout_attempts;
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;
 END;
 IF NOT denied THEN RAISE EXCEPTION 'Client could read server checkout records'; END IF;
 EXECUTE 'RESET ROLE';
END $test$;
ROLLBACK;
