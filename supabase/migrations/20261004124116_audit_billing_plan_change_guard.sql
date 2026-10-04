CREATE OR REPLACE FUNCTION public.apply_dodo_snapshot(p_user uuid,p_snapshot jsonb,p_observed_at timestamptz,p_event_id text DEFAULT NULL,p_attempt_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SET search_path=public AS $$
DECLARE oldrow public.subscriptions%rowtype; sid text:=p_snapshot->>'subscription_id'; cid text:=p_snapshot->>'customer_id';
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'service role required' USING ERRCODE='42501'; END IF;
  IF sid IS NULL OR cid IS NULL OR coalesce(p_snapshot->>'plan','') NOT IN ('pro','elite') THEN RAISE EXCEPTION 'invalid subscription'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text,0));
  IF p_event_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.billing_webhook_events WHERE event_id=p_event_id) THEN RETURN jsonb_build_object('duplicate',true); END IF;
  SELECT * INTO oldrow FROM public.subscriptions WHERE user_id=p_user FOR UPDATE;
  IF oldrow.dodo_customer_id IS NOT NULL AND oldrow.dodo_customer_id<>cid THEN RAISE EXCEPTION 'customer ownership conflict'; END IF;
  IF EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id<>p_user AND (dodo_subscription_id=sid OR dodo_customer_id=cid)) THEN RAISE EXCEPTION 'subscription ownership conflict'; END IF;
  IF p_attempt_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.billing_checkout_attempts WHERE id=p_attempt_id AND user_id=p_user AND ((status='confirmed' AND subscription_id=sid) OR (status='pending' AND plan=p_snapshot->>'plan' AND billing=p_snapshot->>'billing_interval'))) THEN RAISE EXCEPTION 'checkout ownership conflict'; END IF;
  IF oldrow.dodo_subscription_id IS NOT NULL AND oldrow.dodo_subscription_id<>sid AND p_attempt_id IS NULL THEN RETURN jsonb_build_object('ignored',true); END IF;
  IF oldrow.dodo_subscription_id IS NOT NULL AND oldrow.dodo_subscription_id<>sid AND NOT EXISTS(SELECT 1 FROM public.billing_checkout_attempts WHERE id=p_attempt_id AND status='pending') THEN RETURN jsonb_build_object('superseded',true); END IF;
  IF oldrow.provider_observed_at IS NOT NULL AND oldrow.provider_observed_at>p_observed_at THEN RETURN jsonb_build_object('stale',true); END IF;
  INSERT INTO public.subscriptions(user_id,billing_provider,dodo_customer_id,dodo_subscription_id,dodo_product_id,plan,status,billing_interval,trial_end,current_period_end,renews_at,ends_at,cancel_at_period_end,provider_observed_at,updated_at)
  VALUES(p_user,'dodo',cid,sid,p_snapshot->>'product_id',p_snapshot->>'plan',p_snapshot->>'status',p_snapshot->>'billing_interval',(p_snapshot->>'trial_end')::timestamptz,(p_snapshot->>'current_period_end')::timestamptz,(p_snapshot->>'current_period_end')::timestamptz,(p_snapshot->>'ends_at')::timestamptz,coalesce((p_snapshot->>'cancel_at_period_end')::boolean,false),p_observed_at,now())
  ON CONFLICT(user_id) DO UPDATE SET billing_provider=excluded.billing_provider,dodo_customer_id=excluded.dodo_customer_id,dodo_subscription_id=excluded.dodo_subscription_id,dodo_product_id=excluded.dodo_product_id,plan=excluded.plan,status=excluded.status,billing_interval=excluded.billing_interval,trial_end=excluded.trial_end,current_period_end=excluded.current_period_end,renews_at=excluded.renews_at,ends_at=excluded.ends_at,cancel_at_period_end=excluded.cancel_at_period_end,provider_observed_at=excluded.provider_observed_at,updated_at=now();
  UPDATE public.profiles SET subscription_status=p_snapshot->>'status',plan_type=p_snapshot->>'plan',subscription_plan=p_snapshot->>'plan',trial_ends_at=(p_snapshot->>'trial_end')::timestamptz,current_period_end=(p_snapshot->>'current_period_end')::timestamptz,dodo_customer_id=cid,dodo_subscription_id=sid,dodo_product_id=p_snapshot->>'product_id',updated_at=now() WHERE id=p_user AND NOT coalesce(upgraded_manually,false);
  IF p_attempt_id IS NOT NULL AND p_snapshot->>'status' IN ('active','trialing') THEN UPDATE public.billing_checkout_attempts SET status='confirmed',subscription_id=sid,updated_at=now() WHERE id=p_attempt_id AND user_id=p_user; END IF;
  IF p_event_id IS NOT NULL THEN INSERT INTO public.billing_webhook_events(event_id,subscription_id) VALUES(p_event_id,sid); END IF;
  RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.apply_dodo_snapshot(uuid,jsonb,timestamptz,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.apply_dodo_snapshot(uuid,jsonb,timestamptz,text,uuid) TO service_role;
