## Replay Drills Module — Interactive Drill Renderer inside LearningHub

Add an interactive drill mode that activates whenever a lesson's category is `Replay Drills`. Standard LearningHub UI is preserved; Practice/Examples/Resources tabs get drill-specific renderers, and a new analytics + AI coach panel attaches. All data flows through Supabase and existing XP/streak plumbing.

### 1. Database (one migration)

Add one column to `lessons` and four new tables. Reuse existing `lesson_progress` for notes/completion and `learning_stats` for XP — no parallel "academy_xp_log".

- `ALTER TABLE public.lessons ADD COLUMN drill_config jsonb NOT NULL DEFAULT '{}'`
  - Holds per-drill scenarios, scoring rubric, examples gallery, resources list, AI coach prompts.
- New tables (all with grants + RLS scoped to `auth.uid()`):
  - `academy_drill_attempts` — one row per attempt: `user_id`, `lesson_id`, `scenario_id`, `answers jsonb`, `score int`, `passed bool`, `duration_sec int`, `started_at`, `submitted_at`.
  - `academy_drill_scores` — rollup per `user_id` + `lesson_id`: `attempts`, `best_score`, `last_score`, `avg_score`, `weakest_dimension`, `strongest_dimension`, `total_time_sec`, `first_attempt_passed bool`.
  - `academy_drill_ai_reviews` — `user_id`, `lesson_id`, `attempt_id` (nullable), `mode` (analyze/find_mistakes/improve_entry/...), `prompt`, `answer`, `created_at`.
  - `academy_drill_progress` — unique per `user_id` + `lesson_id` + `scenario_id`: `completed bool`, `best_score int`, `last_attempt_at` (so the UI shows green check on scenarios already passed).
- Helper RPC `award_drill_xp(p_lesson_id uuid, p_score int, p_passed bool, p_first_attempt_success bool)` — `SECURITY DEFINER`, computes XP per spec (complete +50, pass +100, score≥90 +50 bonus, first-attempt pass +25), increments `learning_stats.xp_total`, returns the delta. Single authoritative path so the client can't fake XP.
- Score-rollup trigger on `academy_drill_attempts` insert → upserts `academy_drill_scores` (best, avg, weakest/strongest from `answers.dimensions`).

### 2. Seed `drill_config` for the three existing Replay Drills lessons

Update the three rows (`drill-breakout-replay`, `drill-entry-timing`, `drill-exit-management`) in place — set spec-aligned `xp_reward`, `read_time_min`, `difficulty`, full `content` (topics list), `key_takeaways`, `learning_outcomes`, `callouts`, plus a populated `drill_config`:

```text
drill_config = {
  intro, topics[], examples[ {label, type, image_or_caption, takeaway} ],
  scenarios[ 3-4 per drill: {
    id, title, tradingview: {symbol, interval, studies, range},
    setup_brief, pause_points[ { prompt, type: 'yes_no'|'pick_candle'|'choice'|'action',
      options[], correct, dimension: 'entry'|'fake_breakout'|'risk'|'exit'|'patience'|'rr'|'profit_protection'|'execution',
      points } ],
    pass_threshold (e.g. 70), max_score: 100
  } ],
  scoring_rubric (the dimensions and weights per spec for each drill),
  resources[ {title, kind: 'cheatsheet'|'checklist'|'journal', generator} ],
  ai_coach: { buttons[ {key,label,prompt_template} ] }
}
```

Seeded scenarios use TradingView embedded widgets (no candle data needed) with curated symbol/interval/range per scenario; pause-point questions deliver the bar-by-bar decision feel.

### 3. New components (under `src/components/learning/drills/`)

- `DrillPractice.tsx` — scenario list with progress chips → opens active scenario in a modal/inline panel. Embeds TradingView widget for the scenario, walks the user through ordered pause points, collects answers, computes dimension scores + total, inserts attempt, calls `award_drill_xp`, shows result card (score, dimensions bar, XP earned, pass/fail).
- `DrillExamples.tsx` — renders `examples[]` as comparison cards (Good / Bad / False Breakout, Perfect/Early/Late/Chasing Entry, Early/Perfect/Greedy/Panic Exit). Reads from `drill_config`.
- `DrillAnalytics.tsx` — pulls `academy_drill_scores` + recent attempts for this drill: Attempts, Completion %, Avg Score, Best Score, Weakest/Strongest dimension, total Time. Sparkline of last 10 attempts.
- `DrillAiCoach.tsx` — Pro/Elite gated. Buttons per spec ("Analyze My Performance", "Find My Mistakes", "Improve Entry Timing", "Improve Exit Strategy", "Create Custom Drill", "Generate Practice Plan", "Test My Understanding"). Sends the user's last attempt + dimension scores as context to `ai-learning-assistant`, persists Q+A to `academy_drill_ai_reviews`.
- `DrillResourcesPanel.tsx` — generates downloadable .md files dynamically (cheat sheet from `drill_config.scoring_rubric`, checklist from `topics`, journal template from scenarios) — same client-side blob pattern already used in LearningHub.

### 4. LearningHub integration

In `src/pages/LearningHub.tsx` `LessonPage`:
- When `lesson.category === 'Replay Drills'` and `lesson.drill_config?.scenarios?.length`:
  - **Practice tab**: render `<DrillPractice />` instead of the standard quiz.
  - **Examples tab**: render `<DrillExamples />`.
  - **Resources tab**: append `<DrillResourcesPanel />` above the standard downloads.
  - **Sidebar / footer of Lesson tab**: render `<DrillAnalytics />`.
  - **AI Coach card**: swap the generic buttons for `<DrillAiCoach />`.
- Non-drill categories keep current behavior unchanged.
- Extend the `Lesson` TS interface with optional `drill_config?: DrillConfig`.

### 5. XP, completion, and tracking

- A scenario counts as "completed" the first time `score >= scenario.pass_threshold`.
- A drill (lesson) is marked completed in `lesson_progress` when every scenario is completed.
- All XP awards go through `award_drill_xp` so the existing `learning_stats` leaderboard, level, and streak code continues to work with zero changes.

### Out of scope (Phase 1)
- Admin scenario authoring UI (scenarios are hand-seeded for now).
- Bar-by-bar lightweight-charts engine (using TradingView widgets per the user choice).
- Custom AI-generated drills beyond the AI Coach text response.

### Files
- 1 migration (column + 4 tables + RPC + trigger).
- 1 data update seeding `drill_config` and lesson content for the three Replay Drills lessons.
- 5 new components in `src/components/learning/drills/`.
- Edits to `src/pages/LearningHub.tsx` (Lesson interface + Practice/Examples/Resources/AI Coach branches for the Replay Drills category).
