# TradeNova black and blue redesign

## What will change
- Rebuild the global visual system around a true-black foundation, ice-blue highlights, thin luminous borders, and dense trading-terminal spacing.
- Use Sora for headings and Manrope for interface text across the product.
- Replace the current brand image everywhere with the supplied angular N logo, including the browser icon.
- Restyle the public homepage, navigation, broker strip, pricing, dashboard preview, and footer to match the selected black/blue direction.
- Restyle the signed-in shell, sidebar, top bar, cards, controls, and active states through shared design tokens without changing existing features or data behavior.
- Keep existing mobile navigation, account switching, locked-category behavior, subscription gates, calendar filter persistence, and all current workflows intact.

## Technical details
- Update semantic colors and shadows in the global stylesheet; avoid per-screen hardcoded brand colors where shared tokens fit.
- Update Tailwind font families to Sora and Manrope.
- Store the supplied logo through the project asset flow for in-app use, and create a small real PNG favicon from the same mark.
- Remove the unused starter root sizing rules that can constrain the full-screen interface.
- Verify the public homepage and authenticated shell at desktop and mobile sizes, then check the latest preview build diagnostics.
