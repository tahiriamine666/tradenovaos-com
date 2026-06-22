ALTER TABLE public.learning_categories ADD COLUMN IF NOT EXISTS is_locked boolean NOT NULL DEFAULT false;
UPDATE public.learning_categories SET is_locked = true WHERE name IN ('Trading Psychology','Prop Firm Strategies','ICT Concepts','Price Action');
UPDATE public.learning_categories SET is_locked = false WHERE name IN ('Risk Management','Fundamentals','SMC','Replay Drills');