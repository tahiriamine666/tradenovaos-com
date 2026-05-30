## Scope
Targeted fix to `src/pages/LearningHub.tsx` only. No other files touched.

## Current state vs spec
Most of the spec is already implemented correctly:
- `activeCat` state exists (line 248)
- `filtered` useMemo already does `l.category !== activeCat` with `activeCat` in deps (lines 278–295)
- Category buttons already use `cat.name` for click + active check (lines 405–419)
- `categories` is derived from `lessons` themselves via `l.category`, so counts and names match by string already

So the actual filtering works. The two genuinely missing pieces from the spec are the per-category empty state and the debug logs. I'll add those, plus tighten the toggle handler to match the spec verbatim.

## Changes

1. **Category button onClick** (line 406) — replace with the spec's version so it also resets pagination:
   ```ts
   onClick={() => {
     const next = activeCat === cat.name ? '' : cat.name;
     setActiveCat(next);
     setShowMore(10);
     console.log('[LearningHub] category clicked:', next);
   }}
   ```

2. **Empty state for "category has no lessons yet"** — add a branch before the generic `filtered.length === 0` block (around line 478) that triggers when `filtered.length === 0 && activeCat !== ''`, showing the category emoji, the message, and a "View all lessons" button that clears `activeCat` and resets `showMore`.

3. **Debug `useEffect`** — add after state declarations, logging `activeCat`, `filtered.length`, `lessons.length`, sample `lesson.category`, and sample `categories[0].name`, so the user can confirm strings match in the console.

## Not changing
- `load()`, `toggleSave`, `toggleComplete`, upsert logic
- `LessonCard`, `Thumb`, `AIAssistant`
- Hero, sidebar, leaderboard, progress widgets
- `categories` derivation — it already keys on `l.category` strings, which is what the spec requires (no `learning_categories` table query is needed since lesson rows carry the category name directly)
- Any other file
