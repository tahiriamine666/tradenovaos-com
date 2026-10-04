# TradeNova audit recovery — 4 October 2026

Target: the owner's original Supabase project `lyohknejsvhhtmglljae`.
Keep the existing users, subscriptions and trades. Do not use `jbdivofznclkfctcqfln`.

## Applied to the original database

Nine additive/repair migrations are recorded in Supabase migration history and exported into `supabase/migrations/20261004*_audit_*.sql`.
They add the missing checklist, NOVA, calendar and chart preferences; align trading account, trade and calendar fields; enforce account ownership and plan limits; unify access expiry; and add server-only checkout/event records with transactional subscription updates.

No production users, subscriptions or trades were deleted. Verified counts remained 4 users, 3 subscriptions and 10 trades.
The SQL regression in `scripts/audit-security-regression.sql` passed with all test changes rolled back: own chart preferences work, cross-user reads/writes are blocked, clients cannot apply billing snapshots or read server checkout records.

## Server deployment

The four Dodo functions were updated to version 2. The missing `mt-connect`, `mt-sync`, `nova-chat` and `sync-economic-events` functions were deployed to the original project.
All eight reject unauthenticated POST requests (401); the webhook uses its signed-webhook authentication.
Deployment does not verify external provider operations.

Dodo's existing endpoint was changed from the website homepage to:
`https://lyohknejsvhhtmglljae.supabase.co/functions/v1/dodo-webhook`.
It subscribes to all subscription lifecycle events plus payment success/failure.
The existing signing secret was securely saved as `DODO_WEBHOOK_SECRET` without logging it.
Live environment and all four product ID settings were saved and their displayed digests verified.

| Plan | Monthly product ID | Monthly price |
|---|---|---|
| Pro | pdt_0NiAkpxz9gAN0Spuarqm5 | USD 14 |
| Elite | pdt_0NiAlZAx8DbY0elDOHsMG | USD 28 |

The monthly products have the previously configured 14-day trial requiring a payment method.
Annual product configuration was preserved.

## Frontend changes in this branch

- Restore-password route and recovery navigation.
- Correct onboarding step numbering and access-error retry.
- Correct negative currency formatting and fetch complete trade histories.
- Verify the specific checkout attempt before displaying subscription confirmation.
- Read canonical subscriptions in billing settings.
- Remove investor credentials from database writes; pass them transiently to the server.
- Protect linked trading account identity and retain manually edited trade data during sync.
- Align economic calendar reads with the original schema.
- Replace the Contact placeholder with an authenticated support request form.
- Remove contradictory no-card/free-plan copy.
- Regenerate frontend database types from the original project.

## Validation and remaining release gates

Passed: TypeScript app check, `node scripts/audit-regression.mjs`, rolled-back database security checks, unauthenticated endpoint checks.
The local Vite build is blocked by an OS process restriction (`spawn EPERM` in esbuild); the pull-request workflow runs the production build.

The original project still requires:

- `DODO_API_KEY`: a dedicated read/write billing key is prepared in Dodo, awaiting explicit approval to create it.
- `METAAPI_TOKEN` for MT4/MT5 sync and `LOVABLE_API_KEY` plus funded AI service access for NOVA.
- Optional `FMP_API_KEY` for historical economic events; the free fallback only supplies the current week.
- Auth redirect/provider settings verification, including Google and password recovery.
- Owner-approved business identity, support contact and refund terms for complete Privacy/Terms pages. Existing legal placeholders are not launch-ready.
- Real test-mode checkout, webhook delivery, renewal/cancellation, non-internal-user access, account sync and AI response tests.

Lovable currently has a separate newer frontend state connected to the wrong database. Its workspace has no credits and refused the restoration request. Do not publish that state as though this branch were present. Reconcile the changes with the latest Lovable source, restore the original Supabase public configuration, build and preview, then publish and verify the public domain.

The SQL files under `scripts/audit-*.sql` are review/test aids. Applied migration history is under `supabase/migrations`; do not blindly replay the helper scripts against production.
