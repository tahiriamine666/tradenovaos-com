
-- Remove all existing admins
DELETE FROM public.admin_users;

-- Re-add only tahiria740@gmail.com (look up via auth.users since profiles.email may be null)
INSERT INTO public.admin_users (id)
SELECT u.id FROM auth.users u
WHERE lower(u.email) = 'tahiria740@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- Safeguard trigger: only the allow-listed email may be inserted into admin_users
CREATE OR REPLACE FUNCTION public.enforce_admin_allowlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_email text;
BEGIN
  SELECT lower(email) INTO v_email FROM auth.users WHERE id = NEW.id;
  IF v_email IS DISTINCT FROM 'tahiria740@gmail.com' THEN
    RAISE EXCEPTION 'Only tahiria740@gmail.com may be granted admin access';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_admin_allowlist_trg ON public.admin_users;
CREATE TRIGGER enforce_admin_allowlist_trg
BEFORE INSERT OR UPDATE ON public.admin_users
FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_allowlist();
