-- lessons (public catalog)
CREATE TABLE public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  subcategory text,
  difficulty text NOT NULL DEFAULT 'beginner',
  read_time_min integer NOT NULL DEFAULT 10,
  tags text[] NOT NULL DEFAULT '{}',
  xp_reward integer NOT NULL DEFAULT 50,
  order_index integer NOT NULL DEFAULT 0,
  is_premium boolean NOT NULL DEFAULT false,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lessons TO anon;
GRANT SELECT ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons public read" ON public.lessons
  FOR SELECT USING (true);

-- lesson_progress (per user)
CREATE TABLE public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL,
  progress_pct integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  saved boolean NOT NULL DEFAULT false,
  notes text,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, lesson_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own lp select" ON public.lesson_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own lp insert" ON public.lesson_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own lp update" ON public.lesson_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own lp delete" ON public.lesson_progress FOR DELETE USING (auth.uid() = user_id);

-- learning_stats (per user, 1 row)
CREATE TABLE public.learning_stats (
  user_id uuid PRIMARY KEY,
  xp_total integer NOT NULL DEFAULT 0,
  streak_days integer NOT NULL DEFAULT 0,
  hours_studied numeric NOT NULL DEFAULT 0,
  current_focus text,
  last_study_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_stats TO authenticated;
GRANT ALL ON public.learning_stats TO service_role;

ALTER TABLE public.learning_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own ls select" ON public.learning_stats FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own ls insert" ON public.learning_stats FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ls update" ON public.learning_stats FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own ls delete" ON public.learning_stats FOR DELETE USING (auth.uid() = user_id);

-- Seed lessons
INSERT INTO public.lessons (slug, title, description, category, subcategory, difficulty, read_time_min, tags, xp_reward, order_index, is_premium) VALUES
('ict-liquidity-concepts', 'ICT Liquidity Concepts', 'Understand liquidity pools, sweeps, and how institutions hunt liquidity.', 'ICT Concepts', 'Liquidity', 'beginner', 15, ARRAY['ICT','Concept','Beginner'], 50, 1, false),
('ict-order-blocks-advanced', 'ICT Order Blocks Advanced', 'Deep dive into order blocks, mitigation, and high probability setups.', 'ICT Concepts', 'Order Blocks', 'advanced', 20, ARRAY['ICT','Order Blocks','Advanced'], 100, 2, true),
('ict-fvg-mastery', 'Fair Value Gaps (FVG) Mastery', 'How to find, validate and trade FVGs like a professional.', 'ICT Concepts', 'FVG', 'intermediate', 18, ARRAY['ICT','FVG','Intermediate'], 75, 3, false),
('ict-models-2022', 'ICT 2022 Model Breakdown', 'Step by step walkthrough of the ICT 2022 mentorship model.', 'ICT Concepts', 'Models', 'advanced', 25, ARRAY['ICT','Model','Advanced'], 120, 4, true),
('smc-market-structure', 'Market Structure & Breaks', 'Learn how to identify BOS, CHOCH, and market structure shifts.', 'SMC', 'Market Structure', 'beginner', 14, ARRAY['SMC','Structure','Beginner'], 50, 1, false),
('smc-order-flow', 'Smart Money Order Flow', 'Read order flow like institutions and front-run retail traders.', 'SMC', 'Order Flow', 'intermediate', 16, ARRAY['SMC','Flow','Intermediate'], 80, 2, false),
('smc-premium-discount', 'Premium & Discount Zones', 'Use premium and discount arrays to time your entries.', 'SMC', 'Zones', 'intermediate', 12, ARRAY['SMC','PD Array'], 70, 3, true),
('pa-candlestick-patterns', 'Candlestick Pattern Cheatsheet', 'The 12 candlestick patterns that actually have an edge.', 'Price Action', 'Candlesticks', 'beginner', 10, ARRAY['PA','Candlesticks','Beginner'], 40, 1, false),
('pa-support-resistance', 'Support & Resistance Like a Pro', 'Draw levels that actually matter, not the ones everyone draws.', 'Price Action', 'S&R', 'beginner', 12, ARRAY['PA','S&R','Beginner'], 50, 2, false),
('pa-trend-trading', 'Trend Trading Framework', 'Identify, ride, and exit trends with a repeatable framework.', 'Price Action', 'Trends', 'intermediate', 18, ARRAY['PA','Trend','Intermediate'], 80, 3, false),
('fund-cpi-trading', 'Trading CPI Releases', 'How to prepare, position, and react to CPI prints.', 'Fundamentals', 'Macro', 'intermediate', 14, ARRAY['News','CPI','Macro'], 70, 1, false),
('fund-nfp-playbook', 'NFP Playbook', 'A complete playbook for trading Non-Farm Payrolls safely.', 'Fundamentals', 'News', 'intermediate', 15, ARRAY['News','NFP'], 75, 2, true),
('fund-fomc-strategy', 'FOMC Day Strategy', 'Survive and profit from Fed meeting days.', 'Fundamentals', 'FOMC', 'advanced', 20, ARRAY['News','FOMC','Advanced'], 100, 3, true),
('fund-correlations', 'Inter-Market Correlations', 'How DXY, yields and indices move FX and commodities.', 'Fundamentals', 'Macro', 'intermediate', 16, ARRAY['Macro','Correlation'], 80, 4, false),
('risk-position-sizing', 'Position Sizing Fundamentals', 'Master position sizing, R:R, and capital preservation.', 'Risk Management', 'Sizing', 'beginner', 12, ARRAY['Risk','Mindset','Beginner'], 50, 1, false),
('risk-drawdown-rules', 'Drawdown Recovery Rules', 'Stop digging when you''re in a hole — a survival guide.', 'Risk Management', 'Drawdown', 'intermediate', 14, ARRAY['Risk','Drawdown'], 70, 2, false),
('risk-prop-firm-rules', 'Risk Model for Funded Challenges', 'A risk model that keeps you compliant and profitable.', 'Risk Management', 'Funded', 'advanced', 18, ARRAY['Risk','Funded','Advanced'], 100, 3, true),
('psych-discipline', 'Building Trading Discipline', 'Replace willpower with systems that enforce discipline.', 'Trading Psychology', 'Discipline', 'beginner', 12, ARRAY['Psychology','Mindset'], 50, 1, false),
('psych-fomo', 'Beating FOMO Forever', 'Why you chase trades and how to stop in 14 days.', 'Trading Psychology', 'Emotions', 'beginner', 10, ARRAY['Psychology','FOMO'], 50, 2, false),
('psych-consistency', 'The Consistency Blueprint', 'The 7 patterns that destroy consistency and how to fix them.', 'Trading Psychology', 'Consistency', 'intermediate', 16, ARRAY['Psychology','Consistency'], 80, 3, false),
('prop-ftmo-challenge', 'Pass the FTMO Challenge', 'A 30-day plan to pass the FTMO 2-step challenge.', 'Prop Firm Strategies', 'FTMO', 'intermediate', 22, ARRAY['Prop','FTMO'], 110, 1, true),
('prop-scaling-plan', 'Scaling a Funded Account', 'Go from $25k to $400k without blowing up.', 'Prop Firm Strategies', 'Scaling', 'advanced', 20, ARRAY['Prop','Scaling','Advanced'], 100, 2, true),
('drill-breakout-replay', 'Breakout Replay Drill', 'A 10-day replay drill to sharpen your breakout entries.', 'Replay Drills', 'Breakouts', 'beginner', 8, ARRAY['Drill','Breakouts'], 40, 1, false),
('drill-entry-timing', 'Entry Timing Drill', 'Practice candle-close entries until they become automatic.', 'Replay Drills', 'Entries', 'intermediate', 10, ARRAY['Drill','Entries'], 60, 2, false),
('drill-exit-management', 'Exit Management Drill', 'Partial profits at 1R, runner to target — drilled 20 times.', 'Replay Drills', 'Exits', 'intermediate', 10, ARRAY['Drill','Exits'], 60, 3, false);