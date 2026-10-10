-- Requires the deployed 0016 admin/plan_info_for implementation (and 0020).
-- No backfill: existing users receive nothing merely because this is installed.
DO $$ BEGIN
  IF to_regprocedure('public.plan_info_for(uuid)') IS NULL
     OR to_regclass('public.admin_audit_log') IS NULL THEN
    RAISE EXCEPTION 'Install/sync the deployed admin and entitlement migrations through 0020 first';
  END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS tradenova_private;
REVOKE ALL ON SCHEMA tradenova_private FROM PUBLIC, anon, authenticated;

-- Remember even verified events that did not activate access. A retry after an
-- intervening change must not send another email.
CREATE TABLE tradenova_private.plan_welcome_dodo_events (
  event_id text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON tradenova_private.plan_welcome_dodo_events FROM PUBLIC, anon, authenticated;

CREATE TABLE tradenova_private.plan_welcome_before (
  user_id uuid PRIMARY KEY,
  transaction_id bigint NOT NULL,
  plan text
);
REVOKE ALL ON tradenova_private.plan_welcome_before FROM PUBLIC, anon, authenticated;

CREATE TABLE public.plan_welcome_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activation_no bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('pro', 'elite')),
  source text NOT NULL,
  source_event_id text,
  activation_transaction_id bigint NOT NULL DEFAULT txid_current(),
  recipient text NOT NULL,
  first_name text NOT NULL CHECK (length(first_name) BETWEEN 1 AND 100),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','sent','failed','manual_review','skipped')),
  attempts integer NOT NULL DEFAULT 0,
  first_attempt_at timestamptz,
  next_attempt_at timestamptz DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz,
  resend_id text,
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.plan_welcome_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_welcome_emails FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.plan_welcome_emails_activation_no_seq FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.plan_welcome_emails TO service_role;
CREATE UNIQUE INDEX plan_welcome_source_event_unique
  ON public.plan_welcome_emails(source, source_event_id, plan) WHERE source_event_id IS NOT NULL;
CREATE INDEX plan_welcome_user_idx ON public.plan_welcome_emails(user_id, activation_no DESC);
CREATE INDEX plan_welcome_pending_idx ON public.plan_welcome_emails(next_attempt_at, activation_no)
  WHERE status IN ('pending','processing','failed');

-- Uses the same authoritative entitlement function as the application, including
-- override precedence and trial expiry. Internal access is not a paid activation.
CREATE FUNCTION tradenova_private.welcome_plan(p_info jsonb)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT CASE WHEN p_info->>'source' <> 'internal' AND
    (COALESCE((p_info->>'is_pro')::boolean, false) OR COALESCE((p_info->>'is_elite')::boolean, false))
    THEN p_info->>'plan' ELSE NULL END
$$;
REVOKE ALL ON FUNCTION tradenova_private.welcome_plan(jsonb) FROM PUBLIC, anon, authenticated;

-- Capture before AND after the mutation rather than trusting a webhook status or
-- stale admin audit old_value. A per-user transaction lock serializes both paths.
-- This also handles same-plan override renewals and clock-expired overrides.
CREATE FUNCTION tradenova_private.observe_plan_welcome()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_uid uuid;
  v_before text;
  v_info jsonb;
  v_after text;
  v_profile jsonb;
  v_email text;
  v_name text;
BEGIN
  IF TG_TABLE_NAME = 'profiles' THEN v_uid := NEW.id;
  ELSIF TG_OP = 'DELETE' THEN v_uid := OLD.user_id;
  ELSE v_uid := NEW.user_id; END IF;
  IF TG_WHEN = 'BEFORE' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('plan-welcome:' || v_uid::text, 0));
    v_info := public.plan_info_for(v_uid);
    INSERT INTO tradenova_private.plan_welcome_before(user_id, transaction_id, plan)
    VALUES (v_uid, txid_current(), tradenova_private.welcome_plan(v_info))
    ON CONFLICT (user_id) DO UPDATE SET transaction_id = EXCLUDED.transaction_id, plan = EXCLUDED.plan;
  ELSE
    DELETE FROM tradenova_private.plan_welcome_before
      WHERE user_id = v_uid AND transaction_id = txid_current() RETURNING plan INTO v_before;
    IF NOT FOUND THEN
      RAISE WARNING 'plan_welcome_capture_missing';
      RETURN NULL;
    END IF;
    v_info := public.plan_info_for(v_uid);
    v_after := tradenova_private.welcome_plan(v_info);
    IF v_after IS NOT NULL AND v_after IS DISTINCT FROM v_before
      AND COALESCE(current_setting('tradenova.welcome_suppress', true), '') <> 'true' THEN
      SELECT to_jsonb(p) INTO v_profile FROM public.profiles p WHERE p.id = v_uid;
      SELECT email INTO v_email FROM auth.users WHERE id = v_uid;
      v_name := COALESCE(NULLIF(btrim(regexp_replace(v_profile->>'display_name', '\s+', ' ', 'g')), ''),
                         NULLIF(btrim(regexp_replace(v_profile->>'full_name', '\s+', ' ', 'g')), ''));
      v_name := CASE WHEN v_name IS NOT NULL THEN (regexp_split_to_array(v_name, '\s+'))[1]
                    ELSE COALESCE(NULLIF(split_part(v_email, '@', 1), ''), 'Trader') END;
      INSERT INTO public.plan_welcome_emails(user_id, plan, source, source_event_id, recipient, first_name, status, error)
      VALUES (v_uid, v_after, COALESCE(v_info->>'source', 'billing'),
              CASE WHEN v_info->>'source' = 'dodo' THEN NULLIF(current_setting('tradenova.welcome_event_id', true), '') END,
              COALESCE(v_email, ''), left(v_name, 100),
              CASE WHEN v_email IS NULL OR btrim(v_email) = '' THEN 'failed' ELSE 'pending' END,
              CASE WHEN v_email IS NULL OR btrim(v_email) = '' THEN 'missing_recipient' ELSE NULL END);
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
EXCEPTION WHEN OTHERS THEN
  -- No network calls in this transaction; even an outbox fault must not revoke
  -- paid access. Alert on this code; never print SQLERRM, user IDs or addresses.
  RAISE WARNING 'plan_welcome_observer_failed (%)', SQLSTATE;
  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;
REVOKE ALL ON FUNCTION tradenova_private.observe_plan_welcome() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER plan_welcome_billing_before
BEFORE INSERT OR UPDATE OR DELETE ON public.billing_subscriptions
FOR EACH ROW EXECUTE FUNCTION tradenova_private.observe_plan_welcome();
CREATE TRIGGER plan_welcome_billing_after
AFTER INSERT OR UPDATE OR DELETE ON public.billing_subscriptions
FOR EACH ROW EXECUTE FUNCTION tradenova_private.observe_plan_welcome();
CREATE TRIGGER plan_welcome_profile_before
BEFORE INSERT OR UPDATE OF plan_type, subscription_status, trial_ends_at, upgraded_manually, manual_override_expires_at
ON public.profiles FOR EACH ROW EXECUTE FUNCTION tradenova_private.observe_plan_welcome();
CREATE TRIGGER plan_welcome_profile_after
AFTER INSERT OR UPDATE OF plan_type, subscription_status, trial_ends_at, upgraded_manually, manual_override_expires_at
ON public.profiles FOR EACH ROW EXECUTE FUNCTION tradenova_private.observe_plan_welcome();

-- Attach the existing secure admin audit ID within the same transaction. No
-- replacement of admin_set_plan, authorization, overrides, or audit logic.
CREATE FUNCTION tradenova_private.link_welcome_admin_audit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.action IN ('activate_override','change_override') THEN
    UPDATE public.plan_welcome_emails SET source_event_id = NEW.id::text
    WHERE id = (
      SELECT id FROM public.plan_welcome_emails
      WHERE user_id = NEW.target_user_id AND plan = NEW.new_value->>'plan'
        AND source = 'admin_override' AND source_event_id IS NULL
        AND activation_transaction_id = txid_current()
      ORDER BY activation_no DESC LIMIT 1
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'plan_welcome_audit_link_failed (%)', SQLSTATE;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION tradenova_private.link_welcome_admin_audit() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER plan_welcome_admin_audit AFTER INSERT ON public.admin_audit_log
FOR EACH ROW EXECUTE FUNCTION tradenova_private.link_welcome_admin_audit();

-- Claim one job at a time. SKIP LOCKED + a lease token permit concurrent workers
-- without overlapping sends; Resend's stable key covers crash/timeout retries.
CREATE FUNCTION public.claim_plan_welcome_email()
RETURNS SETOF public.plan_welcome_emails LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_job public.plan_welcome_emails%ROWTYPE;
BEGIN
  -- Resend remembers keys for 24 hours. Stop conservatively at 23 hours rather
  -- than risk sending twice after an ambiguous response or lost acknowledgement.
  UPDATE public.plan_welcome_emails SET status = 'manual_review', error = 'idempotency_window_expired',
    lease_token = NULL, lease_until = NULL, next_attempt_at = NULL
  WHERE status IN ('pending','processing','failed') AND first_attempt_at <= now() - interval '23 hours'
    AND (lease_until IS NULL OR lease_until < now());
  LOOP
    SELECT * INTO v_job FROM public.plan_welcome_emails
    WHERE ((status IN ('pending','failed') AND next_attempt_at <= now())
           OR (status = 'processing' AND lease_until < now()))
      AND (first_attempt_at IS NULL OR first_attempt_at > now() - interval '23 hours')
    ORDER BY activation_no FOR UPDATE SKIP LOCKED LIMIT 1;
    IF NOT FOUND THEN RETURN; END IF;
    -- Pending historical activations must not announce superseded/canceled access.
    -- Already attempted jobs still reconcile through the same idempotency key.
    IF v_job.first_attempt_at IS NULL AND (
      tradenova_private.welcome_plan(public.plan_info_for(v_job.user_id)) IS DISTINCT FROM v_job.plan
      OR EXISTS (SELECT 1 FROM public.plan_welcome_emails e
                 WHERE e.user_id = v_job.user_id AND e.activation_no > v_job.activation_no)
    ) THEN
      UPDATE public.plan_welcome_emails SET status = 'skipped', error = 'activation_superseded', next_attempt_at = NULL
      WHERE id = v_job.id;
      CONTINUE;
    END IF;
    RETURN QUERY UPDATE public.plan_welcome_emails
      SET status = 'processing', attempts = attempts + 1,
          first_attempt_at = COALESCE(first_attempt_at, now()),
          lease_token = gen_random_uuid(), lease_until = now() + interval '2 minutes', next_attempt_at = NULL
      WHERE id = v_job.id RETURNING *;
    RETURN;
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_plan_welcome_email() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_plan_welcome_email() TO service_role;

CREATE FUNCTION public.finish_plan_welcome_email(
  p_id uuid, p_lease_token uuid, p_sent_id text, p_error text, p_retryable boolean
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.plan_welcome_emails SET
    status = CASE WHEN p_sent_id IS NOT NULL THEN 'sent' ELSE 'failed' END,
    resend_id = p_sent_id,
    sent_at = CASE WHEN p_sent_id IS NOT NULL THEN now() ELSE NULL END,
    error = CASE WHEN p_sent_id IS NOT NULL THEN NULL
                 WHEN p_error ~ '^[a-z0-9_]{1,80}$' THEN p_error ELSE 'send_failed' END,
    next_attempt_at = CASE WHEN p_sent_id IS NULL AND p_retryable
      THEN now() + make_interval(secs => LEAST(3600, 30 * power(2, LEAST(attempts, 7)))::integer)
      ELSE NULL END,
    lease_token = NULL, lease_until = NULL
  WHERE id = p_id AND status = 'processing' AND lease_token = p_lease_token;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_plan_welcome_email(uuid, uuid, text, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_plan_welcome_email(uuid, uuid, text, text, boolean) TO service_role;

-- Service-only wrapper around the existing canonical writes. HMAC validation
-- stays in dodo-webhook. The receipt and billing write commit atomically.
CREATE FUNCTION public.apply_dodo_welcome_billing_event(
  p_event_id text, p_user_id uuid, p_subscription jsonb, p_status_only boolean DEFAULT false
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_first boolean;
BEGIN
  IF p_event_id IS NULL OR length(p_event_id) NOT BETWEEN 1 AND 512 THEN
    RAISE EXCEPTION 'Verified webhook event ID required';
  END IF;
  INSERT INTO tradenova_private.plan_welcome_dodo_events(event_id) VALUES (p_event_id)
    ON CONFLICT DO NOTHING;
  v_first := FOUND;
  PERFORM set_config('tradenova.welcome_event_id', p_event_id, true);
  PERFORM set_config('tradenova.welcome_suppress', (NOT v_first)::text, true);
  IF p_status_only THEN
    UPDATE public.billing_subscriptions SET status = p_subscription->>'status',
      updated_at = (p_subscription->>'updated_at')::timestamptz
    WHERE user_id = p_user_id AND subscription_id = p_subscription->>'subscription_id';
    IF NOT FOUND THEN RAISE EXCEPTION 'Subscription record required'; END IF;
  ELSE
    INSERT INTO public.billing_subscriptions(user_id, provider, customer_id, subscription_id, variant_id,
      plan, status, trial_ends_at, renews_at, ends_at, updated_at)
    VALUES (p_user_id, 'dodo', p_subscription->>'customer_id', p_subscription->>'subscription_id',
      p_subscription->>'variant_id', p_subscription->>'plan', p_subscription->>'status',
      (p_subscription->>'trial_ends_at')::timestamptz, (p_subscription->>'renews_at')::timestamptz,
      (p_subscription->>'ends_at')::timestamptz, (p_subscription->>'updated_at')::timestamptz)
    ON CONFLICT (user_id) DO UPDATE SET provider = EXCLUDED.provider, customer_id = EXCLUDED.customer_id,
      subscription_id = EXCLUDED.subscription_id, variant_id = EXCLUDED.variant_id, plan = EXCLUDED.plan,
      status = EXCLUDED.status, trial_ends_at = EXCLUDED.trial_ends_at, renews_at = EXCLUDED.renews_at,
      ends_at = EXCLUDED.ends_at, updated_at = EXCLUDED.updated_at;
  END IF;
  PERFORM set_config('tradenova.welcome_event_id', '', true);
  PERFORM set_config('tradenova.welcome_suppress', '', true);
END;
$$;
REVOKE ALL ON FUNCTION public.apply_dodo_welcome_billing_event(text, uuid, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_dodo_welcome_billing_event(text, uuid, jsonb, boolean) TO service_role;
