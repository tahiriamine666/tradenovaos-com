-- Atomic quota enforcement: concurrent requests cannot both pass a stale usage check.
-- Prepared for review only; never applied automatically by this PR.
CREATE OR REPLACE FUNCTION public.consume_nova_credit()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); u jsonb; v_used int; v_limit int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  u := public.get_nova_usage();
  v_limit := COALESCE((u->>'limit')::int, 0);
  IF v_limit <= 0 THEN RETURN u || jsonb_build_object('allowed', false); END IF;
  INSERT INTO public.nova_usage (user_id, period_start, credits_used)
  VALUES (uid, (u->>'period_start')::date, 1)
  ON CONFLICT (user_id, period_start) DO UPDATE
    SET credits_used = nova_usage.credits_used + 1, updated_at = now()
    WHERE nova_usage.credits_used < v_limit
  RETURNING credits_used INTO v_used;
  IF v_used IS NULL THEN
    RETURN public.get_nova_usage() || jsonb_build_object('allowed', false);
  END IF;
  RETURN u || jsonb_build_object('allowed', true, 'used', v_used);
END; $$;
REVOKE ALL ON FUNCTION public.consume_nova_credit() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_nova_credit() TO authenticated, service_role;
