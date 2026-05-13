CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  result jsonb;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;
  SELECT to_jsonb(p.*) || jsonb_build_object('is_admin', public.is_admin(uid), 'stripe_customer_id', NULL)
    INTO result
    FROM public.profiles p
    WHERE p.id = uid;
  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_profile() FROM public;
GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;