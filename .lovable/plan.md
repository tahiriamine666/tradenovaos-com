# SMC Category — Build Plan

The Learning Hub renderer already handles every tab (Lesson, Examples, Practice, Notes, Resources, AI Assistant) plus XP, progress, completion, and Supabase persistence dynamically from `lessons.content`, `lessons.quiz_questions`, and `lessons.drill_config`. So SMC is a pure data-seeding job — identical pattern to the Fundamentals build.

## What gets built

### 1. Seed SMC category
Upsert the `SMC` row in `learning_categories` (name, slug `smc`, description, icon `Activity`/`Layers`, purple accent token, sort order after Fundamentals).

### 2. Seed 3 lessons in `lessons` table
All with `category = 'SMC'`, `published = true`:

| # | Title | Difficulty | Duration | XP |
|---|---|---|---|---|
| 1 | Market Structure & Breaks | Beginner–Intermediate | 25 | 100 |
| 2 | Smart Money Order Flow | Intermediate | 30 | 120 |
| 3 | Premium & Discount Zones | Intermediate | 20 | 100 |

Each lesson populates:

- **`content`** (markdown) — full Lesson tab: every topic from the brief (HH/HL/LH/LL, BOS, CHOCH, internal vs external, order flow phases, liquidity sweeps, inducement, equilibrium / 50% rule, premium vs discount entries, confluence, risk model, common mistakes, professional workflow).
- **`key_takeaways`** + **`learning_outcomes`** — from the brief.
- **`quiz_questions`** (jsonb) — 6–7 scenario-based MCQs per lesson with correct answer + explanation. Powers the Practice tab scoring engine and XP award.
- **`drill_config`** (jsonb) — used by Examples / Practice / Resources / AI renderers:
  - `examples[]` — Bullish trend, bearish trend, valid BOS, fake BOS, CHOCH, continuation (L1); liquidity grab, BSL/SSL sweeps, inducement, expansion (L2); discount entry, premium entry, equilibrium, good/bad trade location (L3). Each with setup, reaction, lesson, TradingView symbol (e.g. `OANDA:NAS100USD`, `OANDA:XAUUSD`, `OANDA:EURUSD`).
  - `practice[]` — "Identify the right answer" scenarios: pick HH/HL/BOS/CHOCH/trend; pick liquidity / sweep / inducement / continuation / direction; pick premium / discount / equilibrium / best–worst entry zone. Each with answer + rationale.
  - `resources[]` — downloadable metadata for SMC Cheat Sheet, Market Structure Guide, Liquidity Guide, Order Flow PDF, Premium/Discount Worksheet, TradingView Examples link, Replay Exercises, Checklists. Existing resources renderer handles dynamic generation + download tracking.
  - `ai_prompts[]` — the 7 AI buttons (Explain Simply, Create Quiz, Test My Understanding, Show Real Market Example, Analyze Chart Concept, Generate Practice Questions, Build Study Plan) with tailored system prompts per lesson topic.

### 3. No schema changes
Notes auto-save, progress, XP, completion, resource download tracking, and AI Assistant (Pro/Elite gated) all work via existing tables, RPCs, and the `ai-learning-assistant` edge function.

### 4. Verify
Open `/learn`, expand SMC, open each lesson, confirm all 5 tabs render real content and AI buttons fire.

## Technical details
- 1 `supabase--insert` call: upsert category + 3 lessons (idempotent via `ON CONFLICT (slug)`).
- 0 migrations.
- 0 new components.
- 0 edited components.

## Out of scope
- New lesson renderer.
- Interactive bar-by-bar SMC charts (Practice uses MCQ + TradingView example links — same pattern as Fundamentals).
- Admin authoring UI.
