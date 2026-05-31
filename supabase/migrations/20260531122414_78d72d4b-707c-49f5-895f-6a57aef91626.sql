
-- 1. learning_categories
CREATE TABLE public.learning_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  emoji text NOT NULL DEFAULT '📚',
  gradient text NOT NULL DEFAULT 'from-slate-700 to-slate-500',
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.learning_categories TO anon;
GRANT SELECT ON public.learning_categories TO authenticated;
GRANT ALL ON public.learning_categories TO service_role;

ALTER TABLE public.learning_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_categories public read"
  ON public.learning_categories FOR SELECT
  USING (true);

-- 2. lessons new columns
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS key_takeaways text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS quiz_questions jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 3. Leaderboard RPC
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  xp_total integer,
  streak_days integer,
  level integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ls.user_id,
    COALESCE(p.display_name, p.full_name, split_part(p.email, '@', 1), 'Trader') AS display_name,
    ls.xp_total,
    ls.streak_days,
    (floor(ls.xp_total / 500.0)::int + 1) AS level
  FROM public.learning_stats ls
  LEFT JOIN public.profiles p ON p.id = ls.user_id
  ORDER BY ls.xp_total DESC
  LIMIT 20
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated;

-- 4. Seed categories from existing lessons
INSERT INTO public.learning_categories (name, emoji, gradient, order_index)
SELECT DISTINCT category, '📚', 'from-slate-700 to-slate-500', 0
FROM public.lessons
WHERE category IS NOT NULL
ON CONFLICT (name) DO NOTHING;
