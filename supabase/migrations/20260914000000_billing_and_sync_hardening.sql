-- Billing webhook delivery deduplication and external event ordering.
CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text,
  provider_event_at timestamptz,
  payload jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.billing_webhook_events FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.billing_webhook_events_id_seq FROM anon, authenticated;

ALTER TABLE public.billing_subscriptions
  ADD COLUMN IF NOT EXISTS provider_event_at timestamptz;

-- Server-side throttling for manual calendar refreshes.
CREATE TABLE IF NOT EXISTS public.economic_sync_requests (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_requested_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.economic_sync_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.economic_sync_requests FROM anon, authenticated;
