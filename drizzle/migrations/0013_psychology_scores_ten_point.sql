ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_confidence_score_check;
ALTER TABLE public.trades DROP CONSTRAINT IF EXISTS trades_stress_score_check;
UPDATE public.trades SET confidence_score = confidence_score * 2 WHERE confidence_score IS NOT NULL AND confidence_score <= 5;
UPDATE public.trades SET stress_score = stress_score * 2 WHERE stress_score IS NOT NULL AND stress_score <= 5;
UPDATE public.trades SET discipline_score = psych_discipline_score * 2 WHERE discipline_score IS NULL AND psych_discipline_score IS NOT NULL;
ALTER TABLE public.trades ADD CONSTRAINT trades_confidence_score_check CHECK (confidence_score BETWEEN 1 AND 10);
ALTER TABLE public.trades ADD CONSTRAINT trades_stress_score_check CHECK (stress_score BETWEEN 1 AND 10);
COMMENT ON COLUMN public.trades.psych_discipline_score IS 'DEPRECATED: replaced by discipline_score (1-10)';