## Paddle billing integration for TradeNova

### What you DON'T need to do
Lovable's built-in Paddle integration handles all of this for you:
- No Paddle dashboard account, API key, client token, webhook secret, or price IDs to create manually
- No webhook URL to register — Lovable provisions the endpoint automatically
- A test (sandbox) environment is set up instantly so you can run real checkout flows immediately
- Going live later requires Paddle to verify your business (manual review — given your product is a trading journal, expect Paddle to ask questions; approval is not guaranteed but the eligibility check looked clean)

### Step 1 — Enable Paddle Payments
Call `enable_paddle_payments`. This provisions the test environment, the integration secrets, and the webhook handler.

### Step 2 — Database migration
Add columns to `profiles` for Paddle:
- `paddle_customer_id text`
- `paddle_subscription_id text`
- `paddle_price_id text`
- `current_period_end timestamptz`

(Existing columns `plan_type`, `subscription_status`, `trial_ends_at`, `upgraded_at`, `upgraded_manually` already cover the rest. The Paddle integration may also create its own `subscriptions` / `orders` tracking tables — we'll reconcile into `profiles` from the webhook.)

### Step 3 — Create Pro and Elite products in Paddle
Use `batch_create_product` to create:
- **Pro** — recurring monthly, $14, 7-day trial, card required
- **Elite** — recurring monthly, $28, 7-day trial, card required

### Step 4 — Frontend checkout
- Update `PricingPage.tsx` and `PublicPricingPage.tsx` "Start 7-day free trial" buttons for Pro/Elite to open Paddle Checkout overlay (Paddle.js loaded via `client_token`)
- Keep a small secondary "Pay via Payoneer instead" link → opens existing `PayoneerUpgradeModal`
- Pass logged-in user's email + `user_id` as `customData` so the webhook can match the Paddle customer to the Supabase user
- Add loading states, success/error sonner toasts

### Step 5 — Webhook handler (edge function)
Lovable's Paddle integration auto-deploys a webhook handler. We'll customize it to map Paddle events → `profiles` updates:
- `subscription.created` / `subscription.updated` / `subscription.activated` → set `plan_type`, `subscription_status` (`trialing`/`active`/`past_due`/`canceled`), `paddle_customer_id`, `paddle_subscription_id`, `paddle_price_id`, `trial_ends_at`, `current_period_end`
- `subscription.canceled` → set `subscription_status='canceled'`, downgrade to `free` after `current_period_end` passes
- `transaction.completed` → no-op besides logging (subscription event covers state)
- `transaction.payment_failed` → set `subscription_status='past_due'`
- Verifies Paddle webhook signature using built-in secret

### Step 6 — Premium feature gating
Already wired through `usePlan()` + `PlanGate` (`src/hooks/usePlan.tsx`). Update `get_user_plan_info` RPC if needed so `is_pro`/`is_elite` returns true for both `active` and `trialing` statuses (already does). No code changes needed to gates — they automatically follow `profiles.plan_type` + `subscription_status`.

Gated features (already configured): AI Insights, CSV Import, Replay Studio, Advanced Analytics, Playbook Lab, Trade Plan.

### Step 7 — Manage Billing button
Add a "Manage Billing" button in `StudioSettings.tsx`:
- Visible when `paddle_subscription_id` is set
- Calls a new edge function that returns a Paddle customer portal session URL → opens in new tab
- For users upgraded manually via Payoneer (no `paddle_subscription_id`), shows "Contact support" instead

### Step 8 — Success / Cancel routes
Add to `App.tsx`:
- `/billing/success` — confirmation page with "Continue to dashboard" CTA, refreshes `usePlan()` on mount
- `/billing/cancel` — gentle "No charge made" page with link back to /pricing

Both wrapped in `ProtectedApp`.

### Step 9 — Admin manual upgrades stay intact
- `admin_upgrade_by_email` RPC, `admin_extend_trial`, `upgrade_requests` table, `PayoneerUpgradeModal` — all untouched
- Admin panel continues to work for support / Payoneer cases
- A user can have either a Paddle subscription OR a manual upgrade; admin upgrades set `upgraded_manually=true` and don't touch Paddle fields

### What stays untouched
- Supabase auth, profiles RLS, trades, playbooks, journal_entries, dashboard, admin panel, existing pricing layout (only the CTA wiring changes)

### Files that will change
- `supabase/migrations/<new>.sql` — add 4 columns to profiles
- `src/pages/PricingPage.tsx` — Pro/Elite buttons → Paddle Checkout
- `src/pages/marketing/PublicPricingPage.tsx` — same
- `src/App.tsx` — `/billing/success` and `/billing/cancel` routes
- `src/pages/BillingSuccess.tsx`, `src/pages/BillingCancel.tsx` (new)
- `src/pages/StudioSettings.tsx` — Manage Billing button
- `supabase/functions/paddle-webhook/index.ts` — customize event → profile mapping
- `supabase/functions/paddle-portal/index.ts` (new) — returns customer portal URL

### What I need from you
**Nothing manual.** No keys, no price IDs, no webhook URL. After you approve this plan I'll:
1. Run `enable_paddle_payments` (you'll see a one-time setup form for business name/email — Paddle test environment is created)
2. Create the Pro/Elite products
3. Wire up everything above

Approve to proceed.