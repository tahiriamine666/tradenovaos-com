## Plan: Custom TradeZella-style Checkout

Build a fully custom in-app checkout page. The pricing summary, plan toggle, features, coupon field, and trust badges all live in our UI. Card entry uses the Lemon.js overlay (their PCI-compliant iframe) launched on top of our page — never a redirect to LS's hosted page.

### 1. New page: `/checkout?plan=pro|elite`

Two-panel layout, responsive (stacks on mobile).

```text
+-------------------------------+----------------------------------+
|  LEFT 40% (#F7F7FA)           |  RIGHT 60% (white)               |
|                               |                                  |
|  [TradeNova logo]             |  Complete your purchase          |
|                               |                                  |
|  [Pro ⇄ Elite] toggle         |  Email      [______________]     |
|  [Monthly | Yearly] toggle    |                                  |
|                               |  Billing name   [___________]    |
|  $14 / month                  |  Country        [▼ select  ]     |
|  Billed monthly · 7-day free  |  ZIP / Postal   [___________]    |
|                               |                                  |
|  ✓ Unlimited trades           |  ─────────────────────────────   |
|  ✓ AI Analytics               |                                  |
|  ✓ Trade Journal              |  [  Start 7-day free trial  ]    |
|  ✓ Risk Management            |   (opens Lemon.js overlay for    |
|  ✓ Replay Studio              |    card details)                 |
|                               |                                  |
|  Total due today    $0.00     |  🔒 Secure checkout · 256-bit    |
|  Then $14/mo after trial      |     SSL · Cancel anytime         |
|                               |                                  |
|  [Have a coupon? ____] Apply  |                                  |
|                               |                                  |
|  [Visa] [MC] [Amex] [Apple]   |                                  |
+-------------------------------+----------------------------------+
```

### 2. Lemon.js overlay integration

- Add Lemon.js script loader (`https://app.lemonsqueezy.com/js/lemon.js`) in the checkout page only.
- Edge function `ls-checkout` already creates a checkout. Modify it to:
  - Accept `{ plan, billing: "monthly"|"yearly", coupon?, email?, name?, country?, zip? }`.
  - Pre-fill `checkout_data` (email, name, billing_address).
  - Pass `discount_code` when a validated coupon is provided.
  - Set `product_options.enabled_variants` to the chosen variant, and `checkout_options`:
    - `embed: true`
    - `media: false`
    - `logo: false`
    - `desc: false`
    - `discount: false` (we collect it ourselves)
    - `dark: false`
    - `subscription_preview: false`
    - `button_color: "#7C3AED"`
  - Returns the checkout `url`.
- Frontend calls the function, then `window.LemonSqueezy.Url.Open(url)` to launch the overlay. On `Checkout.Success` event, redirect to `/billing/success` which polls `ls-sync-subscription`.

### 3. New edge function: `ls-validate-coupon`

- Input: `{ code, plan, billing }`.
- Calls LS `GET /v1/discounts?filter[code]=...`, verifies status=published, applies to the correct store/variant, returns `{ valid, amount, type, label }`.
- Frontend shows discounted total ("Total due today $0.00, then $X.XX/mo") and passes the code into `ls-checkout`.

### 4. Pricing page rewrite of CTA

`src/pages/Pricing.tsx` "Start 7-day free trial" buttons navigate to `/checkout?plan=pro` or `/checkout?plan=elite` instead of calling `startCheckout` directly. Plan cards/comparison/FAQ stay as-is.

### 5. Yearly pricing

Add yearly variant IDs to `supabase/functions/_shared/lemonsqueezy.ts` (`variantFromPlan(plan, billing)`). Requires the user to provide yearly variant IDs in LS (or we use monthly only and hide the yearly toggle on checkout if not configured — confirm post-plan).

### 6. Subscription sync (already exists — verify)

- `ls-webhook` writes to `billing_subscriptions` (customer_id, subscription_id, plan, status, renews_at, trial_ends_at) — already wired.
- `ls-sync-subscription` re-fetches from LS on demand — already wired.
- `get_user_plan_info()` already reads `billing_subscriptions` first, then falls back to `profiles`. No DB changes needed.

### 7. Files

**New**
- `src/pages/Checkout.tsx` — the two-panel page.
- `src/components/checkout/PlanSummary.tsx` — left panel.
- `src/components/checkout/CheckoutForm.tsx` — right panel.
- `src/components/checkout/CouponField.tsx`.
- `src/lib/lemonjs.ts` — loads Lemon.js once, exposes `openOverlay(url, { onSuccess })`.
- `supabase/functions/ls-validate-coupon/index.ts`.

**Modified**
- `src/App.tsx` — add `/checkout` route.
- `src/pages/Pricing.tsx` — CTA navigates to `/checkout?plan=...`.
- `src/lib/lemonsqueezy.ts` — `startCheckout` accepts billing + coupon + prefill, returns `{ url }` instead of redirecting; redirect logic moves into the checkout page.
- `supabase/functions/_shared/lemonsqueezy.ts` — `variantFromPlan(plan, billing)`.
- `supabase/functions/ls-checkout/index.ts` — accept new fields, set `checkout_options` to strip LS branding (logo/desc/media off, custom button color), forward `discount_code` and prefill.

### 8. Design tokens (no hardcoded colors in components)

Add to `src/index.css`:
- `--checkout-surface: 240 20% 97%;` (#F7F7FA)
- `--brand-purple: 262 83% 58%;` (#7C3AED)
- `--brand-purple-foreground: 0 0% 100%;`
- `--checkout-radius: 1rem;` (16px)
- `--shadow-checkout: 0 20px 60px -20px hsl(262 83% 58% / 0.25);`

Extend `tailwind.config.ts` with `checkout-surface`, `brand-purple`, `rounded-checkout`, `shadow-checkout`.

### 9. Typography

Install via `bun add @fontsource/plus-jakarta-sans @fontsource/inter`, import in `main.tsx`. Use Plus Jakarta Sans for display (prices, headings), Inter for body/form fields. Wire into `tailwind.config.ts` `fontFamily.display` and `fontFamily.sans`.

### 10. Branding hidden in overlay

LS Lemon.js overlay still shows their chrome by default. We minimize it via `checkout_options` (`logo: false, media: false, desc: false, discount: false`). The "Powered by Lemon Squeezy" footer and Test Mode banner inside the iframe cannot be fully removed via API — they're enforced by LS. Plan: suppress everything that the API allows; the residual badge inside the card iframe is a platform constraint. I'll flag this at implementation time if you want me to fall back to the hosted page styled the same way.

### 11. Post-implementation

- Confirm with `supabase--curl_edge_functions` that `ls-checkout` returns a URL when called with the new payload.
- Manual click-through verification of the overlay and `/billing/success` redirect.

### Open items to confirm after approval

1. **Yearly variant IDs** — do you have separate yearly variants in Lemon Squeezy? If not, I'll keep the yearly toggle but disable it until you add them.
2. **Apple Pay / Cash App / PayPal** — LS enables these per-store in their dashboard, not per-checkout. I can't toggle them off via API. The visual trust badges on our page will only show Visa/MC/Amex; the overlay itself will still show whatever your LS store has enabled.
