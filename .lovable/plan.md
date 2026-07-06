## Phase 1: Live Economic Calendar (FMP-powered)

Wire the existing Economic Calendar page to real data from Financial Modeling Prep, make every filter and view work against live events, and surface AI-generated impact for high-impact releases. Defer News Center, Heatmap, Sessions, Weekly Outlook, email/push alerts, and watchlist alerts to a future phase.

### 1. Secret & data source

- Request `FMP_API_KEY` via `add_secret` (user pastes their key from financialmodelingprep.com).
- No new Supabase tables — the existing `economic_events`, `event_bookmarks`, `event_alerts` schema is reused. `event_alerts.remind_minutes_before` already supports arbitrary integers, so we extend the UI to include 5 min alongside 15/30/60.

### 2. Edge function: `sync-economic-events`

New Deno function under `supabase/functions/sync-economic-events/`.

- Accepts `{ from, to }` (defaults: today → +7 days).
- Calls `https://financialmodelingprep.com/api/v3/economic_calendar?from=…&to=…&apikey=$FMP_API_KEY`.
- Normalizes each row into our `economic_events` shape:
  - `external_id` = stable hash of `date|country|event`
  - `impact` mapped from FMP `impact` (`Low`/`Medium`/`High`) → `low|medium|high`
  - `currency` from FMP `currency`, `country` from FMP `country` (ISO-2 fallback via a small map)
  - `category` inferred by keyword matching on `event` (CPI/PPI → Inflation, NFP/Unemployment → Employment, GDP → GDP, Rate/FOMC/ECB/BOE/BOJ → Central Bank, PMI/ISM → Manufacturing, Retail → Retail, Confidence → Consumer Confidence, Housing → Housing, Trade → Trade)
  - `volatility_score` = 3/6/9 base by impact, +1 if event name matches a known market-mover list (NFP, CPI, FOMC, ECB, GDP, PPI, Retail Sales)
  - `affected_symbols` derived from currency (USD → `[EURUSD, XAUUSD, NAS100, US30]`, EUR → `[EURUSD, DAX]`, GBP → `[GBPUSD]`, JPY → `[USDJPY]`, XAU → `[XAUUSD]`, AUD → `[AUDUSD]`, etc.)
  - `source_provider = 'fmp'`
- Upserts on `external_id` (add unique index in migration below).
- Response: `{ inserted, updated, total }`.
- Uses `SUPABASE_SERVICE_ROLE_KEY` for insert; no JWT required (`verify_jwt = false` in `supabase/config.toml`).

### 3. Small migration

- Add `UNIQUE (external_id, source_provider)` to `economic_events` so the sync upsert is idempotent.
- Ensure `authenticated` has `SELECT` on `economic_events` (verify existing grants; add if missing).

### 4. FMP provider adapter

Replace the stub in `src/lib/economic-calendar/providers/fmp.ts` with a client that invokes the edge function via `supabase.functions.invoke('sync-economic-events', { body: { from, to } })` and returns `{ synced: number }`. The other provider stubs stay as placeholders.

### 5. `useEvents` upgrades

- On mount and whenever `filters.from`/`filters.to` change, trigger the FMP sync **before** reading from the DB; then re-fetch rows.
- Add a `setInterval` of 60s that re-syncs and re-queries while the tab is visible (pause on `document.hidden`).
- Expose `refetch()` and a `syncing` boolean.
- Keep client-side filtering for country/currency/impact/category/search (already implemented).

### 6. UI wiring

- **`EconomicCalendar.tsx`**: show a subtle "Syncing…" pill in the header while `syncing`. Show a "Refresh" button that calls `refetch()`. Never render the "Markets are quiet" empty state while `loading || syncing` OR if `allEvents.length > 0` but current filters narrow it to zero — in the latter case show a filter-specific empty state ("No events match your filters").
- **`FiltersBar.tsx`**: already functional; verify `country`, `currency`, `impact`, `category`, `search`, and date range all filter correctly against real FMP data (they will, since options are derived from `allEvents`).
- **`EventsListView.tsx`**: add a **Deviation** column = `((actual − forecast) / |forecast|) * 100` when both numeric; color green if positive, red if negative, muted "—" otherwise. Adjust the grid template accordingly.
- **`StatsRow.tsx`**: already dynamic — verify against live data. "Most Volatile Currency" continues to weight by impact.
- **`EventDetailsDrawer.tsx`**: for `impact === 'high'`, ensure `AiInsightCard` renders (already wired via `generateInsight`). Extend `src/lib/economic-calendar/insight.ts` with richer per-category templates ("Likely USD volatility", "May affect NASDAQ and S&P500", "High probability of XAUUSD movement", etc.).
- **Alerts popover**: add a 5-minute preset alongside 15/30/60 in `useAlerts` / drawer UI.

### 7. Views

List, Calendar, and Timeline already exist and are data-driven — no structural changes, they'll light up once real events land.

### Out of scope (future phases, not built now)

- AI Market News Center + news sources
- Economic Heatmap (8 currencies)
- Trading Session Tracker (Sydney/Tokyo/London/NY)
- AI Weekly Outlook
- AI Volatility Scanner widget
- Watchlist-based alerts and symbol subscriptions
- Browser push + email alert delivery
- Smart Alert subscriptions per event type (NFP/CPI/FOMC/…)

### Files

**Create**
- `supabase/functions/sync-economic-events/index.ts`
- `supabase/migrations/<ts>_economic_events_unique.sql`

**Edit**
- `src/lib/economic-calendar/providers/fmp.ts`
- `src/lib/economic-calendar/useEvents.ts`
- `src/lib/economic-calendar/useAlerts.ts` (add 5-min preset)
- `src/lib/economic-calendar/insight.ts` (richer templates)
- `src/pages/EconomicCalendar.tsx` (refresh button, syncing state, smarter empty state)
- `src/components/economic/EventsListView.tsx` (Deviation column)
- `src/components/economic/EventDetailsDrawer.tsx` (5-min alert option)
- `supabase/config.toml` (add `[functions.sync-economic-events] verify_jwt = false`)

### Verification

- After building: open Economic Calendar, confirm events populate for the current week, filters narrow results, list shows Deviation, high-impact rows render AI Impact in the drawer, and the syncing pill appears every 60s.
