CREATE OR REPLACE FUNCTION public.get_user_plan_info(p_user_id uuid DEFAULT auth.uid())
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_internal boolean := false;
  v_sub public.subscriptions%rowtype;
  v_profile public.profiles%rowtype;
  v_eff text := null;
  v_trial boolean := false;
  v_active boolean := false;
  v_limit integer := 0;
  v_used integer := 0;
begin
  if v_uid is null or p_user_id is distinct from v_uid then
    raise exception 'access denied' using errcode='42501';
  end if;

  v_internal := v_email = any(array[
    'tahiriamine889@gmail.com',
    'tahiria740@gmail.com',
    'tradenova111@gmail.com'
  ]);

  select * into v_profile from public.profiles where id=v_uid;
  select * into v_sub
  from public.subscriptions
  where user_id=v_uid
  order by updated_at desc nulls last, created_at desc
  limit 1;

  if v_internal then
    v_eff := 'elite';
    v_active := true;
  elsif found then
    v_trial := lower(coalesce(v_sub.status,''))='trialing'
      and lower(coalesce(v_sub.plan,'')) in ('pro','elite')
      and (v_sub.trial_end is not null and v_sub.trial_end > now());

    v_active := lower(coalesce(v_sub.status,''))='active'
      and lower(coalesce(v_sub.plan,'')) in ('pro','elite')
      and (v_sub.current_period_end is not null and v_sub.current_period_end > now());

    if v_trial or v_active then
      v_eff := lower(v_sub.plan);
    end if;
  end if;

  v_limit := case v_eff when 'elite' then 1000 when 'pro' then 500 else 0 end;
  v_used := least(coalesce(v_profile.ai_credits_used,0), v_limit);

  return jsonb_build_object(
    'plan', v_eff,
    'effective_plan', v_eff,
    'status', case when v_internal then 'active' else coalesce(v_sub.status,'inactive') end,
    'is_trial', case when v_internal then false else v_trial end,
    'is_trial_active', case when v_internal then false else v_trial end,
    'trial_ends_at', case when v_internal then null else v_sub.trial_end end,
    'period_ends_at', case when v_internal then null else v_sub.current_period_end end,
    'is_active', v_eff is not null,
    'is_pro', v_eff in ('pro','elite'),
    'is_elite', v_eff='elite',
    'ai_credits_limit', v_limit,
    'ai_credits_used', v_used,
    'ai_credits_remaining', greatest(0,v_limit-v_used),
    'features', jsonb_build_object(
      'dashboard', v_eff in ('pro','elite'),
      'trade_journal', v_eff in ('pro','elite'),
      'trade_logs', v_eff in ('pro','elite'),
      'trading_calendar', v_eff in ('pro','elite'),
      'analytics', v_eff in ('pro','elite'),
      'advanced_analytics', v_eff in ('pro','elite'),
      'trade_plan', v_eff in ('pro','elite'),
      'economic_calendar', v_eff in ('pro','elite'),
      'nova_ai', v_eff in ('pro','elite'),
      'max_connected_accounts', case when v_eff='elite' then -1 when v_eff='pro' then 1 else 0 end,
      'ai_credits', v_limit,
      'priority_support', v_eff='elite'
    )
  );
end $function$;

CREATE OR REPLACE FUNCTION public.get_access_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt()->>'email',''));
  v_onboarding public.onboarding_profiles%rowtype;
  v_sub public.subscriptions%rowtype;
  v_internal boolean := false;
  v_onboarding_completed boolean := false;
  v_has_access boolean := false;
  v_step integer := 1;
  v_info jsonb;
begin
  if v_uid is null then
    return jsonb_build_object(
      'authenticated', false,
      'internal', false,
      'onboarding_completed', false,
      'onboarding_step', 1,
      'selected_plan', null,
      'selected_billing', null,
      'plan', null,
      'billing_status', null,
      'has_access', false,
      'trial_ends_at', null,
      'trial_end', null
    );
  end if;

  v_internal := v_email = any(array[
    'tahiriamine889@gmail.com',
    'tahiria740@gmail.com',
    'tradenova111@gmail.com'
  ]);

  select * into v_onboarding
  from public.onboarding_profiles
  where user_id = v_uid
  limit 1;

  if found then
    v_onboarding_completed := coalesce(v_onboarding.completed,false);
    v_step := coalesce(v_onboarding.current_step,1);
  end if;

  select * into v_sub
  from public.subscriptions
  where user_id = v_uid
  order by updated_at desc nulls last, created_at desc
  limit 1;

  v_info := public.get_user_plan_info(v_uid);
  v_has_access := v_internal or (v_onboarding_completed and coalesce((v_info->>'is_active')::boolean,false));

  return jsonb_build_object(
    'authenticated', true,
    'internal', v_internal,
    'onboarding_completed', case when v_internal then true else v_onboarding_completed end,
    'onboarding_step', v_step,
    'selected_plan', v_onboarding.selected_plan,
    'selected_billing', v_onboarding.selected_billing,
    'plan', case when v_internal then coalesce(nullif(v_sub.plan,''),'elite') else v_sub.plan end,
    'billing_status', case when v_internal then coalesce(v_sub.status,'active') else v_sub.status end,
    'has_access', v_has_access,
    'trial_ends_at', v_sub.trial_end,
    'trial_end', v_sub.trial_end
  );
end $function$;
