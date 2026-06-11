# Phase 6 — Replay Studio

Rebuild `src/pages/ReplayStudio.tsx` (currently 986 lines, mixed UI) into a focused, professional execution-training tool. Reuses existing `replay_sessions` table and `ai-replay-review` edge function — no schema changes, no breaking changes to other modules.

## Layout (desktop)

```text
┌─────────────────────────────────────────────────────────────────┐
│ PageHeader: Replay Studio   [+ New Session] [Filter]            │
├──────────┬─────────────────────────────────┬────────────────────┤
│ Sessions │   Chart Area                    │  Controls          │
│ list     │   (screenshot canvas +          │  - Direction       │
│ (left    │    annotation overlay)          │  - Entry / SL / TP │
│  280px)  │                                 │  - Risk %          │
│          │                                 │  - Position size   │
│ filters: │                                 │  - R:R (live)      │
│ pair,    │                                 │  - Execute Long    │
│ outcome  │                                 │  - Execute Short   │
│          │                                 │  - Close trade     │
│          │                                 │                    │
│          ├─────────────────────────────────┤  Metrics panel     │
│          │ Timeline (executions strip)     │  Notes textarea    │
│          │ ──●──────●─────●───── now       │  Score + AI review │
└──────────┴─────────────────────────────────┴────────────────────┘
```

Mobile (<768px): sessions list collapses to a Sheet; chart becomes full-width with controls in a bottom Drawer.

## Functional scope

**Sessions list (left)**
- Real `replay_sessions` from Supabase, scoped to `auth.uid()`.
- Search + filter by pair / outcome / status.
- Click → loads session into center + right panes.
- `EmptyState` when none: title "Practice Without Risk", description as specified, actions `Start Replay` (opens New Session modal) and `Upload Chart` (opens upload step directly).

**Chart area (center)**
- Screenshot canvas: render `chart_url` (Supabase `trade-screenshots` bucket, reused) inside a zoom/pan container.
- Annotation overlay (canvas) for: line, arrow, rectangle, text. Stored as JSON in `replay_sessions.trades[].annotations`.
- Toolbar: select / line / arrow / rect / text / clear / undo.
- If no screenshot: inline EmptyState "Upload a chart screenshot to start replay" + upload button. No fake/synthetic chart.

**Controls (right)**
- Direction toggle Long/Short.
- Inputs: Entry, Stop Loss, Take Profit, Account size, Risk %.
- Live calculations:
  - Risk $ = account × risk%
  - Position size = risk$ / |entry − sl|
  - R:R = |tp − entry| / |entry − sl|
- `Execute` button appends to `executions` jsonb with timestamp.
- `Close trade` prompts exit price, computes P&L in R, appends to `trades` jsonb.
- Executions list with delete.

**Timeline (bottom of center)**
- Horizontal strip of execution markers (entry/exit dots) with hover tooltips; click to scroll to that execution in the list. No fake price data — purely based on user's recorded actions.

**Metrics + Notes (right, below controls)**
- Live counters: # executions, total R, win/loss ratio.
- Notes textarea (debounced save to `notes`).
- Mistakes multiselect (writes to `mistakes` text[]).
- "What went well" textarea.

**Replay Review / Scoring**
- `Run AI Review` button → calls existing `ai-replay-review` edge function (already returns execution/discipline/patience/risk_management/setup_quality scores + verdict + what_went_well / what_to_improve / ai_suggestion).
- Final Score = avg(execution, discipline, patience, risk_management), 0–100, displayed as a single ring.
- AI panel renders:
  - What went well (list)
  - What went wrong (list)
  - Missed opportunities (string from `ai_suggestion`)
  - Risk mistakes (filtered from `what_to_improve` mentioning risk)
  - Next focus (last item / explicit field)
- Error handling: 429 → toast "Rate limited, try again"; 402 → toast "AI credits exhausted".

**New Session modal**
- Steps: Title → Pair / Timeframe / Setup → Upload screenshot (Supabase storage `trade-screenshots/replay/{user_id}/{uuid}.png`) → Create.
- Inserts into `replay_sessions` with `status='active'`.

## Files

- Rewrite: `src/pages/ReplayStudio.tsx` (orchestrator, <300 lines).
- New `src/components/replay/`:
  - `SessionList.tsx`
  - `ChartCanvas.tsx` (screenshot + annotation overlay)
  - `AnnotationToolbar.tsx`
  - `ReplayControls.tsx` (direction, inputs, risk calc, execute)
  - `ExecutionTimeline.tsx`
  - `MetricsPanel.tsx`
  - `AiReviewPanel.tsx`
  - `NewSessionModal.tsx`
- Reuse: `PageHeader`, `MetricCard`, `EmptyState`, `ProGate` (gate AI review for free plan via existing `usePlan`).

## Design rules

- Semantic tokens only (no hardcoded colors). Purple primary, green profit, red loss, neutral gray everywhere else.
- No decorative cards, no gradients, no glow.
- Dark/light parity via existing tokens.
- No fake price data, no synthetic candlesticks, no demo trades.

## Out of scope

Landing, Pricing, Payments, Admin, Learning Hub, Command Center, Trade Vault, Mind Journal, Auth, Edge Analytics, Playbook Lab — untouched.

After build: preview, then await approval before Phase 7 (Edge Analytics) + Phase 8 (Playbook Lab).
