
## Goal
Fully replace the existing Lemon Squeezy integration with Dodo Payments as the sole subscription provider. Keep plan structure and prices:
- Pro Monthly $14 / Pro Yearly $132
- Elite Monthly $28 / Elite Yearly $264

## Secrets to add
- `DODO_API_KEY` — server-side Dodo API key
- `DODO_WEBHOOK_SECRET` — signing secret for webhook verification
- `DODO_ENV` — `test` or `live` (defaults to `live`)
- 4 product IDs stored as env config (in code constants, populated from your answer): `DODO_PRODUCT_PRO_MONTHLY`, `DODO_PRODUCT_PRO_YEARLY`, `DODO_PRODUCT_ELITE_MONTHLY`, `DODO_PRODUCT_ELITE_YEARLY`

Requested via `add_secret` after plan approval. You'll paste the 4 product IDs in chat and I'll set them via `set_secret`.

## Database
Reuse the existing `billing_subscriptions` table (already has `customer_id`, `subscription_id`, `plan`, `status`, `trial_ends_at`, `renews_at`). Add a `provider text default 'dodo'` column via migration and backfill existing rows to `'lemonsqueezy'` for historical clarity. No breaking schema change.

`get_user_plan_info()` RPC already reads `billing_subscriptions` — no change needed.

## Edge functions (new)
1. **`dodo-checkout`** (JWT-verified) — accepts `{ plan, billing }`, resolves the Dodo product ID, calls Dodo `POST /checkouts` (or subscription equivalent) with `metadata: { user_id, plan, billing }` and `return_url = <origin>/billing/success`, returns `{ url }`.
2. **`dodo-webhook`** (`verify_jwt = false`) — verifies Dodo signature header with `DODO_WEBHOOK_SECRET`, handles:
   - `subscription.created` / `subscription.active` / `subscription.renewed` → upsert `billing_subscriptions` row (user_id from metadata, plan, status=`active`, customer_id, subscription_id, renews_at) and mirror `plan_type`/`subscription_status` on `profiles`.
   - `subscription.cancelled` → set status=`canceled`, downgrade profile to free at period end.
   - `payment.succeeded` → refresh renews_at.
   - `payment.failed` → status=`past_due`.
3. **`dodo-portal`** (JWT-verified) — returns Dodo customer portal URL for the current user's `customer_id`.
4. **`dodo-sync-subscription`** (JWT-verified) — fallback used by `/billing/success` polling: fetches subscription by customer/subscription id from Dodo and upserts locally, in case the webhook is delayed.

## Frontend
- `src/lib/dodo.ts` — replaces `src/lib/lemonsqueezy.ts` with the same shape: `createCheckoutUrl`, `openCustomerPortal`, `syncSubscription`. Coupon validation removed (Dodo handles discounts inside its hosted checkout unless you want a custom endpoint later).
- Update `Pricing.tsx`, `Checkout.tsx`, `Billing.tsx`, `BillingSuccess.tsx`, `PayoneerUpgradeModal.tsx`, and any component importing `@/lib/lemonsqueezy` to import from `@/lib/dodo` and drop LS-specific fields (coupon UI stays only if we add coupon endpoint later — removed for v1 per your scope).
- Pricing page upgrade buttons: call `createCheckoutUrl({ plan, billing })` → `window.location.href = url`.

## Cleanup (delete)
- `supabase/functions/ls-checkout/`
- `supabase/functions/ls-webhook/`
- `supabase/functions/ls-portal/`
- `supabase/functions/ls-sync-subscription/`
- `supabase/functions/ls-validate-coupon/`
- `supabase/functions/_shared/lemonsqueezy.ts`
- `src/lib/lemonsqueezy.ts`, `src/lib/lemonjs.ts`
- LS block from `supabase/config.toml`; add `[functions.dodo-webhook] verify_jwt = false`
- Delete LS secrets after Dodo is verified working: `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_STORE_ID`, `LEMON_SQUEEZY_WEBHOOK_SECRET`

## Webhook URL to register in Dodo dashboard
`https://jbdivofznclkfctcqfln.supabase.co/functions/v1/dodo-webhook`

## Verification
1. Deploy functions, register webhook, add product IDs.
2. Test checkout for each of the 4 plans in Dodo test mode.
3. Verify `billing_subscriptions` row created, `profiles.plan_type` mirrored, `usePlan` returns `isPro`/`isElite` = true.
4. Simulate `subscription.cancelled` and `payment.failed` webhooks via Dodo dashboard.
5. Confirm `/billing/success` polling + `dodo-sync-subscription` fallback resolves within 10s.

## Open item
After you approve, please paste the 4 Dodo product IDs (Pro Monthly, Pro Yearly, Elite Monthly, Elite Yearly) so I can wire them in.
