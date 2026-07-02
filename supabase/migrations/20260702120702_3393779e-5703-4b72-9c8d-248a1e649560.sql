ALTER TABLE public.billing_subscriptions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'dodo';

UPDATE public.billing_subscriptions
  SET provider = 'lemonsqueezy'
  WHERE provider = 'dodo' AND (variant_id IS NOT NULL OR subscription_id LIKE '%');
-- Note: This backfill treats any existing rows as legacy LS since Dodo integration
-- was not deployed before this migration.

CREATE INDEX IF NOT EXISTS billing_subscriptions_provider_idx
  ON public.billing_subscriptions (provider);