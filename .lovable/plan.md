## Replay Studio — Premium Rebuild

Rebuild `src/pages/ReplayStudio.tsx` and the `src/components/replay/*` set into a flagship, Bloomberg/TradingView-grade workspace. Existing tables `replay_sessions` and `replay_screenshots` stay; new normalized tables are added for notes, executions, scores, AI reviews, and markers. No mock data — everything reads/writes Supabase.

### 1. Database (one migration)

Create new tables (each with `user_id`, `session_id`, RLS scoped to `auth.uid()`, GRANTs to authenticated + service_role, `updated_at` trigger):

- `replay_notes` — `session_id`, `what_i_saw`, `why_entered`, `why_exited`, `mistakes`, `lessons`, `last_saved_at` (one row per session, unique on `session_id`).
- `replay_executions` — `session_id`, `time`, `action` (entry/partial/exit/sl_hit/tp_hit), `price`, `size`, `type`, `pnl`, `order_index`.
- `replay_markers` — `session_id`, `kind` (entry/sl/tp/partial/exit/news), `price`, `time`, `label`, `color`.
- `replay_scores` — `session_id` (unique), `execution`, `risk`, `psychology`, `plan_adherence`, `final_score`, `tier` (elite/good/needs_work/poor).
- `replay_ai_reviews` — `session_id` (unique), `market_context`, `entry_quality`, `risk_management`, `execution_quality`, `emotional_discipline`, `missed_opportunities`, `improvements`, `model`, `generated_at`.

Keep existing JSON columns on `replay_sessions` as legacy fallback; new code writes to the normalized tables.

### 2. Page shell — `src/pages/ReplayStudio.tsx`

Top header (glass card, purple accent):
- Title "Replay Studio" + session selector dropdown (current session).
- Buttons: **New Replay Session**, Search input, Date range, Symbol filter, Setup filter.

KPI strip (6 glass cards, computed from Supabase):
- Total Sessions, Total Replayed Trades, Avg Replay Score, Win Rate, Avg RR, Most Common Mistake.

Below header, two states:
- No session selected → session grid (cards) with filters applied.
- Session selected → Replay Workspace.

### 3. New Replay Session modal — `NewSessionModal.tsx`

Rewrite to a premium two-column dialog with fields: Session Name, Pair/Symbol, Market, Setup Used, Direction, Date, Session (London/NY/Asia), Trade Result, RR, Entry/SL/TP, Notes, screenshot uploads (trade screenshot, execution screenshot, markups) → `trade-screenshots` bucket. On submit: insert into `replay_sessions`, upload files to `replay_screenshots`, open the workspace for that session.

### 4. Replay Workspace layout

```text
+--------------------------------------------------+----------------+
| Chart Area (TradingView widget, fullscreen btn)  | Analysis Panel |
|                                                  | (tabs)         |
+--------------------------------------------------+                |
| Replay Controls bar                              |                |
+--------------------------------------------------+----------------+
| Executions Table  |  Session Timeline                              |
+--------------------------------------------------------------------+
```

### 5. Chart — `ChartCanvas.tsx` (rewrite)

Use the official TradingView Advanced Real-Time Chart widget (`s3.tradingview.com/tv.js` embed) keyed on the session's symbol with:
- Theme synced to `next-themes` (dark/light).
- Multi-timeframe, drawing tools, zoom, symbol change, fullscreen toggle.
- Overlay layer (absolute-positioned div on top of widget) renders execution markers (Entry purple, SL red, TP green, Partial amber, Exit slate). Clicking a marker opens a popover with execution details. Markers are positioned by timestamp using the widget's visible range API where available; otherwise pinned to a side rail labeled with time + price.
- No fake chart images anywhere.

### 6. Replay controls — `ReplayControls.tsx` (rewrite)

Buttons: Play, Pause, Restart, Step Back, Step Forward. Speed pills 1x/2x/5x/10x/20x. Timeline slider with current candle index, current time, progress %. Keyboard shortcuts (Space, ←, →) wired via a `useReplayShortcuts` hook. Replay state lives in a `useReplayPlayer` hook driving an interval that steps through executions/timeline events.

### 7. Right analysis panel — `AnalysisPanel.tsx` (new, tabs)

- **Trade Details** — pair, date, direction, result, RR, session, setup, entry/SL/TP + uploaded screenshot with zoom (lightbox); never a placeholder.
- **Replay Notes** — 5 textareas (saw / entered / exited / mistakes / lessons), debounced auto-save (800ms) into `replay_notes`, "Last saved …" indicator.
- **AI Review** — "Generate AI Review" button calls a new edge function `replay-ai-review` (Lovable AI Gateway, `google/gemini-3-flash-preview`), persists into `replay_ai_reviews` + `replay_scores`. Renders sectioned cards + score cards (Entry/Risk/Execution/Psychology) and final 0–100 score with tier color.
- **Playbook Match** — pulls user `playbooks`, scores rules against session fields, shows match %, matched ✓ / broken ✗ lists.

### 8. Executions table + Session timeline

- `ExecutionsTable.tsx`: rows from `replay_executions`. Columns Time / Action / Price / Size / Type / PnL. Clicking a row seeks the replay player to that moment.
- `SessionTimeline.tsx`: horizontal timeline with entry/partial/exit/news pins; clickable to jump.

### 9. News integration

`NewsBadges.tsx` filters a static high-impact event list (NFP, CPI, FOMC, Rate Decision) by replay date and shows badges + impact note. Replaceable later with a feed.

### 10. AI Replay Coach (floating)

`ReplayCoach.tsx`: floating purple button bottom-right opens panel with action buttons: Analyze My Replay, Find Mistakes, Improve RR, Improve Entry, Create Journal Entry, Generate Action Plan. Each calls the same edge function with a different intent and renders the markdown reply; "Create Journal Entry" also inserts into `journal_entries`.

### 11. Scoring engine

Client-side `scoreReplay(session, executions, notes)` returns the four sub-scores + final. AI review also writes scores; client-side is the fallback and is recomputed when executions/notes change. Tier color map: ≥90 elite (emerald), 75–89 good (green), 60–74 needs work (amber), <60 poor (red).

### 12. Edge function — `supabase/functions/replay-ai-review/index.ts`

Validates JWT, accepts `{ session_id, intent }`, loads session + executions + notes via service role, calls Lovable AI Gateway, returns structured JSON, upserts into `replay_ai_reviews` and `replay_scores`. Handles 429/402 explicitly.

### 13. Design system

- Purple primary (`#7C3AED`), already-defined semantic tokens for bg/foreground/muted; add `--profit` (emerald) and `--loss` (red) tokens to `index.css` + tailwind config so green = profit, red = loss everywhere.
- Glass cards (`backdrop-blur`, subtle border), smooth framer-motion transitions for panels/markers.
- Dark mode tuned to a TradingView-like deep slate.

### Technical notes

- All Supabase queries scoped by `auth.uid()`; RLS enforces it.
- TradingView embed via official widget script in a `useEffect`; cleanup on unmount; key by `symbol+theme` to force reinit on change.
- Auto-save uses `useDebouncedCallback`; reconnect/refetch on tab focus via React Query.
- Keyboard shortcuts disabled when focus is inside an input/textarea.
- No mock arrays anywhere — empty states render explicit "No data yet" cards.

### Files

New: `src/components/replay/AnalysisPanel.tsx`, `TradeDetailsTab.tsx`, `ReplayNotesTab.tsx`, `AiReviewTab.tsx`, `PlaybookMatchTab.tsx`, `ExecutionsTable.tsx`, `SessionTimeline.tsx`, `NewsBadges.tsx`, `ReplayCoach.tsx`, `MarkerOverlay.tsx`, `hooks/useReplayPlayer.ts`, `hooks/useReplayShortcuts.ts`, `lib/replayScoring.ts`, `supabase/functions/replay-ai-review/index.ts`.

Rewritten: `ReplayStudio.tsx`, `NewSessionModal.tsx`, `ChartCanvas.tsx`, `ReplayControls.tsx`, `SessionList.tsx`, `AiReviewPanel.tsx` (becomes `AiReviewTab.tsx`), `ExecutionTimeline.tsx` (folded into `SessionTimeline.tsx`).

Migration: one SQL migration for the five new tables + RLS + GRANTs + update triggers.
