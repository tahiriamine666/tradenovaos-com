
DROP FUNCTION IF EXISTS public.get_admin_analytics(integer);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.is_admin(auth.uid()) $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'upgrade_requests_user_id_profiles_fkey') THEN
    ALTER TABLE public.upgrade_requests
      ADD CONSTRAINT upgrade_requests_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_active_users_now()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)) FROM (
      SELECT p.id, p.email, p.display_name,
        COALESCE(p.plan_type,'free') AS plan_type,
        COALESCE(t.cnt,0) AS trades,
        u.last_sign_in_at, p.last_seen_at
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
      LEFT JOIN (SELECT user_id, count(*) AS cnt FROM public.trades GROUP BY user_id) t ON t.user_id = p.id
      WHERE p.last_seen_at >= now() - interval '30 minutes'
      ORDER BY p.last_seen_at DESC
    ) x
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin access required'; END IF;
  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x)) FROM (
      SELECT p.id, p.email, p.display_name,
        COALESCE(p.plan_type,'free') AS plan_type,
        COALESCE(p.subscription_status,'inactive') AS subscription_status,
        p.created_at,
        COALESCE(t.trade_count,0) AS trade_count,
        t.last_trade_at,
        u.last_sign_in_at,
        (p.last_seen_at >= now() - interval '5 minutes') AS is_online
      FROM public.profiles p
      LEFT JOIN auth.users u ON u.id = p.id
      LEFT JOIN (SELECT user_id, count(*) AS trade_count, max(created_at) AS last_trade_at FROM public.trades GROUP BY user_id) t ON t.user_id = p.id
      ORDER BY p.created_at DESC LIMIT 500
    ) x
  ), '[]'::jsonb);
END $$;

CREATE OR REPLACE FUNCTION public.get_admin_analytics(days_back integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE result jsonb; period_start timestamptz := now() - (days_back || ' days')::interval;
  signups jsonb; trades_d jsonb;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Admin access required'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d,'YYYY-MM-DD'), 'count', n) ORDER BY d), '[]'::jsonb)
  INTO signups FROM (SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS n
    FROM public.profiles WHERE created_at >= period_start GROUP BY 1) s;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('date', to_char(d,'YYYY-MM-DD'), 'count', n) ORDER BY d), '[]'::jsonb)
  INTO trades_d FROM (SELECT date_trunc('day', created_at)::date AS d, count(*)::int AS n
    FROM public.trades WHERE created_at >= period_start GROUP BY 1) s;

  SELECT jsonb_build_object(
    'total_users',      (SELECT count(*) FROM public.profiles),
    'new_users',        (SELECT count(*) FROM public.profiles WHERE created_at >= period_start),
    'active_users',     (SELECT count(DISTINCT user_id) FROM public.trades WHERE created_at >= period_start),
    'pro_users',        (SELECT count(*) FROM public.profiles WHERE plan_type='pro'   AND subscription_status IN ('active','trialing')),
    'elite_users',      (SELECT count(*) FROM public.profiles WHERE plan_type='elite' AND subscription_status IN ('active','trialing')),
    'free_users',       (SELECT count(*) FROM public.profiles WHERE plan_type='free' OR plan_type IS NULL OR subscription_status NOT IN ('active','trialing')),
    'mrr',              ((SELECT count(*) FROM public.profiles WHERE plan_type='pro'   AND subscription_status='active') * 14
                       + (SELECT count(*) FROM public.profiles WHERE plan_type='elite' AND subscription_status='active') * 28),
    'total_trades',     (SELECT count(*) FROM public.trades),
    'new_trades',       (SELECT count(*) FROM public.trades WHERE created_at >= period_start),
    'total_journals',   (SELECT count(*) FROM public.journal_entries),
    'new_journals',     (SELECT count(*) FROM public.journal_entries WHERE created_at >= period_start),
    'open_tickets',     (SELECT count(*) FROM public.support_messages WHERE status IN ('open','new') OR status IS NULL),
    'pending_upgrades', (SELECT count(*) FROM public.upgrade_requests WHERE status='pending'),
    'daily_signups',    signups,
    'daily_trades',     trades_d
  ) INTO result;
  RETURN result;
END $$;
