## Goal

Replace **only** the `LessonPage` function in `src/pages/LearningHub.tsx` with the V2 layout from the uploaded spec (top-bar breadcrumb + actions, header card with chart thumbnail, tabbed content with rich Lesson/Examples/Practice/Notes/Resources, bottom prev/next nav, right sidebar with animated progress ring, course roadmap, AI tutor, resources). Keep the rest of the file untouched.

## Required deviations from the literal spec

These are necessary to compile and to keep app conventions:

1. **AI call** — the spec posts directly to `api.anthropic.com` with no auth (would fail and leak any key). Replace the `askAI` fetch with the existing edge function used everywhere else in this file:
   ```ts
   const answer = await askLessonAI(`${ctx}\n\nInstruction: ${prompt}`);
   setAiAnswer(answer);
   ```
2. **`lesson.callouts`** — spec reads this field but it doesn't exist on `Lesson` or in the DB. Add a `callouts jsonb default '[]'` column to `lessons` (migration) and add `callouts: Callout[]` to the `Lesson` interface. Existing rows get `[]` so the spec's `Array.isArray` check passes.
3. **Prev/Next navigation** — spec leaves `onClick={() => {}}` on the bottom buttons. To make them actually work, add one new prop `onNavigate: (lesson: Lesson) => void` to `LessonPage` and pass `openLesson` from the parent. Same callback drives the Course Roadmap rows and the Related Lessons list (currently dead clicks).
4. **Top-level imports** — add `Bookmark`-already-present check; the spec's icon list is already a subset of what's imported, plus `AnimatePresence` (already imported). No new icons needed.
5. **New interfaces** — add `Callout` and `QuizQuestion` next to the existing types, as the spec instructs.

## Migration

Single migration:

```sql
ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS callouts jsonb NOT NULL DEFAULT '[]'::jsonb;
```

No new tables, no policy changes, no grants needed (existing `lessons public read` policy + existing grants cover it).

## Steps

1. Run the migration above; wait for types regen.
2. In `src/pages/LearningHub.tsx`:
   - Add `callouts: Callout[]` to the `Lesson` interface.
   - Add `Callout` and `QuizQuestion` interfaces.
   - Replace the entire `LessonPage` function (lines ~161–480) with the V2 implementation from the spec, applying the three deviations above (`askLessonAI`, `onNavigate` prop, callouts already typed).
   - Update the single call site in `LearningHub` to pass `onNavigate={openLesson}`.
   - Ensure the lesson select query in `load`/`openLesson` also pulls `callouts` (add to the column list).
3. Verify in the preview: hub still loads, opening a lesson shows the new layout, all 5 tabs work, quiz submit/reset works, notes save, prev/next jumps between lessons, AI tutor returns answers via the edge function.

## Not touching

`GradientThumb`, `MarkdownContent`, `LessonAIAssistant`, `HubAI`, the main `LearningHub` hub view, data loading (`load`, `upsertProg`, `toggleSave`, `toggleComplete`), auth, routes, or any other page.
