
CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT jsonb_build_object(
    'total_users',        (SELECT count(*) FROM public.profiles),
    'pro_users',          (SELECT count(*) FROM public.profiles WHERE plan_type = 'pro'),
    'elite_users',        (SELECT count(*) FROM public.profiles WHERE plan_type = 'elite'),
    'free_users',         (SELECT count(*) FROM public.profiles WHERE plan_type = 'free' OR plan_type IS NULL),
    'total_trades',       (SELECT count(*) FROM public.trades),
    'total_journals',     (SELECT count(*) FROM public.journal_entries),
    'total_playbooks',    (SELECT count(*) FROM public.playbooks),
    'total_support_msgs', (SELECT count(*) FROM public.support_messages),
    'open_support_msgs',  (SELECT count(*) FROM public.support_messages WHERE status = 'open' OR status IS NULL),
    'pending_upgrades',   (SELECT count(*) FROM public.upgrade_requests WHERE status = 'pending'),
    'users_this_month',   (SELECT count(*) FROM public.profiles WHERE created_at >= date_trunc('month', now())),
    'trades_this_month',  (SELECT count(*) FROM public.trades WHERE created_at >= date_trunc('month', now())),
    'mrr_estimate',       (
      (SELECT count(*) FROM public.profiles WHERE plan_type = 'pro'   AND subscription_status = 'active') * 29 +
      (SELECT count(*) FROM public.profiles WHERE plan_type = 'elite' AND subscription_status = 'active') * 79
    )
  ) INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(x))
    FROM (
      SELECT
        p.id,
        p.email,
        p.display_name,
        COALESCE(p.plan_type, 'free')          AS plan_type,
        COALESCE(p.subscription_status, 'inactive') AS subscription_status,
        p.created_at,
        COALESCE(t.trade_count, 0)             AS trade_count,
        t.last_trade_at
      FROM public.profiles p
      LEFT JOIN (
        SELECT user_id, count(*) AS trade_count, max(created_at) AS last_trade_at
        FROM public.trades GROUP BY user_id
      ) t ON t.user_id = p.id
      ORDER BY p.created_at DESC
      LIMIT 500
    ) x
  ), '[]'::jsonb);
END;
$$;
