# Fundamentals Category — Build Plan

The Learning Hub already supports the full lesson experience (Lesson, Examples, Practice, Notes, Resources, AI Assistant, XP, progress, Supabase persistence) and is dynamic for every category. The existing `lessons` table also has a `drill_config` jsonb that we use for any tab-specific structured content. So the Fundamentals build is purely a **data seeding job** — no new tables, no new components, no UI rewrites.

## What gets built

### 1. Seed Fundamentals category
Insert (or upsert) the `Fundamentals` row in `learning_categories` if it doesn't exist, with:
- name, slug, description, icon (`TrendingUp` / `Newspaper`), color token (purple accent), sort order.

### 2. Seed 4 lessons in `lessons` table
For each lesson set `category = 'Fundamentals'`, `published = true`, plus difficulty, duration, xp:

| # | Title | Difficulty | Duration | XP |
|---|---|---|---|---|
| 1 | Trading CPI Releases | Intermediate | 20 | 100 |
| 2 | NFP Playbook | Advanced | 25 | 120 |
| 3 | FOMC Day Strategy | Advanced | 30 | 150 |
| 4 | Inter-Market Correlations | Intermediate | 20 | 100 |

Each lesson populates:

- **`content_md`** — full markdown for the Lesson tab covering every topic in the brief (What is CPI / NFP / FOMC / Correlation, why it matters, central bank reaction, asset-by-asset impact, hawkish vs dovish, risk model, common mistakes, professional workflow). Real explanations, no Lorem.
- **`quiz`** (jsonb) — 5–7 scenario-based MCQs per lesson with correct answer + explanation. Used by existing Practice tab and scoring engine.
- **`drill_config`** (jsonb) — used by Examples / Practice / Resources renderers:
  - `examples[]` — Bullish/Bearish USD CPI, Gold reaction, Index reaction (and equivalents for NFP / FOMC / Correlations) with setup, reaction, lesson learned, optional TradingView symbol.
  - `practice[]` — "Identify the right action" scenarios (Buy USD / Sell USD / Avoid Trading; correct reaction selection; correlation matching) with answer + rationale.
  - `resources[]` — dynamically generated downloadables per lesson: CPI/NFP/FOMC trading checklists, risk templates, news event checklist, cheat sheet, journal worksheet, economic calendar reference (links to ForexFactory / Investing.com calendars).
  - `ai_prompts[]` — the 6 AI buttons (Explain Simply, Create Quiz, Test My Understanding, Build Trading Plan, Give Real Example, Analyze News Scenario) with tailored system prompts per lesson topic.

### 3. No schema changes
- Notes already auto-save via existing `lesson_progress.notes` (or current notes table) — works out of the box.
- Progress, XP, completion already tracked by existing `lesson_progress` + `learning_stats` + `award_xp` logic.
- Resource download tracking already supported by existing resources renderer.
- AI Assistant uses existing `ai-learning-assistant` edge function — Pro/Elite gating already in place.

### 4. Verify
After seeding, hit `/learn`, open each Fundamentals lesson, confirm all 5 tabs render real content and AI buttons fire.

## Technical details

- 1 `supabase--insert` call: upsert category + 4 lessons (idempotent via `ON CONFLICT (slug)`).
- 0 migrations.
- 0 new components.
- 0 edited components.

## Out of scope
- New lesson renderer (existing renderer already handles every tab).
- Bar-by-bar replay (Fundamentals is news-driven, uses static example cards + TradingView links).
- Admin authoring UI.
