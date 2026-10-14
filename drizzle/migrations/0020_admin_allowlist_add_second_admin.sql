CREATE OR REPLACE FUNCTION public.enforce_admin_allowlist()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_email text;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = NEW.id;
  IF v_email IS NULL OR v_email NOT IN ('tahiria740@gmail.com','tahiriamine889@gmail.com') THEN
    RAISE EXCEPTION 'This account is not on the admin allowlist';
  END IF;
  RETURN NEW;
END;
$function$;