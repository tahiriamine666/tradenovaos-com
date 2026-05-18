Remove the two trust badges ("Secure checkout by Paddle" and "Cancel anytime") from the pricing page header in `src/pages/PricingPage.tsx`.

## Changes

- Delete the entire badge row (the `<div class="flex items-center justify-center gap-2 mt-2 flex-wrap">` block containing both Badge components).
- Remove the now-unused `ShieldCheck` import from `lucide-react` (keep `Clock` — still used elsewhere? verify; if not, remove it too).
- Keep the header `h2` + subtitle paragraph intact for a cleaner, more minimal look.
- Spacing stays correct since the parent uses `space-y-8` and the header uses `space-y-2`.

## Result

Header becomes just title + subtitle, then the interval toggle and plan grid — tighter and more minimal.