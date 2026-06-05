# Lesson Hero Redesign + Position Sizing Tab Content

Apply both uploaded specs to `src/pages/LearningHub.tsx`. Single-file change.

## 1. Lesson type + query
- Add `learning_outcomes: string[]` to the `Lesson` interface.
- Include `learning_outcomes` in the initial `lessons` select (the detail re-fetch already uses `select('*')`).

## 2. New helper component
Add `LessonInfographic({ lesson })` above `LessonContent` per spec. Renders per-slug diagrams (Position Sizing flow, Drawdown zones, FVG 3-candle, Order Blocks), with a generic per-category fallback (icon + 2 lines).

## 3. Premium 3-column lesson hero
Replace the existing lesson header card in `LessonContent` with the spec's hero:
- Top accent bar colored by category
- Left visual panel (220px) with category gradient, badges, `<LessonInfographic/>`, XP + Done indicator
- Center: title, description, "After this lesson you will be able to:" outcomes grid, tags, stats row (completed/rating/time/level)
- Right: animated SVG progress ring (framer-motion), XP card, Mark Complete + Save buttons
- Bottom: full-width animated progress bar
- Remove the duplicate Save / Mark Complete buttons that currently sit above the header card; keep the breadcrumb.

## 4. Rich tabs for `risk-position-sizing`
Inside `LessonContent`, gate by `lesson.slug === 'risk-position-sizing'` to render custom content; all other lessons keep current rendering.

- **Examples tab** — 3 worked examples (NAS100 $10K personal, EURUSD $100K prop, BTC failure case) with stat grids, computation breakdown, and an outcome callout.
- **Practice tab** — interactive scenario quiz: 3 scenarios where user inputs/selects the right position size, with instant feedback (correct/incorrect, math explanation) and a progress tracker.
- **Notes tab** — structured note-taking panel: pre-filled key formulas, editable personal notes textarea (persisted via existing `notes` upsert), and a "copy formula" helper.
- **Resources tab** — curated link list: position size calculators, risk management articles, recommended books, downloadable PDF cheat sheet, with proper external-link styling and icons.

## 5. Imports
Ensure from `lucide-react`: `Target, Clock, Zap, Check, CheckCircle2, Bookmark, BookmarkCheck, ChevronRight` (add any missing). `motion` already imported.

## Not changed
CourseSidebar, HubOverview, Supabase schema, progress/save logic, Quiz tab, AI Tutor, right sidebar.

## Notes
Spec uses raw Tailwind status colors (violet/emerald/amber/red) for semantic meaning with dark-mode variants — followed verbatim as in the previous Position Sizing pass.
