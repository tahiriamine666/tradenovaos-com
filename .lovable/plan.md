# Migrate from Paddle to Lemon Squeezy

Full removal of Paddle and a clean Lemon Squeezy integration using hosted checkout, with a dedicated `billing_subscriptions` table as the source of truth, webhook-driven sync, and a real Billing page.

## 1. Remove Paddle

Delete:
- `src/lib/paddle.ts`
- `supabase/functions/paddle-config/`
- `supabase/functions/paddle-portal/`
- `supabase/functions/paddle-sync-subscription/`
- `supabase/functions/paddle-webhook/`
- Paddle function blocks in `supabase/config.toml`

Strip Paddle code from:
- `src/pages/Pricing.tsx` — remove Paddle imports + price IDs, replace checkout call
- `src/pages/PricingPage.tsx` — same (or delete this file if unused; keep `Pricing.tsx` as the live route)
- `src/pages/BillingSuccess.tsx` — remove `paddle-sync-subscription` fallback (replaced by webhook + on-demand `ls-sync-subscription`)
- `src/pages/StudioSettings.tsx` — replace `openPaddlePortal` with Lemon Squeezy customer portal link from the new billing row
- `supabase/functions/admin-manage-subscription/index.ts` — drop Paddle field writes

Secrets to delete after migration: `PADDLE_CLIENT_TOKEN`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_PRO_PRICE_ID`, `PADDLE_ELITE_PRICE_ID`, `PADDLE_ENVIRONMENT`.

Paddle columns on `profiles` (`paddle_subscription_id`, `paddle_customer_id`, `paddle_price_id`) are left in place but ignored — dropping them touches unrelated admin/migration history. Call out in the response so the user can request a cleanup migration later.

## 2. Database

New migration creating `public.billing_subscriptions` (source of truth, written only by webhook/service role):

- `user_id uuid` (FK → `auth.users`, unique)
- `customer_id text`
- `subscription_id text unique`
- `variant_id text`
- `plan text` (`free` | `pro` | `elite`)
- `status text` (`on_trial` | `active` | `past_due` | `paused` | `cancelled` | `expired`)
- `trial_ends_at timestamptz`
- `renews_at timestamptz`
- `ends_at timestamptz`
- `update_payment_method_url text`
- `customer_portal_url text`
- `created_at`, `updated_at` + trigger

RLS: users can `SELECT` their own row; only `service_role` writes. GRANT `SELECT` to `authenticated`, `ALL` to `service_role`.

Update `public.get_user_plan_info()` and `public.community_user_tier()` to read from `billing_subscriptions` first (fall back to existing profile fields so admin manual upgrades keep working). Plan is considered active when `status IN ('on_trial','active')` and (for trial) `trial_ends_at > now()`.

## 3. Edge functions (Lemon Squeezy)

- `supabase/functions/ls-checkout/index.ts` — auth required; takes `{ plan: 'pro' | 'elite' }`, calls Lemon Squeezy `POST /v1/checkouts` with the matching variant (Pro 1825642, Elite 1825635), 7-day trial, `checkout_data.email`, `custom: { user_id }`, returns `{ url }`.
- `supabase/functions/ls-webhook/index.ts` — `verify_jwt = false`. Verifies `X-Signature` HMAC-SHA256 with `LEMON_SQUEEZY_WEBHOOK_SECRET`. Handles `order_created`, `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_payment_failed`. Upserts `billing_subscriptions` keyed by `user_id` from `meta.custom_data.user_id` (fallback: email lookup on `profiles`). Mirrors `plan_type` / `subscription_status` / `trial_ends_at` / `current_period_end` back onto `profiles` so existing gates and `prevent_profile_billing_self_update` trigger continue to work (service role bypasses the trigger).
- `supabase/functions/ls-sync-subscription/index.ts` — auth required. Reads the user's most recent subscription via Lemon Squeezy API (filter by email/customer) and upserts the row. Used by `/billing/success` as a fallback if the webhook hasn't fired yet.
- `supabase/functions/ls-portal/index.ts` — auth required. Returns the `customer_portal_url` from `billing_subscriptions` (Lemon Squeezy provides it on the subscription object; we persist it in the webhook).

Add `[functions.ls-webhook] verify_jwt = false` to `supabase/config.toml`.

## 4. Frontend

`src/lib/lemonsqueezy.ts` — thin client:
- `startCheckout(plan)` → invokes `ls-checkout`, then `window.location.href = url` (hosted checkout; no JS SDK needed).
- `openCustomerPortal()` → invokes `ls-portal`, opens returned URL in a new tab.

`src/pages/Pricing.tsx`:
- Replace `openPaddleCheckout` with `startCheckout`.
- Keep existing TradeNova design, purple accent, light/dark, monthly/yearly toggle UI (yearly will be wired later when variants exist — for now, monthly only; hide or disable yearly toggle to avoid fake pricing).
- Three tiers: Free / Pro $14 / Elite $28, button "Start 7-Day Free Trial".

`src/pages/BillingSuccess.tsx`:
- Poll `billing_subscriptions` for the current user; if absent after ~5s, call `ls-sync-subscription`, then re-poll.

`src/pages/Billing.tsx` (new) at route `/billing`:
- Current Plan, Status badge, Trial End, Next Billing Date
- Buttons: Upgrade Plan (→ `/pricing`), Manage Subscription (→ `ls-portal`), Cancel Subscription (→ `ls-portal`, since Lemon Squeezy cancels via the portal)
- All data sourced from `billing_subscriptions` + `get_user_plan_info()`; no trust in client-side flags.

Wire route in `src/App.tsx` and link from `StudioSettings.tsx` (replacing the Paddle portal button).

## 5. Access control

`src/hooks/usePlan.tsx` already centralizes gating. Update `FEATURE_PLANS` to match the spec:

```
trade_plan, trade_vault, mind_journal, edge_analytics,
replay, learning_hub, community         → ['pro','elite']
ai_unlimited, elite_tools               → ['elite']
```

`isPro` / `isElite` continue to derive from `get_user_plan_info()`, which now reads from `billing_subscriptions`. No frontend-only trust.

## 6. Secrets

Already configured per the user: `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_WEBHOOK_SECRET`. We'll also need `LEMON_SQUEEZY_STORE_ID` (required by the checkout API) — if missing, request it via `add_secret`.

After the user points their Lemon Squeezy webhook at `https://<project>.functions.supabase.co/ls-webhook`, events will flow.

## Technical details

- Lemon Squeezy webhook signature: `crypto.createHmac('sha256', secret).update(rawBody).digest('hex')` compared in constant time to `X-Signature` header.
- Variant → plan map lives in the webhook + checkout function (`1825642 → pro`, `1825635 → elite`).
- Hosted checkout URL is returned by `POST /v1/checkouts`; we redirect with `window.location.href`. No client SDK or script tag needed → simpler than Paddle.
- `billing_subscriptions` is the single source of truth; `profiles` mirror columns stay for back-compat with existing RPCs and admin tools.
- Trial: pass `trial_ends_at` via `checkout_options` / variant trial setting; Lemon Squeezy's product-level 7-day trial is the cleanest path — confirm the variants in Lemon Squeezy are configured with a 7-day trial, otherwise we add `trial_ends_at` in the checkout payload.

## Out of scope (mentioned, not done)

- Dropping Paddle columns from `profiles` (left for a follow-up cleanup migration).
- Yearly pricing (no yearly variant IDs provided).
