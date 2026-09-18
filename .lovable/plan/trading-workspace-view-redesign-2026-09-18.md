# Trading workspace view redesign

## Goal
Match the four supplied references while preserving the current black and ice-blue TradeNova design and live account data.

## Changes
- **Journal:** replace the psychology-card feed with a dense, horizontally scrollable trade journal table showing date, pair, weekly context, daily bias, result, P&L, R:R, timeframe, chart thumbnail, and notes. Rows remain tied to the user’s real trades.
- **Trade Logs:** change the main trade list into a screenshot-first gallery. Only trades with a chart screenshot appear as image cards, with pair, direction, result, date, and P&L; clicking a card opens the existing trade details and full-size chart.
- **Analytics:** use a compact KPI grid followed by cumulative P&L and win-rate trend charts, plus concise performance breakdowns, all calculated from the active account’s real trades.
- **Calendar:** enlarge the monthly trading calendar, add P&L/Psychology controls and a right-side monthly summary with total P&L, trade count, win/loss days, and average daily result.

## Technical details
- Reuse the existing `trades` data, active-account filtering, secure signed screenshot URLs, dialogs, and edit/delete actions.
- Keep empty, loading, filtered, desktop, and mobile states usable.
- Preserve Nova AI, Checklist, Economic Calendar, settings, subscription gates, and account switching.
- Verify the four views in the signed-in preview and confirm the build is clean.
