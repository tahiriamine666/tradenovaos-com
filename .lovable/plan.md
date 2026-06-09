# Product Polish — Phases 4–8

Scope: **Trade Vault, Mind Journal, Replay Studio, Edge Analytics, Playbook Lab** only.
Untouched: Landing, Pricing, Payments, Admin, Learning Hub, Command Center, Auth.

Approach: ship one module per sub-phase, request preview approval before moving on. Use the Phase 0 primitives already in place (`MetricCard`, `EmptyState`, `PageHeader`, `ProGate`, `UpgradeModal`) and semantic tokens (`primary` = purple, `success` = green, `danger` = red, neutral grays). No fake data — every metric reads from existing Supabase tables (`trades`, `journal_entries`, `replay_sessions`, `playbooks`).

---

## Phase 4 — Trade Vault

**File:** `src/pages/TradeVault.tsx` (+ new `src/components/trade-vault/*`).

1. **Compact filter bar** (sticky): Pair, Session, Setup, Direction (long/short), Result (win/loss/be), Date Range (popover calendar), Account. Filters live in URL search params so refresh preserves state.
2. **View toggle**: Table | Calendar.
   - Table = existing list, cleaned (remove decorative chips, single-row density, P&L right-aligned colored).
   - Calendar = month grid built on `react-day-picker`. Each day cell colored: `success/10` if net positive, `danger/10` if net negative, neutral if no trades; total P&L number on cell. Click day → opens day-trades sheet.
3. **Trade Details drawer** rewrite:
   - Header: pair · side badge · P&L (green/red) · close date.
   - Metrics grid: Entry, Exit, R:R, Risk %, Session, Setup, Duration.
   - Chart slot: render `trade.screenshot_url` from `trade-screenshots` bucket; click → zoom dialog. If no screenshot, show "No screenshot uploaded" placeholder + upload button (no fake chart).
   - Tabs: Notes (editable, autosave) · Mistakes (chips from journal taxonomy) · AI Review (calls existing `trade-review` edge function, caches to `trades.ai_review` jsonb if column exists else local) · Playbook.
4. **Playbook tab**: If `trade.playbook_id` set → show playbook name, entry/exit/risk rules, checklist with followed/broken toggles, computed Discipline Score = followed / total.
5. **Empty state**: `EmptyState` with "Log First Trade" (opens `AddTradeModal`) and "Import Trades" (opens `CsvImportDialog`). Zero fake rows.
6. **Mobile**: drawer becomes full-screen `Sheet`; filter bar collapses into a single "Filters" button opening a sheet.

---

## Phase 5 — Mind Journal

**File:** `src/pages/MindJournal.tsx` (+ `src/components/journal/*`).

1. **Overview strip**: 4 `MetricCard`s — Total Entries, Avg Confidence, Avg Rule Adherence, Emotional Stability (stddev of `confidence_level` over last 30 entries, inverted to 0–100). All computed from `journal_entries`.
2. **Entry cards**: date · confidence · energy · rule adherence · main emotion chip · session · 1-line `summary`. Click → details sheet.
3. **Filter bar**: search (notes/lesson), emotion multi-select, session, confidence range slider, rule-adherence range, mistake multi-select, sort newest/oldest.
4. **New Entry modal** — sectioned form writing to existing columns:
   - A. Emotional State → multi-chip → joined into `mood`.
   - B. Sliders 1–10 → `confidence_level`, `energy_level`, focus (new local), `stress_score`, `rule_adherence`.
   - C. Session Review → `what_went_well`, "what went wrong" → appended to `notes`, learn → `lesson`, improve → appended to `lesson`.
   - D. Mistakes checklist (12 preset + custom) → `mistakes_list` array.
   - E. Wins checklist → stored in `notes` JSON block or new array (use `mistakes_list` pattern; add `wins_list` only if needed — otherwise pack into `summary`/`notes` to avoid schema changes this phase).
   - F. Lesson Learned (required) → `lesson`, highlighted in card.
5. **AI Insights panel**: reuse `ai-insights` edge function with `kind=journal`; show top recurring mistake, best/worst emotional state, rule-breaking frequency. Short bullet list.
6. **Emotion Analytics tab**: 4 small recharts — emotion frequency bar, confidence trend line, rule-adherence trend line, mistakes frequency bar. All from real entries.
7. **Empty state**: "Start your trading psychology journal." → Create First Entry.

> Schema additions deferred: if `wins_list`/`focus_level` are essential, propose a migration in a follow-up — not required for this pass.

---

## Phase 6 — Replay Studio

**File:** `src/pages/ReplayStudio.tsx` (+ `src/components/replay/*`).

1. **Layout**:
   - Desktop 3-pane: left sidebar (Sessions list, Saved Replays, Stats, Notes tabs) · center chart canvas · right panel (Controls, Metrics, Notes).
   - Bottom: execution timeline (list of placed orders in chronological order).
   - Mobile: full-screen chart, controls + sidebar as slide-up sheets.
2. **Chart canvas**: HTML5 canvas overlay on uploaded screenshot (existing `screenshot_url` on `replay_sessions`). No real market data feed — replay is screenshot-based scrubbing using saved annotation frames.
3. **Controls**: Play / Pause / Step ± / Restart. Speed: 1×, 2×, 5×, 10×, 20× (controls a frame-advance interval for the annotation timeline).
4. **Trade Execution Mode**: Place Long/Short → click chart to set entry, SL, TP. Live compute Risk $, position size (from profile risk %), R:R. Stored into `replay_sessions.trades` jsonb.
5. **Scoring**: on Finish → compute Execution / Discipline / Risk / Patience (each 0–100) from placed trades vs rules; Final = weighted avg. Persist into `execution_score` + new keys in `trades` jsonb.
6. **Review block**: short bullets — went well / went wrong / missed opportunities / risk mistakes / next focus. AI optional via existing `ai-replay-review` function.
7. **Annotation tools**: trendline, zone, liquidity, BOS, CHOCH, text note. Stored as JSON in `trades` jsonb under `annotations` key.
8. **Session notes**: pre/during/post fields → `notes` (markdown sections, autosave 1.5s debounce).
9. **Analytics tab**: Total Replays, Win Rate, Avg Score, Best Setup, Worst Mistake — all from `replay_sessions` rows.
10. **Empty state**: "Practice Without Risk." → Start Replay / Upload Chart.

---

## Phase 7 — Edge Analytics

**File:** `src/pages/AIInsights.tsx` + `src/components/AnalyticsMetrics.tsx`.

1. **Top summary**: 5 `MetricCard`s — Total P&L, Win Rate, Avg R:R, Profit Factor, Total Trades. Each shows delta vs prior period of equal length. Remove decorative icon tiles.
2. **Your Edge panel**: 2 columns (Best / Worst) with Session, Setup, Pair, Day — computed from `trades` group-bys.
3. **Setup Analytics table**: Setup · Trades · Win Rate · Avg R:R · Net P&L. Sortable.
4. **Pair Analytics table**: Pair · Trades · Win Rate · Net P&L.
5. **Session Analytics**: London / NY / Asia rows with Trades · Win Rate · Avg R:R · P&L.
6. **Mistake Analytics**: join `journal_entries.mistakes_list` — top mistakes by frequency, % of entries.
7. **Psychology Insights**: 3 generated statements from journal × trades joins (e.g. "Win rate jumps to X% when confidence ≥ 7"). Computed client-side, no AI required.
8. **AI Performance Review** (Pro-gated via `ProGate`): Strengths / Weaknesses / Focus Next Week from `ai-insights` function.
9. **Charts** (recharts): Equity Curve · P&L by Setup · Win Rate by Session · Monthly Performance. Drop all others.
10. **Empty state** (< 10 trades): "Log at least 10 trades to unlock deeper analytics." + Log Trade CTA. Show progress `n / 10`.

---

## Phase 8 — Playbook Lab

**File:** `src/pages/PlaybookLab.tsx` (+ `src/components/playbook/*`).

1. **Top summary**: Total · Active · Best (highest net P&L of linked trades) · Total Playbook Trades.
2. **Playbook table** (replaces card grid): Playbook · Status · Trades · Win Rate · Avg R:R · Net P&L · Last Used. Row click → details.
3. **Builder modal** — multi-step form into existing columns:
   - Setup Name → `name`/`title`.
   - Category → `strategy_type` (ICT, SMC, PA, Scalping, Swing, Fundamental, Custom).
   - Market Conditions → `best_market_conditions` + `sessions` array.
   - Entry checklist → `entry_checklist` jsonb (array of `{label, required}`).
   - Risk rules → `risk_percent`, `target_rr`, `max_loss` (max trades stored in `conditions` since no column).
   - Exit rules → `exit_checklist` jsonb (tp model, partials, BE, trailing as checklist items).
4. **Details page tabs**:
   - Overview: description, market conditions, risk model, expected outcome.
   - Rules: entry / management / exit lists.
   - Checklist: entry/exit/psych checklists rendered.
   - Trades: `trades` filtered by `playbook_id` (table).
   - Analytics: Trades, Win Rate, Avg R:R, Profit Factor, Net P&L, Best Pair, Best Session, Worst Session, setup-only equity curve.
   - AI Insights: strengths / weaknesses / common mistakes via `ai-insights` (Pro-gated).
5. **Rule Adherence**: per linked trade compute followed/broken from checklist (uses trade's `rules_followed`/`mistakes` arrays where present) → Discipline Score.
6. **Playbook Score 0–100**: weighted = 0.4·winRate + 0.3·ruleAdherence + 0.2·consistency (1 − stddev of monthly P&L normalized) + 0.1·riskMgmt (% trades within `risk_percent`).
7. **Empty state**: "Create Your First Playbook" → Create.

---

## Technical Notes

- New shared components live under `src/components/{trade-vault,journal,replay,playbook}/` to keep page files small (< 400 lines each).
- All Supabase reads use existing client + RLS — no schema changes in this pass. Schema additions (`wins_list`, `focus_level`, etc.) flagged as optional follow-ups.
- All cards use `surface-1/2`, all positive numbers `text-success`, negative `text-danger`, accents `text-primary`. No new color tokens.
- Light + dark mode verified per panel; no hardcoded `bg-white` / `bg-black`.
- ProGate wraps: AI Performance Review (Edge Analytics), AI Insights tab (Playbook Lab), Replay AI Review.
- Existing edge functions reused: `trade-review`, `ai-insights`, `ai-replay-review`. No new functions required.

## Delivery cadence

After each sub-phase I stop and ask for preview approval before starting the next. Order: **4 → 5 → 6 → 7 → 8**.