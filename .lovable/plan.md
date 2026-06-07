# TradeNova Full Audit & Rebuild

Goal: kill the template/vibecoded feel. Every surface ends up simple, professional, trading-focused. Purple = primary, green = wins, red = losses, neutral gray = everything else. No fake data, no dead buttons, no "coming soon".

Shipping in **8 sequential phases**. Each phase is a coherent, reviewable changeset — you approve, I ship, we move on. If anything in a phase needs a decision I'll stop and ask, not guess.

---

## Phase 0 — Design system foundation (must ship first)

Everything else depends on this. Tiny diff, huge downstream effect.

- **`src/index.css` + `tailwind.config.ts`**: collapse the palette to 4 roles — `primary` (purple, unchanged), `success` (green), `danger` (red), `muted` (neutral gray). Remove ad-hoc violet/fuchsia/emerald/sky/amber accent usage from tokens. Add `--surface-1/2/3` for card layering so we stop relying on `bg-white/5` hacks.
- **New `src/components/ui/PageHeader.tsx`, `MetricCard.tsx`, `EmptyState.tsx`, `ProGate.tsx`, `UpgradeModal.tsx`**. These replace ~40 bespoke header/KPI/empty blocks across the app and make the rest of the phases mostly delete-and-replace.
- **`ProGate`** behavior (confirmed with you): visible, disabled, small `PRO` chip + lock icon, click opens `UpgradeModal` explaining feature + value + required plan.
- Kill decorative icon boxes (pastel rounded squares). Standard icon = Lucide, `h-4 w-4`, `text-muted-foreground`, purple only on hover/active.

Out of phase 0: no page-level redesign yet, just primitives.

## Phase 1 — Navigation & shell

- Sidebar already cleaned in last turn — verify Calendar route renders, drop the "Upgrade to Pro" promo card (replaced by per-feature `ProGate`), tighten spacing.
- **Learning Hub categories in sidebar**: when route is `resources`, the sidebar swaps its main nav for a course tree (categories → lessons), matching academy UX. Back button returns to main nav.
- Mobile bottom nav: same 5 items, no changes.

## Phase 2 — Learning Hub (your #1 priority)

- Course sidebar (categories + lesson list, progress dots, locked Pro lessons with chip).
- Main pane: only the selected lesson. Tabs: **Lesson · Examples · Practice · Notes · Resources**. No tab may render "coming soon" — if a lesson has no examples/practice yet, the tab is hidden, not empty.
- Wire real actions:
  - **Mark Complete** → `lesson_progress` upsert, updates streak via `update_learning_streak` RPC.
  - **Save Notes** → `lesson_progress.notes` jsonb.
  - **Download** → generates a real PDF (lesson markdown → jsPDF) client-side. Pro lessons gated.
  - **AI Learning Assistant** → existing edge function, `ProGate` for free users.
- Audit all existing lessons in `lessons` table; any lesson with no `content_md` gets hidden from the index until authored. No empty shells visible.

## Phase 3 — Command Center

- Top row: 4 `MetricCard`s — Total P&L, Win Rate, Avg R:R, Total Trades. Each: number + tiny sparkline, no pastel icon. Red/green only when the metric itself is gain/loss.
- Body grid:
  - Equity Curve (full-width on lg, recharts area, neutral grid).
  - Today Focus (top trade plan for today, or "No plan for today" CTA).
  - Trading Calendar heatmap (compact, monthly, one square per day color-coded by P&L).
  - Trader Score (existing component, simplified — no decorative gradients).
  - Recent Trades (5 rows, click → Trade Vault detail).
  - Best Setups (top 3 by expectancy from playbooks).
- **Empty state**: when `trades.count = 0`, render the onboarding card you specified (Welcome + Log First Trade + Import Trades) instead of zero-value KPIs.
- Remove: empty AI cards, oversized blank calendar, decorative gradient backgrounds.

## Phase 4 — Trade Vault

- New header: search, filters, date range, view toggle (Table | Calendar), Import Trades, Log Trade.
- **Calendar view**: month grid, each day shows net P&L + trade count, click day → filters table.
- Filter panel: instrument, direction, setup, tag, R range, P&L range, date.
- Trade detail side panel (sheet): screenshot, entry/exit, R, MFE/MAE, notes, linked journal entry, linked playbook.
- Cleaner metrics strip above table (uses `MetricCard`).
- Empty state per spec.

## Phase 5 — Mind Journal

- Entry cards: date, mood chip (single icon, not pastel pills), top 2 lessons, top 2 mistakes, linked trade count.
- Emotion tracking: 30-day mood trendline + frequency bar (neutral gray + single accent).
- Lessons extracted: aggregated tag cloud from `lessons_learned` column, click-to-filter.
- Mistakes analytics: top recurring mistake tags + frequency over time.
- Empty state per spec.

## Phase 6 — Replay Studio

- TradingView-inspired three-pane: chart placeholder (lightweight-charts) | trade actions/order log | session score + notes.
- Real replay workflow: create session → step through bars (or upload screenshots) → log hypothetical entries/exits → end session → AI review (Pro gated).
- Session scoring: discipline, plan adherence, risk, execution — stored in `replay_sessions`.
- Practice analytics page: avg session score, sessions/week, score trend.
- Empty state per spec.

## Phase 7 — Landing page + remaining surfaces

- Feature grid: Trade Journal, Edge Analytics, Mind Journal, Playbook Lab, Replay Studio, AI Insights, Trading Calendar, CSV Import. Cards: title, one-sentence description, single monochrome icon, screenshot thumb. **No category badges.** No pastel backgrounds.
- Hero: simplify, single CTA + secondary, kill rotating gradient blobs.
- Pricing, broker, marketing sub-pages: pass through same primitives.
- Mind Journal, Playbook Lab, Studio Settings, Admin Panel: design-system pass (same primitives, no behavioral change unless broken).

## Phase 8 — Functionality + theming audit

- Walk every visible button. Each one: works, hidden, or `ProGate`-disabled. No dead clicks.
- Walk every page in light + dark. Fix every hardcoded `bg-white`, `bg-black`, `bg-[#0c0c16]`, `text-white` that isn't on a colored button. Use the new surface tokens.
- Remove any remaining "coming soon" strings via repo-wide grep.
- Final lint + typecheck.

---

## What I will NOT touch (unless you say so)
- Auth flow, billing/Paddle, RLS policies, edge-function business logic.
- Database schema (only `lesson_progress.notes` and `replay_sessions` columns if missing — would be a separate approved migration).
- Marketing copy/positioning beyond removing template phrasing.

## How approvals work
After each phase I'll show you what changed, you eyeball the preview, and either green-light the next phase or send fixes. If something is bigger than I estimated, I'll stop and re-plan rather than blow scope.

**Ready to start with Phase 0 (design system foundation)?** That unlocks everything else and is the smallest possible diff.