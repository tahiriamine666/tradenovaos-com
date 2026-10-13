CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.trading_account_secrets (
  account_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  ciphertext bytea NOT NULL,
  key_version smallint NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.trading_account_secrets FROM anon, authenticated;
GRANT ALL ON public.trading_account_secrets TO service_role;
ALTER TABLE public.trading_account_secrets ENABLE ROW LEVEL SECURITY;

-- Key generated inside the database at migration time; never in source. Private schema, no API access.
CREATE TABLE IF NOT EXISTS tradenova_private.credential_keys (
  version smallint PRIMARY KEY,
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON tradenova_private.credential_keys FROM PUBLIC, anon, authenticated;
INSERT INTO tradenova_private.credential_keys(version, key)
VALUES (1, encode(extensions.gen_random_bytes(32), 'hex')) ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.trading_accounts_vault_password()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_pw text; v_key text;
BEGIN
  v_pw := NULLIF(COALESCE(NULLIF(NEW.password, ''), NEW.credentials->>'password'), '');
  IF v_pw IS NOT NULL THEN
    SELECT key INTO v_key FROM tradenova_private.credential_keys WHERE version = 1;
    IF v_key IS NULL THEN RAISE EXCEPTION 'Credential encryption is not configured'; END IF;
    INSERT INTO public.trading_account_secrets(account_id, user_id, ciphertext, key_version, updated_at)
    VALUES (NEW.id, NEW.user_id, extensions.pgp_sym_encrypt(v_pw, v_key), 1, now())
    ON CONFLICT (account_id) DO UPDATE SET ciphertext = EXCLUDED.ciphertext,
      user_id = EXCLUDED.user_id, key_version = EXCLUDED.key_version, updated_at = now();
  END IF;
  NEW.password := NULL;
  NEW.credentials := COALESCE(NEW.credentials, '{}'::jsonb) - 'password';
  RETURN NEW;
END $$;

CREATE TRIGGER trading_accounts_vault_password_trg
  BEFORE INSERT OR UPDATE OF password, credentials ON public.trading_accounts
  FOR EACH ROW EXECUTE FUNCTION public.trading_accounts_vault_password();

CREATE OR REPLACE FUNCTION public.get_trading_account_password(p_account_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT extensions.pgp_sym_decrypt(s.ciphertext, k.key)
  FROM public.trading_account_secrets s
  JOIN tradenova_private.credential_keys k ON k.version = s.key_version
  WHERE s.account_id = p_account_id
$$;
REVOKE ALL ON FUNCTION public.get_trading_account_password(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_trading_account_password(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.trading_accounts_delete_secret()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN DELETE FROM public.trading_account_secrets WHERE account_id = OLD.id; RETURN OLD; END $$;
CREATE TRIGGER trading_accounts_delete_secret_trg
  AFTER DELETE ON public.trading_accounts FOR EACH ROW EXECUTE FUNCTION public.trading_accounts_delete_secret();

UPDATE public.trading_accounts SET password = password
WHERE COALESCE(password, '') <> '' OR credentials ? 'password';