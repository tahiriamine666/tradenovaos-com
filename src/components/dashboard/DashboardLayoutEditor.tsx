import { useState, type ReactNode } from "react";
import { ArrowUp, ArrowDown, Eye, EyeOff, GripVertical, RotateCcw, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_LAYOUT, WIDGETS, moveWidget, type DashboardLayout, type WidgetId } from "@/lib/dashboard/layout";

/**
 * Inline dashboard layout editor. Widgets render as stable DOM nodes in WIDGETS order;
 * visual order comes from CSS `order` so HTML5 drag is never cancelled by node moves.
 */
export default function DashboardLayoutEditor({ initial, onSave, onClose, widgets = {} }: {
  initial: DashboardLayout;
  onSave: (layout: DashboardLayout) => Promise<void>;
  onClose: () => void;
  widgets?: Partial<Record<WidgetId, ReactNode>>;
}) {
  const [draft, setDraft] = useState<DashboardLayout>(() => ({ order: [...initial.order], hidden: [...initial.hidden] }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState<WidgetId | null>(null);
  const [over, setOver] = useState<WidgetId | null>(null);

  const move = (id: WidgetId, target?: WidgetId) => {
    if (target) setDraft(d => ({ ...d, order: moveWidget(d.order, id, target) }));
  };
  const toggle = (id: WidgetId) => setDraft(d => ({
    ...d, hidden: d.hidden.includes(id) ? d.hidden.filter(x => x !== id) : [...d.hidden, id],
  }));

  async function save() {
    setSaving(true); setError(null);
    try { await onSave(draft); onClose(); }
    catch { setError("Could not save your layout. Your changes are still here; please try again."); }
    finally { setSaving(false); }
  }

  const hiddenCount = draft.hidden.length;

  return <div className="space-y-4" data-dashboard-layout-editor>
    <div role="toolbar" aria-label="Dashboard layout editor"
      className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-card/95 px-3 py-2 shadow-sm backdrop-blur">
      <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
        <GripVertical className="h-3.5 w-3.5 text-primary" /> Editing layout
      </span>
      <span className="hidden sm:inline text-[11px] text-muted-foreground">
        Drag cards to reorder · use arrows on touch or keyboard{hiddenCount ? ` · ${hiddenCount} hidden` : ""}
      </span>
      <div className="ml-auto flex flex-wrap gap-1.5">
        <Button variant="ghost" size="sm" disabled={saving} onClick={() => setDraft({ order: [...DEFAULT_LAYOUT.order], hidden: [] })}>
          <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset to Default
        </Button>
        <Button variant="outline" size="sm" disabled={saving} onClick={onClose}><X className="h-3.5 w-3.5 mr-1" />Cancel</Button>
        <Button size="sm" disabled={saving} onClick={save}><Save className="h-3.5 w-3.5 mr-1" />{saving ? "Saving…" : "Save Layout"}</Button>
      </div>
      {error && <p role="alert" className="basis-full text-xs text-foreground">{error}</p>}
    </div>

    <ol className="grid grid-cols-2 lg:grid-cols-12 gap-4 items-start" aria-label="Dashboard widgets">
      {WIDGETS.map(widget => {
        const id = widget.id;
        const index = draft.order.indexOf(id);
        const hidden = draft.hidden.includes(id);
        const content = widgets[id];
        return <li key={id} data-dashboard-widget={id} style={{ order: index }}
          draggable={!saving}
          onDragStart={e => { setDragging(id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", id); }}
          onDragOver={e => { if (dragging) { e.preventDefault(); if (over !== id) setOver(id); if (dragging !== id) move(dragging, id); } }}
          onDrop={e => e.preventDefault()}
          onDragEnd={() => { setDragging(null); setOver(null); }}
          aria-label={`${widget.label}, position ${index + 1} of ${draft.order.length}${hidden ? ", hidden" : ""}`}
          className={`relative min-w-0 rounded-xl border border-dashed transition-[border-color,opacity,box-shadow] ${widget.span} ${
            dragging === id ? "border-primary opacity-60" : over === id && dragging ? "border-primary" : "border-primary/40 hover:border-primary"
          } ${hidden ? "opacity-50" : ""}`}>
          <div className="flex items-center gap-1 rounded-t-xl border-b border-border bg-card/90 px-2 py-1">
            <GripVertical aria-hidden className="h-4 w-4 cursor-grab text-primary active:cursor-grabbing" />
            <span className="flex-1 min-w-0 truncate text-xs font-medium text-foreground">{widget.label}</span>
            {hidden && <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Hidden</span>}
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={saving || index === 0}
              aria-label={`Move ${widget.label} up`} title="Move earlier" onClick={() => move(id, draft.order[index - 1])}><ArrowUp className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={saving || index === draft.order.length - 1}
              aria-label={`Move ${widget.label} down`} title="Move later" onClick={() => move(id, draft.order[index + 1])}><ArrowDown className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={saving} aria-pressed={!hidden}
              aria-label={`${hidden ? "Show" : "Hide"} ${widget.label}`} title={hidden ? "Show widget" : "Hide widget"} onClick={() => toggle(id)}>
              {hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-primary" />}
            </Button>
          </div>
          <div aria-hidden className="pointer-events-none select-none max-h-[420px] overflow-hidden">
            {content ?? <div className="px-3 py-6 text-center text-xs text-muted-foreground">No data to preview</div>}
          </div>
        </li>;
      })}
    </ol>
  </div>;
}
