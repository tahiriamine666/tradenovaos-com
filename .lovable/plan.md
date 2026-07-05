# Economic Calendar

A new full page under `/app` with sidebar entry "Economic Calendar" (below Learning Hub). Matches TradeNova's purple/glass dashboard styling using existing tokens (`bg-card`, `border-border`, `text-primary`, `MetricCard`, `PageHeader`, `EmptyState`).

## 1. Data model (Supabase migration)

Three new public tables + GRANTs + RLS.

**`economic_events`** — shared reference data, readable by all authenticated users, writable only by service role (populated later by API sync jobs).
- `event_time` (timestamptz), `country` (text, ISO-2), `currency` (text), `title`, `category`, `impact` (`low|medium|high`), `forecast`, `previous`, `actual`, `unit`, `source`, `description`, `volatility_score` (numeric), `affected_symbols` (text[]), `external_id` (text, unique per source), `source_provider` (text).

**`event_bookmarks`** — per-user star.
- `user_id`, `event_id` (fk economic_events), unique(user_id, event_id).

**`event_alerts`** — per-user reminder.
- `user_id`, `event_id`, `remind_minutes_before` (int: 15/30/60), `notified_at` (nullable), `channel` (`inapp`).

RLS: events readable by `authenticated`; bookmarks/alerts scoped to `auth.uid()`. GRANTs per project rules (no anon).

## 2. Platform architecture (future API-ready)

`src/lib/economic-calendar/` with a provider adapter interface so ForexFactory / TradingEconomics / FMP / Marketaux can be plugged in later without UI changes.

```text
src/lib/economic-calendar/
  types.ts              # EconomicEvent, ImpactLevel, Category, Provider
  providers/
    index.ts            # registry
    forexfactory.ts     # stub
    tradingeconomics.ts # stub
    fmp.ts              # stub
    marketaux.ts        # stub
  useEvents.ts          # reads from economic_events table, filters
```

Each provider exports `{ id, label, fetchEvents(range) }`. For now data comes from the DB; a future edge function will sync providers into `economic_events`.

## 3. Routing & navigation

- Add route `path="economic-calendar"` inside the existing `/app` shell in `src/pages/Index.tsx` (same pattern as Learning Hub / Replay Studio).
- Add sidebar item in `src/components/AppLayout.tsx` under Learning Hub with a `CalendarClock` lucide icon.

## 4. Page structure — `src/pages/EconomicCalendar.tsx`

```text
PageHeader
  title: Economic Calendar
  description: Track high-impact economic events and market-moving news.

StatsRow (4x MetricCard)
  High Impact Today · Total Events Today · Next 24h · Most Volatile Currency

FiltersBar (sticky)
  DateRange · Country · Currency · Impact · Category · Search

ViewSwitch: List | Calendar | Timeline

Main body (grid, right drawer overlays on mobile)
  ├── EventsView (List/Calendar/Timeline) — takes full width when no selection
  └── EventDetailsDrawer (right side, ~420px)
        Header: flag · currency · title · impact badge · bookmark + alert buttons
        Metrics: Actual · Forecast · Previous · Volatility score
        Description
        Affected pairs (chips)
        Trading implications (bulleted, from row)
        History mini-bar chart (recharts) using previous vs forecast series
        AIEconomicInsight card (see §6)
        TradingViewChart (see §7)
```

### View modes
- **List**: grouped-by-day table with sticky day headers, columns per spec (Time, Flag, Currency, Event, Impact dots, Forecast, Previous, Actual, Volatility).
- **Calendar**: month grid with impact dots per day; click day = filter list to that day.
- **Timeline**: horizontal 24h ribbon for the selected day; events plotted on hour axis with impact color.

### Impact badge colors (tokens only)
- high → `bg-danger/10 text-danger border-danger/30`
- medium → `bg-warning/10 text-warning border-warning/30`
- low → `bg-success/10 text-success border-success/30` (existing yellow variant via warning-muted; will introduce a `--warning-muted` if needed, otherwise use success)

## 5. Filters & search

Local `useState` filter object → memoized query against `economic_events` via Supabase. Debounced search (`title ilike`). Country/Currency/Category options derived from distinct values.

## 6. AI Economic Analysis card

Reuse existing `ai-chat` edge function (or new `economic-insight` function later). For plan scope: client-side deterministic insight generator that reads the selected event and outputs 2-3 concise bullets ("NFP expected to increase USD volatility", etc.), keyed by category + impact + currency. Ships without new edge function; interface is `generateInsight(event) → string[]` so we can swap to LLM later.

## 7. TradingView chart

`TradingViewChart` component already exists (`src/components/replay/TradingViewChart.tsx`). Wrap with a symbol switcher (EURUSD, GBPUSD, USDJPY, XAUUSD, NAS100) that defaults to a symbol mapped from the selected event's currency:
- USD → EURUSD, EUR → EURUSD, GBP → GBPUSD, JPY → USDJPY, XAU → XAUUSD, indices → NAS100.

## 8. Bookmarks & alerts

- Star icon in row + drawer toggles `event_bookmarks`.
- Bell icon opens a small popover with 15/30/60 min presets; writes `event_alerts`.
- Client-side scheduler (`useEventAlertScheduler`) polls due alerts every 60s and fires `sonner` toast + optional `Notification` API. No push infra in this pass.

## 9. Empty & loading states

- No events after filter → `EmptyState` with `CalendarClock` icon, copy: *"Markets are quiet today. No major economic releases scheduled."*
- Loading → skeleton rows.

## 10. Files to create

```text
src/pages/EconomicCalendar.tsx
src/components/economic/StatsRow.tsx
src/components/economic/FiltersBar.tsx
src/components/economic/EventsListView.tsx
src/components/economic/EventsCalendarView.tsx
src/components/economic/EventsTimelineView.tsx
src/components/economic/EventDetailsDrawer.tsx
src/components/economic/ImpactBadge.tsx
src/components/economic/CountryFlag.tsx
src/components/economic/AiInsightCard.tsx
src/components/economic/SymbolChart.tsx
src/lib/economic-calendar/types.ts
src/lib/economic-calendar/useEvents.ts
src/lib/economic-calendar/useBookmarks.ts
src/lib/economic-calendar/useAlerts.ts
src/lib/economic-calendar/insight.ts
src/lib/economic-calendar/providers/{index,forexfactory,tradingeconomics,fmp,marketaux}.ts
supabase/migrations/<ts>_economic_calendar.sql
```

## 11. Files to edit

- `src/components/AppLayout.tsx` — add sidebar link.
- `src/pages/Index.tsx` — add nested route.
- `src/integrations/supabase/types.ts` — regenerated after migration approval.

## 12. Out of scope (this pass)

- Live provider syncing (edge function stubs only; `economic_events` starts empty → empty state).
- Server-side push notifications; only in-app + Web Notification toast.
- Localization / timezone picker beyond user's browser locale.
