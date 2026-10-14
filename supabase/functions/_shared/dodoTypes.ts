/** Fields consumed from Dodo subscription responses and signed webhook payloads. */
export interface DodoSubscription {
  id?: string;
  subscription_id?: string;
  product_id?: string;
  customer_id?: string;
  customer?: { customer_id?: string; email?: string };
  email?: string;
  status?: string;
  metadata?: { user_id?: string };
  created_at?: string;
  trial_end?: string | null;
  trial_ends_at?: string | null;
  next_billing_date?: string | null;
  renews_at?: string | null;
  cancelled_at?: string | null;
  ends_at?: string | null;
}
