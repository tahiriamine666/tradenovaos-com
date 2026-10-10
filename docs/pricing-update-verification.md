# Pricing update verification — 2026-10-10

Publication is pending owner inspection. No publishing, checkout creation, charges, email sends, provider edits, subscription migration or deliberate user-record writes were performed.

## Changed files

- `src/lib/pricing.ts`: centralized monthly integer cents and annual provider-quote equivalents.
- `src/lib/pricing.test.ts`: exact $5.99/$9.99 and $132→$11/$264→$22 checks.
- `src/pages/Pricing.tsx`: monthly plan prices.
- `src/pages/LandingPage.tsx`: monthly navigation/pricing copy.
- `src/pages/marketing/PublicPricingPage.tsx`: pricing SEO description.
- `src/pages/Onboarding.tsx`: centralized monthly display; unchanged provider annual quotes plus accurate monthly equivalents, without savings claims.
- `public/llms.txt`: pricing and unchanged allowances.
- `src/lib/dashboard/layout.ts`: minimal Calendar widget identity/type alignment; no redesign.
- `supabase/tests/dodo-mapping.test.mjs`: synthetic, isolated product mapping tests.
- `AGENTS.md`, `roadmap.md`, and this report: conventions, task status and verification.
- Project memory updated with owner-confirmed pricing/publication requirements.

## Checkout source of truth

Actual checkout still uses `supabase/functions/dodo-checkout/index.ts` and environment-selected mapping in `supabase/functions/_shared/dodo.ts`: `DODO_PRODUCT_PRO_MONTHLY`, `DODO_PRODUCT_ELITE_MONTHLY`, `DODO_PRODUCT_PRO_YEARLY`, `DODO_PRODUCT_ELITE_YEARLY`. No mapping or checkout logic changed; display pricing never determines the provider charge.

Authenticated, read-only `action: "prices"` returned:

| Configured plan | USD amount | Provider trial days |
|---|---:|---:|
| Pro monthly | 5.99 | 14 |
| Elite monthly | 9.99 | 14 |
| Pro annual | 132 | 7 |
| Elite annual | 264 | 0 |

Owner independently verified existing LIVE monthly products `pdt_0NiAkpxz9gAN0Spuarqm5` and `pdt_0NiAlZAx8DbY0elDOHsMG`, respectively. The backend read-only response omits product IDs and environment mode. Therefore its exact configured IDs and LIVE mode were **not independently established**; amounts and monthly trial days match the owner's provider evidence. Secret values were not retrieved or printed, and no new diagnostics endpoint or checkout session was created to obtain identifiers.

Annual price and trial configuration were preserved. Existing onboarding still requests a 14-day trial and shows 14-day copy for both periods, but annual product defaults differ (7/0); flag for owner review rather than change billing/trial behavior in this pricing-only task.

## Verification

- 18 frontend tests passed: pricing (4), Dashboard layout (8), Daily/Weekly Plan (6).
- 2 synthetic backend product-mapping tests passed, including unknown/missing configuration; real secrets/provider calls are never used by these tests.
- 20 isolated welcome-email/billing regression tests passed, including deduplication, same-plan admin saves, entitlement safety and unauthorized worker rejection. No real email invocation.
- Latest automatic build entries: `build OK` at 22:02:20Z and 22:02:35Z. Earlier transient Deno typing errors from locating the mapping test in frontend source were resolved by keeping that test under backend tests. No separate manual typecheck/build was run; validation relies on the automatic harness.
- Public pricing and isolated onboarding monthly/annual screens checked at desktop 1280px and mobile 390px; prices visible, no horizontal overflow, no page runtime errors.
- Onboarding access state mocked only in the browser for price-screen inspection; no plan selection save/trial-start command clicked. Provider quotes were read from the real authenticated backend.

## Remaining references/issues

- No old $14/$28 TradeNova price copy or false annual-savings claims found in active frontend, public content, docs or edge-function code.
- Immutable historical migrations still contain old 14/28 MRR multipliers (`supabase/migrations/20260514011825_79d33695-621b-4a32-970c-3b44f29227e4.sql` and `20260514005524_2891f3f4-3e49-4bd2-8edd-58f0e0f4c6e1.sql`). They were not rewritten.
- Read-only production function inspection confirms unused legacy `get_admin_analytics` still estimates MRR with 14/28; `get_admin_stats` uses older 29/79. Current `AdminPanel.tsx` uses `admin_platform_analytics`, not either legacy helper. Those estimates cannot be made accurate by multiplying all existing subscribers by new offer prices, since existing subscriptions are not repriced. No analytics/entitlement function was changed.
- Exact deployed environment-selected product IDs remain unverified independently, as explained above.
- No claim is made that pre-existing Trading Review or other unrelated release blockers were resolved.