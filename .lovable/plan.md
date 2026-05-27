## Goal
Replace `src/pages/ReplayStudio.tsx` with the TradingView-style replay workstation from the uploaded prompt, plus the backend pieces it needs to actually work.

## What ships

### 1. DB migration — extend `replay_sessions`
The pasted UI reads/writes ~20 columns that don't exist yet. Add (all nullable, safe defaults):
- `session_name text`, `timeframe text default '60'`
- `playbook_id uuid` (no FK, soft link to `playbooks.id`)
- `tags text[] default '{}'`, `mistakes text[] default '{}'`
- `outcome text` (win/loss/breakeven)
- `rr numeric`, `risk_amount numeric`
- `entry_price numeric`, `stop_loss numeric`, `take_profit numeric`
- `duration_min integer`
- `bias text`, `volatility text`, `news_context text`
- `what_went_well text`
- `discipline_score integer default 0`
- `executions jsonb default '[]'`
- `ai_review jsonb default '{}'`

Keep existing `trades` column (used by current code) untouched for backward compatibility. No RLS changes — existing `own r *` policies already cover it. Types regenerate automatically.

### 2. New edge function — `ai-replay-review`
The pasted code calls `api.anthropic.com` directly from the browser with no key — that won't work and would leak a key. Replace with a Supabase edge function that uses the **Lovable AI Gateway** (`LOVABLE_API_KEY`, model `google/gemini-2.5-flash`) and returns the same JSON shape (`verdict`, `discipline_score`, `execution_score`, `what_went_well[]`, `what_to_improve[]`, `ai_suggestion`, `setup_quality`, `risk_management`, `patience`). Verifies JWT, takes `{ sessionId }`, loads the session, prompts the model, persists `ai_review` server-side, returns it.

### 3. Replace `src/pages/ReplayStudio.tsx`
Paste the file from the prompt **with one adjustment**: swap the direct Anthropic `fetch` in `runAI` for `supabase.functions.invoke('ai-replay-review', { body: { sessionId: session.id } })`. Everything else (NewSessionModal, SessionDetail with TradingView embed + playback controls, SessionCard grid, search/filter, stats, empty states) ships as-is. ~1000 lines, self-contained.

### 4. Index/route
`ReplayStudio` is already imported and rendered at `/app` (replay tab). No router change needed — verified.

## Out of scope
- No changes to MindJournal, TradeVault, PlaybookLab, TradePlan, auth, dashboard.
- Playback scrubber stays cosmetic (TradingView embed doesn't expose bar-replay via the free widget). The Play/Pause/scrubber UI is visual only — same as the source prompt.
- No changes to existing `trades` jsonb column or to current `replay_sessions` rows.

## Technical notes
- `playbooks` table exists with `id, title, entry_rules` — load works as-is.
- Migration order per project rules: CREATE/ALTER → no new GRANTs needed (table already granted) → RLS already enabled → existing policies cover new columns.
- Edge function uses `verify_jwt = true` (default) and the user's session to ensure they own the row.