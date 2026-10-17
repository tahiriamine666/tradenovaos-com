-- Prepared migration. Generate a migration with the deployment project's CLI,
-- then place this SQL in that generated file. Never run against an inferred ref.
BEGIN;
-- Fail closed rather than overwrite a newer production override implementation.
DO $compat$ BEGIN
  IF (SELECT md5(replace(prosrc, E'\r', '')) FROM pg_proc WHERE oid = to_regprocedure('public.admin_set_plan(uuid,text,timestamptz,text)')) IS DISTINCT FROM 'caecef959f08bac6506fd6f4b77d7794' THEN
    RAISE EXCEPTION 'Canonical admin_set_plan changed: reconcile invitation migration before deployment';
  END IF;
  IF (SELECT md5(replace(prosrc, E'\r', '')) FROM pg_proc WHERE oid = to_regprocedure('public.admin_remove_override(uuid,text)')) IS DISTINCT FROM 'f96b0b603bf0049b1a38091e88d8680a' THEN
    RAISE EXCEPTION 'Canonical admin_remove_override changed: reconcile invitation migration before deployment';
  END IF;
END $compat$;
CREATE SCHEMA IF NOT EXISTS tradenova_private;
REVOKE ALL ON SCHEMA tradenova_private FROM PUBLIC, anon, authenticated;

CREATE TABLE tradenova_private.trader_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL CHECK (email = lower(trim(email)) AND length(email) <= 254),
  plan text NOT NULL CHECK (plan IN ('pro','elite')),
  reason text NOT NULL CHECK (reason IN ('Affiliate','Collaboration','Partnership','Giveaway','Other')),
  notes text CHECK (length(notes) <= 2000),
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','accepted','expired','revoked')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  duration_days integer CHECK (duration_days IN (7,30,90,365)),
  access_expires_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, accepted_at timestamptz,
  grant_applied_at timestamptz,
  last_sent_at timestamptz DEFAULT now(), delivery_error text,
  CHECK (duration_days IS NOT NULL OR access_expires_at IS NOT NULL)
);
CREATE UNIQUE INDEX trader_invitations_open_email ON tradenova_private.trader_invitations(email)
  WHERE status IN ('pending','sent');
ALTER TABLE tradenova_private.trader_invitations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON tradenova_private.trader_invitations FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE tradenova_private.invitation_attempts (
  actor uuid NOT NULL, operation text NOT NULL, attempted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invitation_attempt_actor_time ON tradenova_private.invitation_attempts(actor, attempted_at);
ALTER TABLE tradenova_private.invitation_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON tradenova_private.invitation_attempts FROM PUBLIC, anon, authenticated, service_role;

-- Reuse the canonical, audited admin override operations without changing their
-- bodies or impersonating an administrator through request JWT claims. Original
-- argument names and grants remain intact on the public wrappers. The helper
-- bodies are mechanically copied from 0016 below, replacing auth.uid() only.
CREATE FUNCTION tradenova_private.invitation_set_plan(p_actor uuid, p_user_id uuid, p_plan text, p_expires_at timestamptz DEFAULT NULL, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_old jsonb; v_email text; v_admin_email text; v_action text;
BEGIN
  IF NOT public.is_admin(p_actor) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  IF p_plan NOT IN ('pro','elite') THEN RAISE EXCEPTION 'Invalid plan'; END IF;
  IF p_expires_at IS NOT NULL AND p_expires_at <= now() THEN RAISE EXCEPTION 'Expiration must be in the future'; END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  SELECT email INTO v_admin_email FROM auth.users WHERE id = p_actor;
  v_old := public.plan_info_for(p_user_id);
  v_action := CASE WHEN COALESCE((v_old->>'admin_override')::boolean,false) THEN 'change_override' ELSE 'activate_override' END;
  UPDATE public.profiles SET plan_type = p_plan, subscription_plan = p_plan, subscription_status = 'active',
    trial_ends_at = NULL, upgraded_manually = true, upgraded_at = now(),
    manual_override_expires_at = p_expires_at, updated_at = now()
  WHERE id = p_user_id;
  INSERT INTO public.admin_audit_log (admin_id, admin_email, target_user_id, target_email, action, old_value, new_value, reason)
  VALUES (p_actor, v_admin_email, p_user_id, v_email, v_action,
    jsonb_build_object('plan', v_old->>'plan', 'status', v_old->>'status', 'source', v_old->>'source'),
    jsonb_build_object('plan', p_plan, 'status', 'active', 'source', 'admin_override', 'expires_at', p_expires_at),
    NULLIF(trim(p_reason),''));
  RETURN public.plan_info_for(p_user_id);
END; $$;
REVOKE ALL ON FUNCTION tradenova_private.invitation_set_plan(uuid,uuid,text,timestamptz,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_set_plan(p_user_id uuid, p_plan text, p_expires_at timestamptz DEFAULT NULL, p_reason text DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT tradenova_private.invitation_set_plan(auth.uid(),p_user_id,p_plan,p_expires_at,p_reason); $$;
CREATE FUNCTION tradenova_private.invitation_remove_override(p_actor uuid, p_user_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_old jsonb; v_email text; v_admin_email text; v_bplan text;
BEGIN
  IF NOT public.is_admin(p_actor) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'User not found'; END IF;
  SELECT email INTO v_admin_email FROM auth.users WHERE id = p_actor;
  v_old := public.plan_info_for(p_user_id);
  SELECT plan INTO v_bplan FROM public.billing_subscriptions
    WHERE user_id = p_user_id AND lower(status) IN ('active','trialing','on_trial','past_due','on_hold')
    ORDER BY updated_at DESC LIMIT 1;
  UPDATE public.profiles SET upgraded_manually = false, manual_override_expires_at = NULL,
    plan_type = COALESCE(v_bplan,'free'), subscription_plan = COALESCE(v_bplan,'free'),
    subscription_status = CASE WHEN v_bplan IS NULL THEN 'inactive' ELSE subscription_status END,
    updated_at = now()
  WHERE id = p_user_id;
  INSERT INTO public.admin_audit_log (admin_id, admin_email, target_user_id, target_email, action, old_value, new_value, reason)
  VALUES (p_actor, v_admin_email, p_user_id, v_email, 'remove_override',
    jsonb_build_object('plan', v_old->>'plan', 'status', v_old->>'status', 'source', v_old->>'source'),
    (SELECT jsonb_build_object('plan', x->>'plan', 'status', x->>'status', 'source', x->>'source') FROM (SELECT public.plan_info_for(p_user_id) x) s),
    NULLIF(trim(p_reason),''));
  RETURN public.plan_info_for(p_user_id);
END; $$;
REVOKE ALL ON FUNCTION tradenova_private.invitation_remove_override(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.admin_remove_override(p_user_id uuid, p_reason text DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$ SELECT tradenova_private.invitation_remove_override(auth.uid(),p_user_id,p_reason); $$;

CREATE FUNCTION public.manage_trader_invitation(p_actor uuid, p_action text, p_payload jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v tradenova_private.trader_invitations%ROWTYPE; v_email text; v_days integer; v_end timestamptz;
  v_profile public.profiles%ROWTYPE; v_result jsonb; v_removed boolean := false;
BEGIN
  -- Only the service role has EXECUTE. The Edge Function derives p_actor from
  -- auth.getUser; the admin role is checked again against current DB membership.
  IF p_actor IS NULL OR NOT public.is_admin(p_actor) THEN RETURN jsonb_build_object('error','admin_required'); END IF;
  IF p_action = 'list' THEN
    RETURN jsonb_build_object('invitations', COALESCE((SELECT jsonb_agg(x.item ORDER BY x.created_at DESC) FROM (
      SELECT created_at, (to_jsonb(i) - 'token_hash') || jsonb_build_object('status', CASE
        WHEN status IN ('pending','sent') AND expires_at <= now() THEN 'expired'
        WHEN status = 'accepted' AND access_expires_at <= now() THEN 'expired' ELSE status END) item
      FROM tradenova_private.trader_invitations i
      WHERE (COALESCE(p_payload->>'search','') = '' OR position(lower(left(p_payload->>'search',254)) in email) > 0)
      ORDER BY created_at DESC LIMIT 500
    ) x), '[]'::jsonb));
  END IF;
  IF p_action NOT IN ('create','resend','revoke','delivery') THEN RETURN jsonb_build_object('error','invalid_action'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text, 739));
  IF p_action IN ('create','resend') THEN
    DELETE FROM tradenova_private.invitation_attempts WHERE actor = p_actor AND attempted_at < now() - interval '1 day';
    IF (SELECT count(*) FROM tradenova_private.invitation_attempts WHERE actor = p_actor AND operation = 'send' AND attempted_at > now() - interval '1 hour') >= 30 THEN
      RETURN jsonb_build_object('error','rate_limited');
    END IF;
    INSERT INTO tradenova_private.invitation_attempts(actor,operation) VALUES(p_actor,'send');
    IF COALESCE(p_payload->>'token_hash','') !~ '^[a-f0-9]{64}$' THEN RETURN jsonb_build_object('error','invalid_token'); END IF;
  END IF;
  IF p_action = 'create' THEN
    v_email := lower(trim(p_payload->>'email'));
    IF v_email IS NULL OR length(v_email) > 254 OR v_email !~ '^[^[:space:]@<>]+@[^[:space:]@<>]+\.[^[:space:]@<>]+$'
      OR COALESCE(p_payload->>'plan','') NOT IN ('pro','elite')
      OR COALESCE(p_payload->>'reason','') NOT IN ('Affiliate','Collaboration','Partnership','Giveaway','Other')
      OR length(COALESCE(p_payload->>'notes','')) > 2000 THEN RETURN jsonb_build_object('error','invalid_invitation'); END IF;
    IF p_payload->>'duration_days' IS NOT NULL THEN
      IF p_payload->>'duration_days' NOT IN ('7','30','90','365') THEN RETURN jsonb_build_object('error','invalid_duration'); END IF;
      v_days := (p_payload->>'duration_days')::integer;
    ELSE
      BEGIN v_end := (p_payload->>'access_expires_at')::timestamptz;
      EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN jsonb_build_object('error','invalid_expiration'); END;
      IF v_end IS NULL OR v_end <= now() OR v_end > now() + interval '5 years' THEN RETURN jsonb_build_object('error','invalid_expiration'); END IF;
    END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(v_email, 740));
    UPDATE tradenova_private.trader_invitations SET status = 'expired' WHERE email = v_email AND status IN ('pending','sent') AND expires_at <= now();
    IF EXISTS(SELECT 1 FROM tradenova_private.trader_invitations WHERE email = v_email AND
      (status IN ('pending','sent') OR (status = 'accepted' AND access_expires_at > now()))) THEN RETURN jsonb_build_object('error','invitation_already_exists'); END IF;
    INSERT INTO tradenova_private.trader_invitations(email,plan,reason,notes,token_hash,created_by,expires_at,duration_days,access_expires_at)
      VALUES(v_email,p_payload->>'plan',p_payload->>'reason',NULLIF(trim(p_payload->>'notes'),''),p_payload->>'token_hash',p_actor,
        LEAST(now() + interval '7 days', COALESCE(v_end, now() + interval '7 days')),v_days,v_end) RETURNING * INTO v;
  ELSE
    BEGIN SELECT * INTO v FROM tradenova_private.trader_invitations WHERE id = (p_payload->>'id')::uuid FOR UPDATE;
    EXCEPTION WHEN invalid_text_representation THEN RETURN jsonb_build_object('error','invitation_not_found'); END;
    IF v.id IS NULL THEN RETURN jsonb_build_object('error','invitation_not_found'); END IF;
    IF p_action = 'resend' THEN
      IF v.status NOT IN ('pending','sent') OR v.expires_at <= now() THEN RETURN jsonb_build_object('error','invitation_not_resendable'); END IF;
      IF v.last_sent_at > now() - interval '5 minutes' THEN RETURN jsonb_build_object('error','resend_cooldown'); END IF;
      -- Resend rotates the token, never extends the original expiry.
      UPDATE tradenova_private.trader_invitations SET token_hash = p_payload->>'token_hash', status = 'pending',
        last_sent_at = now(), delivery_error = NULL WHERE id = v.id RETURNING * INTO v;
    ELSIF p_action = 'delivery' THEN
      UPDATE tradenova_private.trader_invitations SET status = CASE WHEN p_payload->>'sent' = 'true' THEN 'sent' ELSE 'pending' END,
        last_sent_at = now(), delivery_error = CASE WHEN p_payload->>'sent' = 'true' THEN NULL ELSE 'delivery_unconfirmed_resend_available' END
        WHERE id = v.id AND token_hash = p_payload->>'token_hash' AND status IN ('pending','sent');
      RETURN jsonb_build_object('ok', FOUND);
    ELSIF p_action = 'revoke' THEN
      IF v.status = 'revoked' THEN RETURN jsonb_build_object('ok',true); END IF;
      IF v.accepted_by IS NOT NULL THEN
        SELECT * INTO v_profile FROM public.profiles WHERE id = v.accepted_by FOR UPDATE;
        -- Do not revoke a later independent manual grant, even of the same plan.
        IF v_profile.upgraded_manually AND v_profile.upgraded_at = v.grant_applied_at
          AND v_profile.plan_type = v.plan AND v_profile.manual_override_expires_at = v.access_expires_at THEN
          PERFORM tradenova_private.invitation_remove_override(p_actor, v.accepted_by, 'Invitation revoked');
          v_removed := true;
        END IF;
      END IF;
      UPDATE tradenova_private.trader_invitations SET status = 'revoked' WHERE id = v.id RETURNING * INTO v;
    END IF;
  END IF;
  INSERT INTO public.admin_audit_log(admin_id,target_user_id,target_email,action,new_value,reason)
    VALUES(p_actor,v.accepted_by,v.email,'invitation_' || p_action,
      jsonb_build_object('invitation_id',v.id,'plan',v.plan,'access_expires_at',v.access_expires_at,'override_removed',v_removed),v.reason);
  RETURN jsonb_build_object('invitation',to_jsonb(v) - 'token_hash');
END; $$;
REVOKE ALL ON FUNCTION public.manage_trader_invitation(uuid,text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.manage_trader_invitation(uuid,text,jsonb) TO service_role;

CREATE FUNCTION public.redeem_trader_invitation(p_user_id uuid, p_token_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v tradenova_private.trader_invitations%ROWTYPE; v_email text; v_confirmed timestamptz;
  v_profile public.profiles%ROWTYPE; v_current jsonb; v_end timestamptz;
BEGIN
  IF p_user_id IS NULL OR COALESCE(p_token_hash,'') !~ '^[a-f0-9]{64}$' THEN RETURN jsonb_build_object('error','invalid_invitation'); END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_user_id::text,739));
  DELETE FROM tradenova_private.invitation_attempts WHERE actor = p_user_id AND attempted_at < now() - interval '1 day';
  IF (SELECT count(*) FROM tradenova_private.invitation_attempts WHERE actor = p_user_id AND operation = 'redeem' AND attempted_at > now() - interval '1 hour') >= 20 THEN RETURN jsonb_build_object('error','rate_limited'); END IF;
  INSERT INTO tradenova_private.invitation_attempts(actor,operation) VALUES(p_user_id,'redeem');
  SELECT lower(trim(email)), email_confirmed_at INTO v_email,v_confirmed FROM auth.users WHERE id = p_user_id;
  IF v_confirmed IS NULL THEN RETURN jsonb_build_object('error','verified_email_required'); END IF;
  SELECT * INTO v FROM tradenova_private.trader_invitations WHERE token_hash = p_token_hash FOR UPDATE;
  IF v.id IS NULL THEN RETURN jsonb_build_object('error','invalid_invitation'); END IF;
  IF v.email IS DISTINCT FROM v_email THEN RETURN jsonb_build_object('error','invited_email_required'); END IF;
  -- Idempotent retry by the same recipient, without extending or re-granting.
  IF v.status = 'accepted' AND v.accepted_by = p_user_id THEN RETURN jsonb_build_object('accepted',true,'already_accepted',true); END IF;
  IF v.status NOT IN ('pending','sent') OR v.expires_at <= now() THEN RETURN jsonb_build_object('error','invitation_expired_or_used'); END IF;
  IF v.created_by IS NULL OR NOT public.is_admin(v.created_by) THEN RETURN jsonb_build_object('error','issuer_no_longer_authorized'); END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('error','profile_not_ready'); END IF;
  -- Match migration 0021's billing/override serialization before checking paid
  -- access, so a concurrent Dodo activation cannot slip between check and grant.
  -- Profile first preserves the existing admin UPDATE lock order.
  PERFORM pg_advisory_xact_lock(hashtextextended('plan-welcome:' || p_user_id::text, 0));
  v_current := public.plan_info_for(p_user_id);
  -- Existing accounts are supported, but never replace an independent active
  -- override, paid subscription, or internal entitlement automatically.
  IF EXISTS (SELECT 1 FROM public.billing_subscriptions WHERE user_id = p_user_id
      AND lower(status) IN ('active','trialing','on_trial','past_due','on_hold'))
    OR (v_profile.upgraded_manually AND (v_profile.manual_override_expires_at IS NULL OR v_profile.manual_override_expires_at > now()))
    OR (COALESCE(v_current->>'source','none') <> 'none' AND NOT COALESCE((v_current->>'is_free')::boolean,true)) THEN
    RETURN jsonb_build_object('error','existing_access_requires_admin_review');
  END IF;
  v_end := COALESCE(v.access_expires_at, now() + make_interval(days => v.duration_days));
  IF v_end <= now() THEN RETURN jsonb_build_object('error','invitation_expired_or_used'); END IF;
  PERFORM tradenova_private.invitation_set_plan(v.created_by,p_user_id,v.plan,v_end,'Invitation accepted: ' || v.reason);
  UPDATE tradenova_private.trader_invitations SET status = 'accepted', accepted_by = p_user_id,
    accepted_at = now(), grant_applied_at = now(), access_expires_at = v_end WHERE id = v.id;
  INSERT INTO public.admin_audit_log(admin_id,target_user_id,target_email,action,new_value,reason)
    VALUES(v.created_by,p_user_id,v.email,'invitation_accepted',jsonb_build_object('invitation_id',v.id,'plan',v.plan,'expires_at',v_end),v.reason);
  RETURN jsonb_build_object('accepted',true,'expires_at',v_end);
END; $$;
REVOKE ALL ON FUNCTION public.redeem_trader_invitation(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.redeem_trader_invitation(uuid,text) TO service_role;
COMMIT;
