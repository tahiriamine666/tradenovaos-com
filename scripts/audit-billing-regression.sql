BEGIN;
DO $test$
DECLARE u uuid; attempt uuid:=gen_random_uuid(); result jsonb; snapshot jsonb; observed timestamptz:=now(); saved_plan text;
BEGIN
 SELECT p.id INTO u FROM public.profiles p LEFT JOIN public.subscriptions s ON s.user_id=p.id
 WHERE s.dodo_subscription_id IS NULL AND s.dodo_customer_id IS NULL LIMIT 1;
 IF u IS NULL THEN RAISE EXCEPTION 'No unlinked account available for rolled-back regression'; END IF;
 INSERT INTO public.billing_checkout_attempts(id,user_id,plan,billing) VALUES(attempt,u,'pro','monthly');
 PERFORM set_config('request.jwt.claim.role','service_role',true);
 EXECUTE 'SET LOCAL ROLE service_role';
 snapshot:=jsonb_build_object('subscription_id','audit-subscription','customer_id','audit-customer','product_id','audit-product','plan','pro','billing_interval','monthly','status','active','current_period_end',now()+interval '30 days');
 result:=public.apply_dodo_snapshot(u,snapshot,observed,'audit-event-1',attempt);
 IF result->>'ok'<>'true' THEN RAISE EXCEPTION 'Initial snapshot failed'; END IF;
 result:=public.apply_dodo_snapshot(u,snapshot,observed,'audit-event-1',attempt);
 IF result->>'duplicate'<>'true' THEN RAISE EXCEPTION 'Duplicate event was not rejected'; END IF;
 snapshot:=snapshot||jsonb_build_object('plan','elite','product_id','audit-elite-product');
 result:=public.apply_dodo_snapshot(u,snapshot,observed+interval '1 second','audit-event-2',attempt);
 SELECT plan INTO saved_plan FROM public.subscriptions WHERE user_id=u;
 IF saved_plan<>'elite' THEN RAISE EXCEPTION 'Verified plan change did not apply'; END IF;
 result:=public.apply_dodo_snapshot(u,snapshot||jsonb_build_object('plan','pro'),observed-interval '1 second','audit-event-3',attempt);
 IF result->>'stale'<>'true' THEN RAISE EXCEPTION 'Stale snapshot was not rejected'; END IF;
 result:=public.apply_dodo_snapshot(u,snapshot||jsonb_build_object('subscription_id','audit-superseded-subscription'),observed+interval '2 seconds','audit-event-4',NULL);
 IF result->>'ignored'<>'true' THEN RAISE EXCEPTION 'Unverified replacement subscription was not rejected'; END IF;
 EXECUTE 'RESET ROLE';
END $test$;
ROLLBACK;
