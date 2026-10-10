import { useState } from "react";
import { ArrowUp, ArrowDown, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DEFAULT_LAYOUT, WIDGETS, moveWidget, type DashboardLayout, type WidgetId } from "@/lib/dashboard/layout";

export default function DashboardLayoutEditor({ initial, onSave, onClose }: {
  initial: DashboardLayout; onSave: (layout: DashboardLayout) => Promise<void>; onClose: () => void;
}) {
  const [draft, setDraft] = useState<DashboardLayout>(() => ({ order: [...initial.order], hidden: [...initial.hidden] }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function move(id: WidgetId, target?: WidgetId) {
    if (target) setDraft(d => ({ ...d, order: moveWidget(d.order, id, target) }));
  }
  async function save() {
    setSaving(true); setError(null);
    try { await onSave(draft); onClose(); }
    catch { setError("Could not save your layout. Your changes are still here; please try again."); }
    finally { setSaving(false); }
  }

  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose(); }}>
    <DialogContent className="max-w-lg max-h-[90dvh] flex flex-col gap-4" aria-describedby={undefined}
      onEscapeKeyDown={e => { if (saving) e.preventDefault(); }} onPointerDownOutside={e => { if (saving) e.preventDefault(); }}>
      <DialogHeader><DialogTitle>Edit Layout</DialogTitle></DialogHeader>
      <ol className="overflow-y-auto min-h-0 divide-y divide-border -mx-1 px-1">
        {draft.order.map((id, index) => {
          const widget = WIDGETS.find(w => w.id === id);
          if (!widget) return null;
          return <li key={id} className="flex items-center gap-2 py-2.5">
            <span className="w-5 shrink-0 text-xs text-muted-foreground tabular-nums">{index + 1}</span>
            <span className="flex-1 min-w-0 text-sm font-medium">{widget.label}</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={saving || index === 0}
              aria-label={`Move ${widget.label} up`} title={`Move ${widget.label} up`} onClick={() => move(id, draft.order[index - 1])}><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" disabled={saving || index === draft.order.length - 1}
              aria-label={`Move ${widget.label} down`} title={`Move ${widget.label} down`} onClick={() => move(id, draft.order[index + 1])}><ArrowDown className="h-4 w-4" /></Button>
            <Switch aria-label={`Show ${widget.label}`} checked={!draft.hidden.includes(id)} disabled={saving}
              onCheckedChange={checked => setDraft(d => ({ ...d, hidden: checked ? d.hidden.filter(x => x !== id) : [...d.hidden, id] }))} />
          </li>;
        })}
      </ol>
      {error && <p role="alert" className="text-sm text-foreground">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <Button variant="ghost" size="sm" disabled={saving} onClick={() => setDraft({ order: [...DEFAULT_LAYOUT.order], hidden: [] })}>
          <RotateCcw className="h-4 w-4 mr-1.5" /> Reset to Default
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={saving} onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={saving} onClick={save}><Save className="h-4 w-4 mr-1.5" />{saving ? "Saving…" : "Save Layout"}</Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>;
}