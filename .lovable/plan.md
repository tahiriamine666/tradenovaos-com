
# Add Lesson: Drawdown Recovery Rules

Add a new Intermediate lesson under **Risk Management** in the Learning Hub, with full content across Lesson / Examples / Practice / Notes / Resources / AI Assistant tabs.

## 1. Database (migration)

Insert into existing `lessons` table:
- category: `Risk Management` (create `learning_categories` row if missing, emoji 🛡️)
- title: `Drawdown Recovery Rules`
- description, difficulty `intermediate`, duration_minutes `20`, xp_reward `100`
- `content` JSONB with all 8 sections (markdown + structured blocks for tables/checklists)
- `examples` JSONB (Example 1, Example 2, Good vs Bad recovery trader comparison cards)
- `practice` JSONB (3 exercises: calc, multiple-choice, scenario — with correct answers + XP)
- `resources` JSONB (8 resource items with type/url/description)
- `notes_template` (string with the recovery-plan template)
- `ai_prompts` JSONB (6 assistant buttons → prompt seeds)

If lessons table is missing any of these columns (`examples`, `practice`, `resources`, `notes_template`, `ai_prompts`), add them as JSONB/text in the same migration. I'll first inspect `lessons` schema with `supabase--read_query`.

Also ensure these per-user tables exist (create if missing, with RLS + GRANTs scoped to `auth.uid()`):
- `lesson_checklist_progress` (lesson_id, item_key, checked, updated_at)
- `lesson_notes` (lesson_id, content, updated_at) — auto-save
- `lesson_quiz_attempts` (lesson_id, exercise_key, answer, is_correct, score, xp_earned)
- `lesson_resource_events` (lesson_id, resource_key, action: viewed|downloaded)

`lesson_progress` already exists and will track completion + XP award.

## 2. Lesson content (stored in DB, rendered dynamically)

All 8 sections from the brief, including the recovery math table, 4 professional rules, funded-account model, 6-step framework, and 7-item interactive checklist (persisted via `lesson_checklist_progress`).

## 3. Frontend changes (presentation only)

`src/pages/LearningHub.tsx` — extend the lesson detail view with 6 tabs: **Lesson**, **Examples**, **Practice**, **Notes**, **Resources**, **AI Assistant**. If tabs already exist, just wire missing ones.

New components under `src/components/learning/`:
- `LessonContent.tsx` — renders structured sections + recovery math table + interactive checklist
- `LessonExamples.tsx` — Example cards + Good/Bad trader comparison cards (green/red accents)
- `LessonPractice.tsx` — quiz engine (calc input, MCQ, scenario) → writes to `lesson_quiz_attempts`, awards XP via existing `learning_stats` flow
- `LessonNotes.tsx` — textarea bound to `notes_template`, debounced auto-save to `lesson_notes`
- `LessonResources.tsx` — resource list with view/download tracking
- `LessonAIAssistant.tsx` — 6 preset prompt buttons calling existing `ai-learning-assistant` edge function with lesson context

Styling uses existing semantic tokens: purple primary, emerald for wins/correct, red for losses/wrong. Glass cards, supports light & dark mode.

## 4. AI Assistant

Reuse `supabase/functions/ai-learning-assistant`. Pass `{ lessonId, action, lessonContext }`. No new secrets needed (uses `LOVABLE_API_KEY`).

## Files

**Migration:** one SQL migration (schema additions if needed + lesson row insert + new per-user tables with RLS/GRANTs).

**New:** 6 components under `src/components/learning/`.

**Edited:** `src/pages/LearningHub.tsx` (tab wiring), possibly `src/integrations/supabase/types.ts` regenerated post-migration.

No mock data, no static placeholders — everything reads from Supabase.
