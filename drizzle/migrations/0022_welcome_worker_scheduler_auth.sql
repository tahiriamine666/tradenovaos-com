CREATE TABLE IF NOT EXISTS tradenova_private.welcome_worker_nonces (
  token_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
REVOKE ALL ON tradenova_private.welcome_worker_nonces FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_welcome_worker_nonce(p_token text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN RETURN false; END IF;
  DELETE FROM tradenova_private.welcome_worker_nonces WHERE expires_at < now();
  DELETE FROM tradenova_private.welcome_worker_nonces
    WHERE token_hash = encode(extensions.digest(p_token,'sha256'),'hex') AND expires_at >= now();
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.consume_welcome_worker_nonce(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_welcome_worker_nonce(text) TO service_role;

CREATE OR REPLACE FUNCTION tradenova_private.invoke_welcome_worker()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_token text := encode(extensions.gen_random_bytes(32),'hex'); v_id bigint;
BEGIN
  -- Only wake the worker when there is queued work.
  IF NOT EXISTS (SELECT 1 FROM public.plan_welcome_emails
    WHERE (status IN ('pending','failed') AND next_attempt_at <= now())
       OR (status = 'processing' AND lease_until < now())) THEN RETURN NULL; END IF;
  INSERT INTO tradenova_private.welcome_worker_nonces VALUES
    (encode(extensions.digest(v_token,'sha256'),'hex'), now() + interval '2 minutes');
  SELECT net.http_post(
    url := 'https://jbdivofznclkfctcqfln.supabase.co/functions/v1/send-plan-welcome',
    headers := jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiZGl2b2Z6bmNsa2ZjdGNxZmxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3MjU1OTAsImV4cCI6MjA5MzMwMTU5MH0.vEyBYGITXFHp3YNyvs5Zzifh9DkR6lrjjJ_we4fIgps',
      'x-welcome-worker-nonce', v_token),
    body := '{}'::jsonb, timeout_milliseconds := 20000) INTO v_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION tradenova_private.invoke_welcome_worker() FROM PUBLIC, anon, authenticated;