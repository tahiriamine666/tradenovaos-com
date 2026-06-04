# Lesson Page V2 — Rich Visual Upgrade

Apply the uploaded `LESSON_PAGE_V2_PROMPT` spec to `src/pages/LearningHub.tsx`. Sidebar, hub overview, data loading, progress, quiz, notes, resources, and right sidebar are NOT touched.

## Changes (one file: `src/pages/LearningHub.tsx`)

1. **Imports** — add `X` and `Zap` from `lucide-react`.

2. **Add 7 visual helper components** (above `LessonPage`):
   - `CalloutBox` — tip / warning / important boxes with icon + colored border
   - `FormulaBox` — bordered formula display
   - `ComparisonCard` — two-column emerald vs red comparison
   - `DataTable` — themed table for headers + rows
   - `RRVisual` — risk/reward bar visualization
   - `ChecklistItem` — green check / red X row
   - `PositionSizeCalculator` — interactive (Account × Risk % ÷ Stop = Position Size)

3. **Replace the existing `renderContent` helper inside `LessonPage`** with `renderRichContent(lesson, callouts)`:
   - If `lesson.slug === 'risk-position-sizing'` → return the full 9-section custom layout (What is Position Sizing, Why It Matters, Risk Per Trade tiers + table, Formula + examples + interactive calculator, R:R visuals + math proof, Mistakes checklist, Prop Firm Risk Model, Practical Example walkthrough, Pre-Trade Checklist).
   - Otherwise → fall back to the existing enhanced markdown parser (headings, bold, lists, numbered, tables, callouts inserted at heading 2 & 4).

4. **Lesson tab render** — wrap call in:
   ```tsx
   <div className="rounded-2xl border border-border bg-card p-6">
     {renderRichContent(lesson, callouts)}
   </div>
   ```

## Not changed
CourseSidebar, HubOverview, Supabase queries, toggleComplete/Save, upsertProg, Key Takeaways, Quiz, Notes, Resources, LessonRightSidebar.

## Notes
Spec uses raw Tailwind color utilities (emerald/red/violet/amber). This deviates from our semantic-token rule, but the prompt is explicit and the colors are intentional for status/semantic meaning (success, danger, warning, highlight) and already include dark-mode variants. Will follow the spec verbatim.
