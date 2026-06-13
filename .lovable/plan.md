# Edge Analytics UI Fix

Data logic stays untouched. Only the visual layer of the Edge Analytics page changes.

## Scope

- `src/components/AnalyticsMetrics.tsx` (the 12 KPI cards rendered via `<AnalyticsMetrics />` on the Edge Analytics tab)
- `src/pages/Index.tsx` → only the two "Performance by Side" / "Performance by Setup" card rows inside `EdgeAnalytics`

Nothing else (Dashboard, Trade Vault, Command Center, Mind Journal, Replay, etc.) is touched.

## Changes

### 1. `AnalyticsMetrics.tsx` — replace `MetricCard`

Remove the right-side colored icon container (`rounded-xl bg-primary/10 p-3`) and the `highlight` color tiers. New card layout per the spec:

- Card: `border-0 shadow-sm bg-card`, padding `p-5`
- Top row: title (left, muted xs) + icon (right, `h-4 w-4 text-muted-foreground/40`, `strokeWidth={1.5}`), no background behind icon
- Value: `text-2xl font-bold tabular-nums`, color driven by a new `positive?: boolean` prop (`true` → emerald, `false` → red, `undefined` → foreground)
- Hint: muted xs under the value

Update the 12 metric entries to pass `positive` exactly as specified:

```
Net P&L         positive={net_pnl >= 0}
Win Rate        positive={win_rate >= 50}
Profit Factor   (no positive)
Expectancy      positive={expectancy >= 0}
Avg Win         positive={true}
Avg Loss        positive={avg_loss >= 0}   // already 0/negative value, follows spec
Avg R:R         (no positive)
Gross Profit    positive={true}
Gross Loss      positive={gross_loss >= 0}
Best Trade      positive={true}
Worst Trade     positive={worst_trade >= 0}
Std Deviation   (no positive)
```

Drop the bottom "Profit Factor explanation" decorative card to keep the page minimal and trader-focused (matches the "no decorative cards" rule used in earlier phases). Keep all calculations exactly as today.

The metric calculations the prompt mentions (`profitFactor`, `expectancy`, `avgRR`, `stdDev`) already exist in this component and feed the cards — no recomputation needed.

### 2. `src/pages/Index.tsx` — Performance by Side / Setup rows

Replace each row's wrapper from:

```
<div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
```

to a clean divider style:

```
<div className="flex items-center justify-between py-3 border-b border-border last:border-0">
```

- Remove the `bg-muted/30` pill
- Keep label + count on the left, P&L on the right
- P&L styled `text-sm font-bold tabular-nums` with emerald/red based on sign
- No icons, no badges

### 3. Imports

`AnalyticsMetrics.tsx` already imports the icons it needs. Add `Activity` and `CircleDollarSign` only if we change icon set — current icons already cover all 12 metrics, so no new imports required.

## Out of scope

- Data fetching, Supabase queries, RLS
- The legacy `MetricCard` defined inside `Index.tsx` (unused by Edge Analytics now that `AnalyticsMetrics` renders the KPIs)
- All other pages

## Verification

- Open `/app` → Edge Analytics tab
- Confirm: no purple icon squares, icons sit top-right and look faint, values colored only when meaningful, Performance by Side/Setup render as flat divider rows
- Values match before/after (calculations unchanged)
