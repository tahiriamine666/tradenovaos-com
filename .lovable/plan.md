## Scope
Single-file change to `src/pages/LearningHub.tsx`. Adds a slide-in lesson detail drawer per the uploaded `LESSON_DETAIL_DRAWER_PROMPT.txt` spec. No route/page added. No other file touched.

## Changes

1. **Imports** — add `X` to the lucide-react import (rest are already imported: `BookOpen, Lock, Bookmark, BookmarkCheck, CheckCircle2, Clock, ChevronRight, RefreshCw, Play`).

2. **`LessonDetailDrawer` component** — add above `LearningHub`, exactly as in the spec (header with category/difficulty/PRO/done badges, progress bar, Complete + Save buttons, scrollable tags/description/markdown-rendered content, footer "Up Next" linking to the next lesson by `order_index` in `lessons`).

3. **`LearningHub` state** — add `selectedLesson` and `lessonLoading`.

4. **Handlers** — add `openLesson(lesson)` that fetches the full row from `lessons` (so `content` is hydrated) and sets state; add `closeLesson()`.

5. **`LessonCard` wiring** — add `onOpen` to its props interface; outer wrapper becomes clickable with `cursor-pointer` and `onClick={() => onOpen(lesson)}`; the existing Play button calls `onOpen(lesson)` with `e.stopPropagation()`. Pass `onOpen={openLesson}` where `LessonCard` is rendered. Save/Complete buttons keep their existing `stopPropagation` so they don't trigger open.

6. **Render drawer + loading overlay** — at the end of `LearningHub`'s return, add the two `AnimatePresence` blocks from the spec (loading toast + `LessonDetailDrawer`), wired to `progMap`, `GRADIENT_MAP`, `toggleSave`, `toggleComplete`, and `lessons` for the "next lesson".

## Not changing
Supabase `load()`, category filtering, tabs/search/difficulty, progress/XP/stats logic, AI assistant, leaderboard, hero, any other file or route.
