## Goal
Make the Mind Journal search bar, mood dropdown, and tabs actually filter the Supabase-loaded entries, with a proper empty state and clear-filters action.

## Changes (all in `src/pages/MindJournal.tsx`)

1. **Add tab state**
   `const [activeTab, setActiveTab] = useState<'all'|'mistakes'|'lessons'|'emotions'>('all');`

2. **Rewrite the `filtered` useMemo** to combine:
   - Live search across `mood`, `notes`, `mistakes`, `mistakes_list[]`, `lesson`, `bias`, `emotional_trigger`, `what_went_well`, `summary`
   - `filterMood` exact match on `e.mood`
   - Existing date filter
   - `activeTab`:
     - `mistakes` → entries with `mistakes_list.length > 0` or non-empty `mistakes`
     - `lessons` → entries with non-empty `lesson`
     - `emotions` → entries with `emotional_trigger` or `mood`

3. **Make tabs interactive** — replace the static buttons with onClick handlers driven by `activeTab`, active state styling, and a small count badge per tab.

4. **Add filtered-empty state** — when `entries.length > 0` but `filtered.length === 0`, show "No entries match this filter" with a **Clear all filters** button (resets search, mood, date, tab). Keep the existing "Log First Entry" state for when there are zero entries at all.

5. **Mood dropdown** — keep dynamic options from existing `MOODS` constant; ensure "All Moods" uses `value=""` so it actually clears.

6. **Reset button** — also clear `activeTab`, and show it whenever any filter (including a non-`all` tab) is active.

## Out of scope
NewEntryModal, EntryCard, AI review, stats, sidebar, Supabase queries — untouched. No backend changes.