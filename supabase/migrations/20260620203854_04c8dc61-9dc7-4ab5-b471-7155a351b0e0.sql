
-- 1. drill_config column on lessons
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS drill_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 2. academy_drill_attempts
CREATE TABLE IF NOT EXISTS public.academy_drill_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  scenario_id text NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  dimension_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0,
  max_score integer NOT NULL DEFAULT 100,
  passed boolean NOT NULL DEFAULT false,
  duration_sec integer NOT NULL DEFAULT 0,
  xp_awarded integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_drill_attempts TO authenticated;
GRANT ALL ON public.academy_drill_attempts TO service_role;
ALTER TABLE public.academy_drill_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own drill attempts" ON public.academy_drill_attempts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS academy_drill_attempts_user_lesson_idx
  ON public.academy_drill_attempts(user_id, lesson_id, submitted_at DESC);

-- 3. academy_drill_scores rollup
CREATE TABLE IF NOT EXISTS public.academy_drill_scores (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  attempts integer NOT NULL DEFAULT 0,
  best_score integer NOT NULL DEFAULT 0,
  last_score integer NOT NULL DEFAULT 0,
  avg_score numeric(6,2) NOT NULL DEFAULT 0,
  weakest_dimension text,
  strongest_dimension text,
  total_time_sec integer NOT NULL DEFAULT 0,
  first_attempt_passed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_drill_scores TO authenticated;
GRANT ALL ON public.academy_drill_scores TO service_role;
ALTER TABLE public.academy_drill_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own drill scores" ON public.academy_drill_scores
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. academy_drill_progress per scenario
CREATE TABLE IF NOT EXISTS public.academy_drill_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  scenario_id text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  best_score integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id, scenario_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_drill_progress TO authenticated;
GRANT ALL ON public.academy_drill_progress TO service_role;
ALTER TABLE public.academy_drill_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own drill progress" ON public.academy_drill_progress
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. academy_drill_ai_reviews
CREATE TABLE IF NOT EXISTS public.academy_drill_ai_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  attempt_id uuid REFERENCES public.academy_drill_attempts(id) ON DELETE SET NULL,
  mode text NOT NULL,
  prompt text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_drill_ai_reviews TO authenticated;
GRANT ALL ON public.academy_drill_ai_reviews TO service_role;
ALTER TABLE public.academy_drill_ai_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own drill ai reviews" ON public.academy_drill_ai_reviews
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Rollup trigger: recompute academy_drill_scores after each attempt
CREATE OR REPLACE FUNCTION public.academy_drill_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempts int;
  v_best int;
  v_avg numeric;
  v_total_time int;
  v_first_pass boolean;
  v_weak text;
  v_strong text;
BEGIN
  SELECT count(*), max(score), avg(score), sum(duration_sec)
    INTO v_attempts, v_best, v_avg, v_total_time
    FROM public.academy_drill_attempts
    WHERE user_id = NEW.user_id AND lesson_id = NEW.lesson_id;

  SELECT passed INTO v_first_pass
    FROM public.academy_drill_attempts
    WHERE user_id = NEW.user_id AND lesson_id = NEW.lesson_id
    ORDER BY submitted_at ASC LIMIT 1;

  WITH dims AS (
    SELECT key AS dim, avg((value)::numeric) AS sc
    FROM public.academy_drill_attempts a,
         jsonb_each_text(a.dimension_scores)
    WHERE a.user_id = NEW.user_id AND a.lesson_id = NEW.lesson_id
    GROUP BY key
  )
  SELECT
    (SELECT dim FROM dims ORDER BY sc ASC  LIMIT 1),
    (SELECT dim FROM dims ORDER BY sc DESC LIMIT 1)
    INTO v_weak, v_strong;

  INSERT INTO public.academy_drill_scores AS s
    (user_id, lesson_id, attempts, best_score, last_score, avg_score,
     weakest_dimension, strongest_dimension, total_time_sec,
     first_attempt_passed, updated_at)
  VALUES
    (NEW.user_id, NEW.lesson_id, v_attempts, COALESCE(v_best,0), NEW.score,
     COALESCE(v_avg,0), v_weak, v_strong, COALESCE(v_total_time,0),
     COALESCE(v_first_pass,false), now())
  ON CONFLICT (user_id, lesson_id) DO UPDATE SET
    attempts = EXCLUDED.attempts,
    best_score = EXCLUDED.best_score,
    last_score = EXCLUDED.last_score,
    avg_score = EXCLUDED.avg_score,
    weakest_dimension = EXCLUDED.weakest_dimension,
    strongest_dimension = EXCLUDED.strongest_dimension,
    total_time_sec = EXCLUDED.total_time_sec,
    first_attempt_passed = EXCLUDED.first_attempt_passed,
    updated_at = now();

  INSERT INTO public.academy_drill_progress AS p
    (user_id, lesson_id, scenario_id, completed, best_score, attempts, last_attempt_at)
  VALUES
    (NEW.user_id, NEW.lesson_id, NEW.scenario_id, NEW.passed, NEW.score, 1, now())
  ON CONFLICT (user_id, lesson_id, scenario_id) DO UPDATE SET
    completed = p.completed OR NEW.passed,
    best_score = GREATEST(p.best_score, NEW.score),
    attempts = p.attempts + 1,
    last_attempt_at = now();

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS academy_drill_rollup_trg ON public.academy_drill_attempts;
CREATE TRIGGER academy_drill_rollup_trg
AFTER INSERT ON public.academy_drill_attempts
FOR EACH ROW EXECUTE FUNCTION public.academy_drill_rollup();

-- 7. award_drill_xp RPC — single authoritative XP path
CREATE OR REPLACE FUNCTION public.award_drill_xp(
  p_lesson_id uuid,
  p_score int,
  p_passed boolean,
  p_first_attempt_success boolean
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  delta int := 0;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  delta := 50; -- completing
  IF p_passed THEN delta := delta + 100; END IF;
  IF p_score >= 90 THEN delta := delta + 50; END IF;
  IF p_first_attempt_success THEN delta := delta + 25; END IF;

  INSERT INTO public.learning_stats (user_id, xp_total, updated_at)
    VALUES (uid, delta, now())
  ON CONFLICT (user_id) DO UPDATE
    SET xp_total = public.learning_stats.xp_total + delta,
        updated_at = now();

  RETURN delta;
END $$;

REVOKE ALL ON FUNCTION public.award_drill_xp(uuid,int,boolean,boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.award_drill_xp(uuid,int,boolean,boolean) TO authenticated;
