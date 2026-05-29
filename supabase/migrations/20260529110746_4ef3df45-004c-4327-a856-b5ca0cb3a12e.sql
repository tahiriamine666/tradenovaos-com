
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS content text;

CREATE OR REPLACE FUNCTION public.update_learning_streak(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last date;
  v_streak int;
  v_today date := CURRENT_DATE;
BEGIN
  SELECT last_study_date, streak_days INTO v_last, v_streak
  FROM public.learning_stats WHERE user_id = p_user_id;

  IF v_last IS NULL THEN
    v_streak := 1;
  ELSIF v_last = v_today THEN
    v_streak := COALESCE(v_streak, 1);
  ELSIF v_last = v_today - 1 THEN
    v_streak := COALESCE(v_streak, 0) + 1;
  ELSE
    v_streak := 1;
  END IF;

  INSERT INTO public.learning_stats (user_id, streak_days, last_study_date, updated_at)
  VALUES (p_user_id, v_streak, v_today, now())
  ON CONFLICT (user_id) DO UPDATE
    SET streak_days = EXCLUDED.streak_days,
        last_study_date = EXCLUDED.last_study_date,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_learning_streak(uuid) TO authenticated;
