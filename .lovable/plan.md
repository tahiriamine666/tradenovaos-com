# Premium Trade Plan Workspace

Replace the current Trade Plan with the institutional-grade single-page workspace described in your uploaded spec. Strip out the TradingView chart, watchlist, react-grid-layout, and old workspace UI.

## 1. Database (migration)

The current `trade_plans` table only has `market_bias / focus / max_daily_loss / max_risk_per_trade / setups_to_trade / notes`. The new spec needs many more fields. Add nullable columns with safe defaults so existing rows keep working:

- `secondary_setup` text
- `session` text
- `confidence` int default 60
- `volatility` text default 'normal'
- `news_impact` text default 'none'
- `checklist` jsonb default '[]'
- `news_events` jsonb default '[]'
- `avoid_before_news` bool default false
- `wait_after_news` int default 15
- `daily_target` numeric
- `max_trades` int
- `max_consec_losses` int default 2
- `account_protection` bool default true
- `stop_on_rule_break` bool default true
- `emotion` text default 'focused'
- `mental_state` text
- `sleep_quality` text default 'good'
- `discipline_score` int default 7
- `psych_notes` text
- `ai_analysis` jsonb default '{}'
- `name` text (the spec writes this on save)

RLS policies already cover all columns (own-row by `user_id`), no policy changes needed.

## 2. Replace `src/components/TradePlanWorkspace.tsx`

Drop the spec's component in as the new file. Two adjustments vs. the raw paste:

- **AI call**: the spec calls `https://api.anthropic.com/v1/messages` directly with no API key — that will fail in the browser (CORS + auth). Instead route through a new edge function `trade-plan-analysis` that calls **Lovable AI Gateway** (`google/gemini-2.5-flash`, free during promo, no key needed). The function takes the plan JSON and returns the same `{readiness_score, discipline_score, risk_score, warnings, suggestions, verdict}` shape. `generateAIAnalysis()` becomes a `supabase.functions.invoke('trade-plan-analysis', { body: { plan } })`.
- **Toast import**: keep `@/hooks/use-toast` as in the spec (already in project).

Everything else (sections, score circles, checklist drag-reorder, auto-save, news events, psychology block, etc.) is implemented exactly as in your prompt.

## 3. Simplify `src/pages/TradePlanWorkspace.tsx`

Currently this page reimplements its own plan UI + TradingView chart + watchlist. Replace its entire body with a thin wrapper:

```tsx
import TradePlanWorkspace from '@/components/TradePlanWorkspace';
export default function TradePlanWorkspacePage() {
  return <TradePlanWorkspace />;
}
```

This removes: TradingView script injection, `chartRef`, watchlist state, symbol/timeframe controls, `BIAS` map, tabs UI, inline edit form — all superseded by the new component.

## 4. New edge function `supabase/functions/trade-plan-analysis/index.ts`

- CORS headers, POST only.
- Reads `plan` from request body.
- Calls `https://ai.gateway.lovable.dev/v1/chat/completions` with `LOVABLE_API_KEY` (auto-provided), model `google/gemini-2.5-flash`, system prompt = "respond with ONLY JSON", user prompt = the trader summary from the spec.
- Parses the JSON response, returns it. On error/parse failure, returns the safe fallback object from the spec.
- Registered in `supabase/config.toml` with `verify_jwt = true` (user must be logged in).

## 5. Files removed / left alone

- `src/pages/TradePlan.tsx` — separate older page, **not touched** (not part of this request).
- `react-grid-layout` was never installed in this project, nothing to uninstall.

## Result

A single scrollable premium workspace at the Trade Plan route: header with session pill + progress + AI button, collapsible sections (Bias & Focus, Setups, Risk Rules, News, Psychology, Checklist, Notes), AI readiness analysis card, autosave every 2s. No charts, no watchlist, no drag-grid.
