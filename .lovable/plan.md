## Draggable Trade Plan Workspace

Add drag-and-drop + resize + per-widget collapse to the existing Trade Plan workspace, with layout persisted per user.

### 1. Dependency

Add `react-grid-layout` (^1.4.4). Its peer dep `react-resizable` comes bundled. Import its CSS once at the top of `TradePlanWorkspace.tsx`:

```
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
```

### 2. New table: `workspace_layouts`

Persist layout per user per page (so this pattern can later be reused on other dashboards).

```text
workspace_layouts
  user_id     uuid    (fk auth.users, on delete cascade)
  page        text    -- e.g. 'trade_plan'
  layout      jsonb   default '[]'
  preferences jsonb   default '{}'   -- { collapsed: {...}, locked: bool }
  updated_at  timestamptz default now()
  PRIMARY KEY (user_id, page)
```

RLS: enable; owner-only select/insert/update/delete using `auth.uid() = user_id`. No new role/admin policies needed.

### 3. Refactor `src/components/TradePlanWorkspace.tsx`

Keep all current data/state/AI logic. Add the layout layer around the existing sections:

- New state: `layout`, `editLayoutMode`, `locked`, `collapsed`, `containerWidth`, `containerRef`.
- `DEFAULT_LAYOUT` + `WIDGET_META` constants for 6 widgets: `market`, `checklist`, `risk`, `news`, `psychology`, `notes`.
- On mount: load saved layout from `workspace_layouts` (fallback to `localStorage` key `tradenova_plan_layout_v2`, then `DEFAULT_LAYOUT`).
- `saveLayout()` writes to localStorage immediately and upserts to Supabase. `resetLayout()` restores `DEFAULT_LAYOUT`.
- `ResizeObserver` on container → updates `containerWidth` for `GridLayout`.
- New `DraggableWidget` wrapper component renders a uniform header (icon + title + collapse chevron + grip when editing) and a scrollable body.
- Replace the section list in the render with a single `<GridLayout cols={12} rowHeight={44} draggableHandle=".widget-drag-handle" isDraggable={editLayoutMode && !locked} isResizable={editLayoutMode && !locked} onLayoutChange={setLayout}>` containing the six widgets. The existing section JSX (Market Overview, Checklist, Risk, News, Psychology, Notes) is moved verbatim into the matching `<DraggableWidget>` children.
- Toolbar gains: **Edit Layout** / **Save Layout** / **Reset** / **Done** / **Lock-Unlock** buttons next to the existing AI + Save Plan buttons; show a violet banner while in edit mode.

No changes to the AI edge function, plan autosave, or `src/pages/TradePlanWorkspace.tsx` wrapper.

### 4. Files touched

- `package.json` — add `react-grid-layout`.
- `supabase/migrations/<ts>_workspace_layouts.sql` — new table + RLS.
- `src/components/TradePlanWorkspace.tsx` — add grid layer (largest change; existing widget bodies preserved).
- `src/integrations/supabase/types.ts` — regenerated automatically after migration.

### Notes / risks

- Drag handle uses the widget header (`.widget-drag-handle` on each grid child). Inner form controls remain interactive because the handle is restricted to the header bar.
- The checklist already has internal HTML5 drag-and-drop for reordering tasks; that keeps working because grid drag is scoped to the header.
- `react-grid-layout` requires a numeric `width`; we measure via ResizeObserver, so it works inside the existing AppLayout without hardcoding.
- Layout JSON is small (~6 objects); `jsonb` is fine, no extra indexes needed.
