## Add Lesson: "Risk Model for Funded Challenge"

Follow the exact same pattern used for the "Drawdown Recovery Rules" lesson — insert one new lesson row into the existing `lessons` table under the Risk Management category, with all content (sections, examples, practice questions, notes template, resources, AI assistant config) stored in the lesson's JSON columns. No new tables, no new components, no schema changes.

### Steps

1. **Insert lesson row** (via supabase insert tool) into `public.lessons`:
   - `category` → Risk Management category id
   - `title` → "Risk Model for Funded Challenge"
   - `description` → provided description
   - `difficulty` → `intermediate`
   - `duration_minutes` → 25
   - `xp_reward` → 120
   - `order_index` → next slot after Drawdown Recovery Rules
   - `content_json` → all 10 lesson sections
   - `examples_json` → 5 worked examples + Pro vs Gambler comparison
   - `practice_json` → 4 exercises (numeric + multiple choice) with quiz scoring rules
   - `notes_template_json` → the Notes tab template fields
   - `resources_json` → 8 resource items (downloads tracked via existing lesson_progress/resource counters)
   - `ai_assistant_json` → 7 quick-action buttons + 4 dynamic inputs (account size, daily loss limit, target profit, risk %) + output schema (Custom Risk Model / Daily / Weekly / Recovery Rules)

2. **Verify** the lesson renders in the existing LearningHub UI:
   - Lesson appears in left sidebar under Risk Management
   - Lesson / Examples / Practice / Notes / Resources / AI Assistant tabs all populate from JSON
   - Practice quiz writes attempts to existing `lesson_progress` (XP awarded on pass)
   - Notes auto-save uses existing notes column
   - AI Assistant calls existing `ai-learning-assistant` edge function with the new input fields

### Out of scope
- No schema changes, no new tables, no new components, no edge function changes. LearningHub already supports this content shape from the previous lesson — this is purely a data insert.

### Files touched
- 1 data insert into `public.lessons`. Zero file edits.
