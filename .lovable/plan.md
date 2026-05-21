## Premium Trade Plan Workspace

Replace the current `TradePlanWorkspace` with the premium institutional design from the uploaded spec. Strip out the draggable grid layout, TradingView charts, and watchlist — this is a clean, scrollable, single-column workspace with collapsible sections and animated transitions.

### What gets removed
- `react-grid-layout` + `react-resizable` (dependency, CSS imports, `Grid`/`DraggableWidget` wrappers, layout state, ResizeObserver, Edit/Save/Reset/Lock toolbar)
- All TradingView/chart code and `selectedSym`/`timeframe` state (if any still in the component)
- Watchlist panel
- `workspace_layouts` table reads/writes from this page (table stays in DB, unused for now)

### What gets built — `src/components/TradePlanWorkspace.tsx` (full rewrite)

Following the spec verbatim with two adaptations:

1. **AI call** — instead of calling `api.anthropic.com` directly from the browser (would expose key + CORS-fail), keep using the existing `supabase.functions.invoke('trade-plan-analysis', { body: { plan } })` edge function. Same JSON contract (`readiness_score`, `discipline_score`, `risk_score`, `warnings`, `suggestions`, `verdict`), same fallback shape.
2. **Toast** — use the project's `useToast`/`toast` from `@/hooks/use-toast` (already imported in spec).

Component pieces from the spec:
- Types: `ChecklistItem`, `NewsEvent`, `TradePlan`
- Constants: `BIAS_OPTIONS`, `SESSIONS`, `EMOTIONS`, `CAT_CONFIG`, `DEFAULT_CHECKLIST`, `IMPACT_NEWS`, `IMPACT_COLOR`, `EMPTY_PLAN`
- Helpers: `Section` (collapsible w/ framer-motion), `Toggle`, `ScoreCircle`
- Main `TradePlanWorkspace`:
  - Loads today's `trade_plans` row by `user_id` + `plan_date`
  - 2-second debounced autosave to `trade_plans`
  - Live session indicator (London/NY/Asia/Closed based on UTC hour)
  - Sections: Market Overview (bias, focus, setups, session, confidence, volatility) · Execution Checklist (categorized, HTML5 drag reorder, add/delete) · News & Economic Events (filter by impact, quick-add presets) · Risk Management (max loss/risk/target/trades, protections) · Psychology (emotion, sleep, mental state, discipline) · Notes · AI Analysis panel (run button, score circles, warnings, suggestions, verdict)
  - Sticky header: date, session pill, save status, "Analyze with AI" button, manual Save button

### Files touched
- `src/components/TradePlanWorkspace.tsx` — full replacement (~800 lines from spec, with the two adaptations above)
- `package.json` — remove `react-grid-layout`
- `src/pages/TradePlanWorkspace.tsx` — no change (still renders the component)
- No DB migration, no edge function changes (existing `trade-plan-analysis` works as-is)

### Notes
- All existing `trade_plans` columns are already in the schema (verified) — no migration needed.
- The `workspace_layouts` table stays in place but goes unused; can be cleaned up later.
- All styling is Tailwind with the dark slate/violet palette from the spec (matches existing app aesthetic).
