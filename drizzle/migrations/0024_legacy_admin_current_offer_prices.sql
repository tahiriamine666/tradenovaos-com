-- Update only legacy current-offer estimates; no subscription or user rows are written.
-- CREATE OR REPLACE preserves signatures, ownership, grants and existing admin checks.
DO $migration$
DECLARE
  v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.get_admin_analytics(integer)'::regprocedure) INTO v_definition;
  IF position('* 14' IN v_definition) = 0 OR position('* 28' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected legacy analytics price definition';
  END IF;
  v_definition := replace(replace(v_definition, '* 14', '* 5.99'), '* 28', '* 9.99');
  EXECUTE v_definition;

  SELECT pg_get_functiondef('public.get_admin_stats()'::regprocedure) INTO v_definition;
  IF position('* 29' IN v_definition) = 0 OR position('* 79' IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected legacy stats price definition';
  END IF;
  v_definition := replace(replace(v_definition, '* 29', '* 5.99'), '* 79', '* 9.99');
  EXECUTE v_definition;
END;
$migration$;
COMMENT ON FUNCTION public.get_admin_analytics(integer) IS 'Legacy admin analytics: mrr is a current monthly offer-price estimate, not collected revenue or historical subscription amounts. Existing subscriptions are not repriced.';
COMMENT ON FUNCTION public.get_admin_stats() IS 'Legacy admin stats: mrr_estimate is a current monthly offer-price estimate, not collected revenue or historical subscription amounts. Existing subscriptions are not repriced.';