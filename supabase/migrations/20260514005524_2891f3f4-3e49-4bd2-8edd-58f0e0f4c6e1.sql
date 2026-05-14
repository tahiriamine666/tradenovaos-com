
-- presence column
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamptz;

-- update_last_seen RPC
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles SET last_seen_at = now() WHERE id = auth.uid();
END;
$$;

-- ensure admin row exists for known admin emails
INSERT INTO public.admin_users (id)
SELECT u.id FROM auth.users u
WHERE lower(u.email) IN ('tahiriamine889@gmail.com','tahiria740@gmail.com')
ON CONFLICT (id) DO NOTHING;

-- main analytics RPC
CREATE OR REPLACE FUNCTION public.get_admin_analytics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  period_start timestamptz := now() - (p_days || ' days')::interval;
  growth jsonb;
  trades_chart jsonb;
  top_users jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  -- growth chart: cumulative total users by day in period
  WITH days AS (
    SELECT generate_series(date_trunc('day', period_start), date_trunc('day', now()), interval '1 day')::date AS d
  ),
  per_day AS (
    SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS n
    FROM public.profiles GROUP BY 1
  ),
  cum AS (
    SELECT d.d,
      (SELECT count(*) FROM public.profiles p WHERE p.created_at::date <= d.d)::int AS total_users
    FROM days d
  )
  SELECT jsonb_agg(jsonb_build_object('date', to_char(d, 'Mon DD'), 'total_users', total_users) ORDER BY d)
  INTO growth FROM cum;

  -- trades per day in period
  WITH days AS (
    SELECT generate_series(date_trunc('day', period_start), date_trunc('day', now()), interval '1 day')::date AS d
  ),
  per_day AS (
    SELECT trade_date::date AS d, count(*)::int AS n
    FROM public.trades
    WHERE trade_date >= period_start::date
    GROUP BY 1
  )
  SELECT jsonb_agg(jsonb_build_object('date', to_char(d.d, 'Mon DD'), 'trades', COALESCE(p.n, 0)) ORDER BY d.d)
  INTO trades_chart FROM days d LEFT JOIN per_day p USING (d);

  -- top users w/ trade counts
  SELECT COALESCE(jsonb_agg(row_to_json(x)), '[]'::jsonb)
  INTO top_users
  FROM (
    SELECT
      p.id,
      p.email,
      p.display_name,
      COALESCE(p.plan_type, 'free') AS plan_type,
      COALESCE(p.subscription_status, 'inactive') AS subscription_status,
      p.created_at,
      p.last_seen_at,
      COALESCE(t.total_trade_count, 0) AS total_trade_count,
      COALESCE(tp.period_trade_count, 0) AS period_trade_count
    FROM public.profiles p
    LEFT JOIN (
      SELECT user_id, count(*)::int AS total_trade_count FROM public.trades GROUP BY user_id
    ) t ON t.user_id = p.id
    LEFT JOIN (
      SELECT user_id, count(*)::int AS period_trade_count FROM public.trades
      WHERE created_at >= period_start GROUP BY user_id
    ) tp ON tp.user_id = p.id
    ORDER BY p.created_at DESC
    LIMIT 500
  ) x;

  SELECT jsonb_build_object(
    'total_users',     (SELECT count(*) FROM public.profiles),
    'new_users',       (SELECT count(*) FROM public.profiles WHERE created_at >= period_start),
    'active_traders',  (SELECT count(DISTINCT user_id) FROM public.trades WHERE created_at >= period_start),
    'online_now',      (SELECT count(*) FROM public.profiles WHERE last_seen_at >= now() - interval '5 minutes'),
    'pro_users',       (SELECT count(*) FROM public.profiles WHERE plan_type = 'pro'   AND subscription_status IN ('active','trialing')),
    'elite_users',     (SELECT count(*) FROM public.profiles WHERE plan_type = 'elite' AND subscription_status IN ('active','trialing')),
    'free_users',      (SELECT count(*) FROM public.profiles WHERE plan_type = 'free' OR plan_type IS NULL OR subscription_status NOT IN ('active','trialing')),
    'total_trades',    (SELECT count(*) FROM public.trades),
    'new_trades',      (SELECT count(*) FROM public.trades WHERE created_at >= period_start),
    'mrr',             (
      (SELECT count(*) FROM public.profiles WHERE plan_type = 'pro'   AND subscription_status = 'active') * 14 +
      (SELECT count(*) FROM public.profiles WHERE plan_type = 'elite' AND subscription_status = 'active') * 28
    ),
    'pending_upgrades',(SELECT count(*) FROM public.upgrade_requests WHERE status = 'pending'),
    'open_support',    (SELECT count(*) FROM public.support_messages WHERE status IN ('open','new') OR status IS NULL),
    'growth_chart',    COALESCE(growth, '[]'::jsonb),
    'trades_chart',    COALESCE(trades_chart, '[]'::jsonb),
    'top_users',       COALESCE(top_users, '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
