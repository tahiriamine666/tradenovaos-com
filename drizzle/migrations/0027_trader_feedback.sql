CREATE TABLE public.trader_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  email text NOT NULL,
  trading_category text,
  rating smallint,
  message text NOT NULL,
  message_hash text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  submitted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT trader_feedback_status_chk CHECK (status IN ('pending','approved','rejected')),
  CONSTRAINT trader_feedback_rating_chk CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  CONSTRAINT trader_feedback_name_chk CHECK (char_length(display_name) BETWEEN 1 AND 60),
  CONSTRAINT trader_feedback_msg_chk CHECK (char_length(message) BETWEEN 20 AND 1000),
  CONSTRAINT trader_feedback_cat_chk CHECK (trading_category IS NULL OR char_length(trading_category) <= 60),
  CONSTRAINT trader_feedback_unique_msg UNIQUE (email, message_hash)
);
CREATE INDEX trader_feedback_email_created_idx ON public.trader_feedback (email, created_at DESC);
GRANT SELECT, UPDATE, DELETE ON public.trader_feedback TO authenticated;
GRANT ALL ON public.trader_feedback TO service_role;
ALTER TABLE public.trader_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read feedback" ON public.trader_feedback FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY "Admins moderate feedback" ON public.trader_feedback FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins delete feedback" ON public.trader_feedback FOR DELETE TO authenticated USING (public.is_admin());

CREATE OR REPLACE FUNCTION public.submit_trader_feedback(p_display_name text, p_email text, p_trading_category text, p_rating integer, p_message text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_email text := lower(trim(coalesce(p_email,'')));
  v_name text := trim(coalesce(p_display_name,''));
  v_msg text := trim(coalesce(p_message,''));
  v_cat text := nullif(trim(coalesce(p_trading_category,'')),'');
  v_hash text;
BEGIN
  IF char_length(v_name) NOT BETWEEN 1 AND 60 THEN RETURN jsonb_build_object('ok',false,'error','invalid_name'); END IF;
  IF char_length(v_email) > 255 OR v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN RETURN jsonb_build_object('ok',false,'error','invalid_email'); END IF;
  IF char_length(v_msg) NOT BETWEEN 20 AND 1000 THEN RETURN jsonb_build_object('ok',false,'error','invalid_message'); END IF;
  IF v_cat IS NOT NULL AND char_length(v_cat) > 60 THEN RETURN jsonb_build_object('ok',false,'error','invalid_category'); END IF;
  IF p_rating IS NOT NULL AND p_rating NOT BETWEEN 1 AND 5 THEN RETURN jsonb_build_object('ok',false,'error','invalid_rating'); END IF;
  v_hash := md5(lower(regexp_replace(v_msg,'\s+',' ','g')));
  IF EXISTS (SELECT 1 FROM trader_feedback WHERE email = v_email AND message_hash = v_hash) THEN
    RETURN jsonb_build_object('ok',false,'error','duplicate'); END IF;
  IF (SELECT count(*) FROM trader_feedback WHERE email = v_email AND created_at > now() - interval '24 hours') >= 2 THEN
    RETURN jsonb_build_object('ok',false,'error','rate_limited'); END IF;
  IF (SELECT count(*) FROM trader_feedback WHERE created_at > now() - interval '1 minute') >= 20 THEN
    RETURN jsonb_build_object('ok',false,'error','rate_limited'); END IF;
  INSERT INTO trader_feedback(display_name,email,trading_category,rating,message,message_hash,submitted_by)
  VALUES (v_name,v_email,v_cat,p_rating::smallint,v_msg,v_hash,auth.uid());
  RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.submit_trader_feedback(text,text,text,integer,text) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_trader_feedback(text,text,text,integer,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_approved_trader_feedback()
RETURNS TABLE(id uuid, display_name text, trading_category text, rating smallint, message text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, display_name, trading_category, rating, message, created_at FROM trader_feedback
  WHERE status = 'approved' ORDER BY created_at DESC LIMIT 30
$$;
REVOKE ALL ON FUNCTION public.get_approved_trader_feedback() FROM public;
GRANT EXECUTE ON FUNCTION public.get_approved_trader_feedback() TO anon, authenticated;