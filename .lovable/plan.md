## Premium Trade Detail Drawer

Replace the existing `TradeDrawer` component inside `src/pages/TradeVault.tsx` with the new premium version from the uploaded spec. No other component on the page changes.

### What changes

**1. `TradeDrawer` (lines 508–644) — full replacement**
- New props: `onDuplicate`, `onDelete`, `playbooks` (with optional `entry_rules`, `win_rate`)
- Tabbed content (Notes / Mistakes / AI Review / Playbook) using `AnimatePresence`
- Premium header with WIN/LOSS/BREAKEVEN + side badge, large P&L
- 6-card quick stat grid (P&L, R:R, Session, Setup, Execution, Emotion)
- Entry/Exit price card with animated delta bar and %
- Screenshot preview with hover overlay
- Discipline + Execution radial progress rings
- Richer AI review section (verdict card, what went well/wrong, suggestion, re-analyze)
- Playbook tab showing linked playbook, entry rules, rules-followed vs rules-broken
- Floating bottom action bar (Duplicate / AI Review / Delete)

**2. Call site (line ~899)** — pass new props:
```tsx
<TradeDrawer
  trade={viewTrade}
  onClose={() => setViewTrade(null)}
  onEdit={openEdit}
  onDuplicate={(t) => { handleDuplicate(t); setViewTrade(null); }}
  onDelete={handleDelete}
  onAIReview={handleAIReview}
  playbooks={playbooks}
/>
```

**3. Playbooks query + state**
- The spec asks to also select `win_rate`, but the `playbooks` table has no `win_rate` column (only `entry_rules`). Selecting it would 400. **Adaptation:** select `id, title, entry_rules` only and omit `win_rate` from state. The UI already renders the win-rate badge conditionally (`win_rate != null`), so it simply hides.
- Update state type to `{ id: string; title: string; entry_rules?: string | null }[]`.

**4. Imports** — add `TrendingDown`, `Minus`, `Zap`, `Target`, `Check` to the `lucide-react` import if missing.

### Files touched
- `src/pages/TradeVault.tsx` — only the `TradeDrawer` function, the playbooks query/state, the drawer call site, and the lucide imports.

### Out of scope (unchanged)
- `AddTradeModal`, `TradeRow`, `EmptyState`, main `TradeVault`, Supabase queries other than the playbooks `select`, auth, edge functions, DB schema.
