## Redesign Trade Vault

Replace `src/pages/TradeVault.tsx` with the premium journal from the uploaded spec: stat cards, search + filters, table rows, right-side detail drawer, 3-step Add/Edit Trade modal, AI per-trade review, empty state.

### Database migration (`trades` table)
The spec uses fields not yet on `trades`. Add them (nullable / safe defaults):
- `mistakes text[] not null default '{}'`
- `screenshot_url text`
- `emotion text`
- `account_type text not null default 'main'`
- `ai_review jsonb not null default '{}'`
- `is_starred boolean not null default false`
- `tags text[] not null default '{}'`

No RLS changes (existing `own trades *` policies still apply). Existing columns preserved.

### Edge function for AI review
Spec calls `api.anthropic.com` directly from the browser — would expose keys and CORS-fail. Create `supabase/functions/trade-review/index.ts` mirroring the existing `trade-plan-analysis` pattern: JWT-verified, calls Lovable AI Gateway (`google/gemini-2.5-flash`), returns the same JSON shape (`verdict`, `what_went_well`, `what_went_wrong`, `rule_broken`, `improvement`, `discipline_score`). Fallback object on 429/402/error.

Client `handleAIReview` will use `supabase.functions.invoke('trade-review', { body: { trade } })` instead of the raw `fetch` from the spec.

### `src/pages/TradeVault.tsx` (full rewrite from spec)
Components inlined per spec:
- `StatCard`, `TradeRow`, `EmptyState`
- `AddTradeModal` — 3 steps (Basic Info, Result, Setup & Notes), validation, "Save & add another"
- `TradeDrawer` — right-side panel with stats, details, mistakes, notes, AI review section with run button
- Main `TradeVault` — loads trades + playbooks, stats memo, search + outcome/session/pair filters, table, modal/drawer wiring

Adaptations vs spec:
- `toast` import: from `@/hooks/use-toast` (already in project)
- AI review: edge function call instead of direct Anthropic fetch
- Drops the previous page's shared `TradeDialogContext` (`openNew`/`openEdit`) and `CSVImport` button — this page becomes self-contained. The context stays in the project for other consumers (Dashboard, etc.) — only this page stops using it.

### Files touched
- `supabase/migrations/<new>.sql` — add 7 columns to `trades`
- `supabase/functions/trade-review/index.ts` — new edge function
- `src/pages/TradeVault.tsx` — full replacement (~950 lines from spec, with the two adaptations above)

### Notes
- `Index.tsx` already renders `<TradeVault />` for the trades tab — no change needed.
- No changes to other pages, auth, dashboard, playbooks, or analytics.
- `mistakes`, `tags` arrays and `ai_review` jsonb default to empty so all existing rows remain valid.
