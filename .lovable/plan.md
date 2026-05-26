## Mind Journal Redesign

Replace `src/pages/MindJournal.tsx` with the premium trading-psychology workspace from `MIND_JOURNAL_REDESIGN_PROMPT.txt`. Match Trade Vault's color rules: emerald (good), red (bad), violet (accent), white/gray for the rest — no orange/yellow/blue/cyan/pink/amber.

### 1. Database migration (`journal_entries`)
The new UI needs columns that don't exist yet. Add them as nullable so existing rows keep working:

- `stress_score` int, `stress_label` text
- `what_went_well` text
- `mistakes_list` text[] (default `{}`)
- `emotional_trigger` text
- `summary` text
- `session` text, `session_time` text
- `ai_review` jsonb (default `{}`)

Keep existing columns and RLS policies as-is.

### 2. Page rewrite
Replace `src/pages/MindJournal.tsx` with the spec's component (lines 14-end of the upload). Key pieces:

- Header with title, search, filter, "New Entry" CTA
- Stats strip: total entries, avg rule adherence, avg confidence, dominant mood
- Trend chart (recharts AreaChart) of confidence/adherence over time
- Entry list with expandable cards showing mood badge, scores, mistakes chips, lesson, AI review
- New-entry slide-over form covering all new fields (mood grid, sliders, mistakes multi-select chips, session, bias, free-text areas)
- Theme-aware: use `text-foreground` / `bg-card` / `border-border` + `dark:` variants matching Trade Vault treatment

### 3. Out of scope
- No changes to other pages, auth, or AI edge functions
- No new packages (recharts, framer-motion, lucide already installed)
- Keep route registration unchanged (already mounted via `MindJournal` import)

### Verification
- Migration applies cleanly; existing entries still load
- New entry form saves all fields; list renders mood/stress/adherence colors per rules
- Light + dark both look correct, no off-palette colors