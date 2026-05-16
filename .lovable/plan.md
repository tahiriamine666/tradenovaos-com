## Paddle BYOK integration for TradeNova

### ⚠️ First: rotate the leaked key
The `pdl_live_apikey_01krp3jqq...` you pasted in chat is now compromised. Revoke it in Paddle → Developer Tools → Authentication → API keys → Revoke. Generate a new one. I'll request it through a secure secrets form — never paste it back in chat.

### What you'll need to create in Paddle

You need to set these up in your Paddle dashboard **before** I can finish wiring things:

**1. API key** (server-side)
- Paddle → Developer Tools → Authentication → API keys → New API key
- Permissions: Read + Write for `transactions`, `subscriptions`, `customers`, `prices`, `products`
- Copy the key (starts with `pdl_live_apikey_...` or `pdl_sdbx_apikey_...`)

**2. Client-side token** (publishable, used by Paddle.js in the browser)
- Paddle → Developer Tools → Authentication → Client-side tokens → New
- Copy (starts with `live_...` or `test_...`)

**3. Two products with prices**
- Paddle → Catalog → Products → Create
  - **Pro** — recurring monthly, $14 USD, 7-day free trial (card required upfront)
  - **Elite** — recurring monthly, $28 USD, 7-day free trial (card required upfront)
- Copy the **price IDs** for each (start with `pri_...`) — not the product IDs

**4. Webhook destination**
- Paddle → Developer Tools → Notifications → New destination
- URL: `https://jbdivofznclkfctcqfln.supabase.co/functions/v1/paddle-webhook`
- Subscribe to these events:
  - `subscription.created`
  - `subscription.activated`
  - `subscription.updated`
  - `subscription.canceled`
  - `subscription.paused`
  - `subscription.resumed`
  - `transaction.completed`
  - `transaction.payment_failed`
- Copy the **secret key** (starts with `pdl_ntfset_...` or similar) — used to verify webhook signatures

**5. Environment** — tell me whether you're using `sandbox` or `production`. (Your pasted key was `live`, so I'll assume production unless you say otherwise.)

### Secrets I'll store after you give them to me
Via the secure secrets form:
- `PADDLE_API_KEY`
- `PADDLE_WEBHOOK_SECRET`
- `PADDLE_PRO_PRICE_ID`
- `PADDLE_ELITE_PRICE_ID`
- `PADDLE_ENVIRONMENT` (`sandbox` or `production`)

The client-side token is public — I'll add it to `.env` as `VITE_PADDLE_CLIENT_TOKEN` and `VITE_PADDLE_ENVIRONMENT`.

### Step-by-step build

**Step 1 — Database migration**
Add to `profiles`:
- `paddle_customer_id text`
- `paddle_subscription_id text`
- `paddle_price_id text`
- `current_period_end timestamptz`

**Step 2 — Frontend checkout (Paddle.js overlay)**
- Add Paddle.js loader hook `src/lib/paddle.ts` — initializes with client token + environment
- Update `PricingPage.tsx` Pro/Elite buttons → call `Paddle.Checkout.open({ items: [{ priceId, quantity: 1 }], customer: { email }, customData: { user_id }, settings: { successUrl: '/billing/success' } })`
- Pass `customData.user_id` so webhook can match the Paddle customer back to the Supabase user
- Keep a small "Pay via Payoneer instead" link → opens existing `PayoneerUpgradeModal`
- Loading state, success/error sonner toasts
- Same wiring in `PublicPricingPage.tsx` (logged-out users get redirected to signup first, then back to pricing)

**Step 3 — Webhook handler** `supabase/functions/paddle-webhook/index.ts`
- `verify_jwt = false` in `config.toml`
- Verify Paddle signature using `PADDLE_WEBHOOK_SECRET` (HMAC SHA-256 of the raw body, format `ts=...;h1=...`)
- Use service-role Supabase client to update `profiles`
- Event handling:
  - `subscription.created` / `activated` / `updated` → determine plan by matching `items[0].price.id` against `PADDLE_PRO_PRICE_ID` / `PADDLE_ELITE_PRICE_ID`; set `plan_type`, `subscription_status` (`trialing` / `active` / `past_due`), `paddle_customer_id`, `paddle_subscription_id`, `paddle_price_id`, `trial_ends_at`, `current_period_end`
  - `subscription.canceled` → `subscription_status='canceled'` (kept active until period end; cron not needed since `current_period_end` gates access)
  - `subscription.paused` → `subscription_status='past_due'`
  - `subscription.resumed` → re-activate
  - `transaction.payment_failed` → `subscription_status='past_due'`
  - `transaction.completed` → log only
- Match user by `customData.user_id` first, fall back to `paddle_customer_id`, fall back to email

**Step 4 — Premium gating (no changes needed)**
`usePlan()` + `PlanGate` already reads `plan_type` + `subscription_status` from `profiles`. Gated features (AI Insights, CSV Import, Replay Studio, Advanced Analytics, Playbook Lab, Trade Plan) follow automatically.

Tiny update to `get_user_plan_info` RPC: also expose `current_period_end` so the frontend can show "Cancels on Mar 14".

**Step 5 — Manage Billing button**
- New edge function `paddle-portal` — calls Paddle API `POST /customers/{paddle_customer_id}/portal-sessions` with `PADDLE_API_KEY`, returns the `general.overview` URL
- Add "Manage Billing" button in `StudioSettings.tsx`:
  - Visible when `profiles.paddle_subscription_id` is set
  - Opens portal URL in new tab
  - For Payoneer-upgraded users, shows "Contact support" instead

**Step 6 — Success / Cancel routes**
- `/billing/success` — confirmation page, refreshes `usePlan()` on mount, "Continue to dashboard" CTA
- `/billing/cancel` — "No charge made" page with link back to /pricing
- Both wrapped in `ProtectedApp` and added to `App.tsx`

**Step 7 — Admin manual upgrades stay intact**
Untouched: `admin_upgrade_by_email`, `admin_extend_trial`, `upgrade_requests`, `PayoneerUpgradeModal`. Admin upgrades set `upgraded_manually=true` and leave Paddle fields null.

### Files that will change
- `supabase/migrations/<new>.sql` — 4 columns on profiles + tiny `get_user_plan_info` patch
- `supabase/functions/paddle-webhook/index.ts` (new)
- `supabase/functions/paddle-portal/index.ts` (new)
- `supabase/config.toml` — `verify_jwt = false` for paddle-webhook
- `src/lib/paddle.ts` (new) — Paddle.js loader + checkout helper
- `src/pages/PricingPage.tsx` — buttons → Paddle Checkout
- `src/pages/marketing/PublicPricingPage.tsx` — same (with signup redirect for logged-out)
- `src/pages/BillingSuccess.tsx`, `src/pages/BillingCancel.tsx` (new)
- `src/pages/StudioSettings.tsx` — Manage Billing button
- `src/App.tsx` — `/billing/success` and `/billing/cancel` routes

### What stays untouched
Supabase auth, profiles RLS, trades, playbooks, journal_entries, dashboard, admin panel, existing pricing layout (CTAs only).

### Execution order
1. You: revoke the leaked key, create new API key + client token + 2 products + webhook destination in Paddle, copy the 4 IDs/secrets
2. Me: run the DB migration
3. You: paste secrets into the secure form I'll send
4. Me: build everything, deploy edge functions
5. You: test a checkout in your own browser (use a real card — Paddle live mode; or switch to sandbox first if you prefer)

Approve and I'll start with the migration + secrets form.