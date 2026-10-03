import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Upload, Maximize2, X, Check, Loader2,
  GripVertical, ArrowUp, ArrowDown, Save, CalendarDays,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import BrandLogo from '@/components/BrandLogo';

// ── Types ─────────────────────────────────────────────────────────────────────
type Impact = 'low' | 'medium' | 'high';
interface NewsItem { id: string; title: string; date?: string; time: string; impact: Impact; notes: string }
interface Rule { id: string; text: string; done: boolean }
interface CheckItem { id: string; text: string }
interface Weekly { bias: string; scenario: string; chart: string; news: NewsItem[]; mainIdea: string }
interface Daily {
  bias: string; price: string; priceCustom: string; scenario: string;
  before: string; after: string; news: NewsItem[];
  risk: { riskPct: string; maxLoss: string; maxTrades: string; rr: string };
  psychology: string[]; psychNotes: string;
  rules: Rule[]; mainIdea: string;
  checklist: CheckItem[]; checked: Record<string, boolean>; modelId: string;
}
interface Model { id: string; name: string; items: CheckItem[] }

const uid = () => crypto.randomUUID();
const EMPTY_WEEKLY: Weekly = { bias: '', scenario: '', chart: '', news: [], mainIdea: '' };
const DEFAULT_CHECK = ['Weekly bias aligned', 'Daily bias confirmed', 'Liquidity identified', 'Key level reached', 'Confirmation present', 'Risk calculated', 'News checked', 'Psychology stable'];
const emptyDaily = (): Daily => ({
  bias: '', price: '', priceCustom: '', scenario: '', before: '', after: '', news: [],
  risk: { riskPct: '', maxLoss: '', maxTrades: '', rr: '' },
  psychology: [], psychNotes: '', rules: [], mainIdea: '',
  checklist: DEFAULT_CHECK.map(text => ({ id: uid(), text })), checked: {}, modelId: '',
});
const BIASES = ['Bullish', 'Bearish', 'Neutral', 'Range'];
const PRICES = ['Premium', 'Discount', 'Mid-Range', 'Custom'];
const PSYCH = ['Calm', 'Focused', 'Confident', 'Neutral', 'Stressed', 'Fearful', 'FOMO', 'Revenge Trading'];

const pad = (n: number) => String(n).padStart(2, '0');
const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const weekStartKey = (k: string) => { const d = fromKey(k); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return toKey(d); };
const longDate = (k: string) => fromKey(k).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

// Seed a v2 plan from legacy columns when an old plan has no v2 data (read only — nothing is moved).
function fromLegacy(row: any): Daily {
  const d = emptyDaily();
  const b = String(row.market_bias || '').toLowerCase();
  d.bias = b === 'ranging' ? 'Range' : b ? b[0].toUpperCase() + b.slice(1) : '';
  d.mainIdea = row.notes || '';
  d.psychNotes = row.psych_notes || '';
  if (row.emotion) { const e = PSYCH.find(p => p.toLowerCase() === String(row.emotion).toLowerCase()); if (e) d.psychology = [e]; }
  d.risk = { riskPct: row.max_risk_per_trade?.toString() ?? '', maxLoss: row.max_daily_loss?.toString() ?? '', maxTrades: row.max_trades?.toString() ?? '', rr: '' };
  return d;
}
const normDaily = (v: any): Daily => ({ ...emptyDaily(), ...v, risk: { ...emptyDaily().risk, ...(v?.risk || {}) } });

// ── Small UI primitives ───────────────────────────────────────────────────────
const card = 'rounded-2xl border border-border bg-card';
const label = 'text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground';
const input = 'w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 outline-none transition-[border-color,box-shadow] duration-300 focus:border-primary/50 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]';

function Field({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2"><p className={label}>{title}</p>{children}</div>;
}
function Chips({ options, value, onChange, multi, disabled }: { options: string[]; value: string | string[]; onChange: (v: any) => void; multi?: boolean; disabled?: boolean }) {
  const sel = (o: string) => (multi ? (value as string[]).includes(o) : value === o);
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => (
        <button key={o} type="button" disabled={disabled}
          onClick={() => multi ? onChange(sel(o) ? (value as string[]).filter(x => x !== o) : [...(value as string[]), o]) : onChange(sel(o) ? '' : o)}
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-300 ${sel(o) ? 'border-primary/60 bg-primary/10 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.18)]' : 'border-border text-muted-foreground hover:text-foreground hover:border-foreground/20'}`}>
          {o}
        </button>
      ))}
    </div>
  );
}
function Area({ value, onChange, placeholder, rows = 4 }: { value: string; onChange: (v: string) => void; placeholder: string; rows?: number }) {
  return <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`${input} resize-y leading-relaxed`} />;
}

// ── Screenshot slot (stored in private bucket, path persisted) ────────────────
function useSigned(path: string) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true;
    if (!path) { setUrl(''); return; }
    supabase.storage.from('trade-screenshots').createSignedUrl(path, 3600).then(({ data }) => { if (alive) setUrl(data?.signedUrl || ''); });
    return () => { alive = false; };
  }, [path]);
  return url;
}
function ImageSlot({ title, path, onChange, readOnly }: { title: string; path: string; onChange?: (p: string) => void; readOnly?: boolean }) {
  const { user } = useAuth();
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState(false);
  const url = useSigned(path);
  const upload = async (f: File) => {
    if (!user || !onChange) return;
    if (!f.type.startsWith('image/')) return toast({ title: 'Please choose an image', variant: 'destructive' });
    if (f.size > 10 * 1024 * 1024) return toast({ title: 'Image must be under 10MB', variant: 'destructive' });
    setBusy(true);
    const p = `${user.id}/plans/${uid()}-${f.name.replace(/[^\w.-]/g, '_')}`;
    const { error } = await supabase.storage.from('trade-screenshots').upload(p, f, { contentType: f.type });
    setBusy(false);
    if (error) return toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    onChange(p);
  };
  if (readOnly && !path) return null;
  return (
    <div className="space-y-2">
      <p className={label}>{title}</p>
      <div className="group relative aspect-video overflow-hidden rounded-xl border border-dashed border-border bg-background/50">
        {url ? (
          <>
            <img src={url} alt={title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-end justify-end gap-1.5 bg-gradient-to-t from-background/80 to-transparent p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <button type="button" onClick={() => setFull(true)} className="rounded-lg bg-card/90 p-1.5 text-foreground hover:text-primary" aria-label="Preview"><Maximize2 className="h-3.5 w-3.5" /></button>
              {!readOnly && <>
                <button type="button" onClick={() => ref.current?.click()} className="rounded-lg bg-card/90 p-1.5 text-foreground hover:text-primary" aria-label="Replace"><Upload className="h-3.5 w-3.5" /></button>
                <button type="button" onClick={() => onChange?.('')} className="rounded-lg bg-card/90 p-1.5 text-foreground hover:text-primary" aria-label="Remove"><Trash2 className="h-3.5 w-3.5" /></button>
              </>}
            </div>
          </>
        ) : path ? (
          <div className="flex h-full items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
        ) : (
          <button type="button" disabled={busy} onClick={() => ref.current?.click()}
            onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) upload(f); }}
            className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground transition-colors hover:text-primary">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
            <span className="text-xs">Upload chart screenshot</span>
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      <Dialog open={full} onOpenChange={setFull}>
        <DialogContent className="max-w-6xl border-border bg-background p-2">
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {url && <img src={url} alt={title} className="max-h-[85vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── News editor ───────────────────────────────────────────────────────────────
function NewsEditor({ items, onChange, withDate }: { items: NewsItem[]; onChange: (n: NewsItem[]) => void; withDate?: boolean }) {
  const up = (id: string, p: Partial<NewsItem>) => onChange(items.map(i => i.id === id ? { ...i, ...p } : i));
  return (
    <div className="space-y-2">
      {items.map(n => (
        <div key={n.id} className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background/40 p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] animate-fade-in">
          <input className={input} placeholder="Event" value={n.title} onChange={e => up(n.id, { title: e.target.value })} />
          {withDate && <input type="date" className={input} value={n.date || ''} onChange={e => up(n.id, { date: e.target.value })} />}
          <input type="time" className={input} value={n.time} onChange={e => up(n.id, { time: e.target.value })} />
          <Select value={n.impact} onValueChange={v => up(n.id, { impact: v as Impact })}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>{(['low', 'medium', 'high'] as Impact[]).map(i => <SelectItem key={i} value={i}>{i[0].toUpperCase() + i.slice(1)}</SelectItem>)}</SelectContent>
          </Select>
          <button type="button" onClick={() => onChange(items.filter(i => i.id !== n.id))} className="justify-self-end rounded-lg p-2 text-muted-foreground hover:text-primary" aria-label="Remove event"><Trash2 className="h-4 w-4" /></button>
          <input className={`${input} col-span-full`} placeholder="Notes" value={n.notes} onChange={e => up(n.id, { notes: e.target.value })} />
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, { id: uid(), title: '', time: '', impact: 'medium', notes: '' }])}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:opacity-80"><Plus className="h-3.5 w-3.5" /> Add event</button>
    </div>
  );
}
function NewsView({ items }: { items: NewsItem[] }) {
  if (!items.length) return <p className="text-sm text-muted-foreground">No events.</p>;
  return (
    <div className="space-y-2">
      {items.map(n => (
        <div key={n.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-xl border border-border bg-background/40 px-3 py-2 text-sm">
          <span className="font-semibold text-foreground">{n.title || 'Untitled event'}</span>
          {n.date && <span className="text-muted-foreground">{n.date}</span>}
          {n.time && <span className="text-muted-foreground">{n.time}</span>}
          <span className={`rounded-md border px-1.5 text-[10px] font-bold uppercase ${n.impact === 'high' ? 'border-primary/60 text-primary' : 'border-border text-muted-foreground'}`}>{n.impact}</span>
          {n.notes && <span className="w-full text-muted-foreground">{n.notes}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Rules ─────────────────────────────────────────────────────────────────────
function RulesEditor({ rules, onChange }: { rules: Rule[]; onChange: (r: Rule[]) => void }) {
  const [draft, setDraft] = useState('');
  const move = (i: number, d: number) => { const r = [...rules]; const j = i + d; if (j < 0 || j >= r.length) return; [r[i], r[j]] = [r[j], r[i]]; onChange(r); };
  const add = () => { if (!draft.trim()) return; onChange([...rules, { id: uid(), text: draft.trim(), done: false }]); setDraft(''); };
  return (
    <div className="space-y-2">
      {rules.map((r, i) => (
        <div key={r.id} className="flex items-center gap-2 rounded-xl border border-border bg-background/40 px-3 py-2">
          <Box checked={r.done} onClick={() => onChange(rules.map(x => x.id === r.id ? { ...x, done: !x.done } : x))} />
          <input className="flex-1 bg-transparent text-sm text-foreground outline-none" value={r.text} onChange={e => onChange(rules.map(x => x.id === r.id ? { ...x, text: e.target.value } : x))} />
          <button type="button" onClick={() => move(i, -1)} className="p-1 text-muted-foreground hover:text-primary" aria-label="Move up"><ArrowUp className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => move(i, 1)} className="p-1 text-muted-foreground hover:text-primary" aria-label="Move down"><ArrowDown className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => onChange(rules.filter(x => x.id !== r.id))} className="p-1 text-muted-foreground hover:text-primary" aria-label="Delete rule"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ))}
      <div className="flex gap-2">
        <input className={input} placeholder="e.g. No confirmation = No trade" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button type="button" onClick={add} className="flex shrink-0 items-center gap-1 rounded-xl border border-primary/40 px-3 text-xs font-semibold text-primary hover:bg-primary/10"><Plus className="h-3.5 w-3.5" /> Add Rule</button>
      </div>
    </div>
  );
}
function Box({ checked, onClick, disabled }: { checked: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-pressed={checked}
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all duration-300 ${checked ? 'border-primary bg-primary text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.4)]' : 'border-foreground/25 hover:border-primary/60'}`}>
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </button>
  );
}

// ── Checklist with robot ──────────────────────────────────────────────────────
function Checklist({ daily, set, models, onModelsChange, readOnly }: { daily: Daily; set: (p: Partial<Daily>) => void; models: Model[]; onModelsChange: () => void; readOnly?: boolean }) {
  const { user } = useAuth();
  const [draft, setDraft] = useState('');
  const [naming, setNaming] = useState<string | null>(null);
  const dragId = useRef<string | null>(null);
  const items = daily.checklist;
  const done = items.filter(i => daily.checked[i.id]).length;
  const complete = items.length > 0 && done === items.length;
  const pct = items.length ? (done / items.length) * 100 : 0;

  const drop = (target: string) => {
    const from = items.findIndex(i => i.id === dragId.current); const to = items.findIndex(i => i.id === target);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...items]; const [m] = next.splice(from, 1); next.splice(to, 0, m); set({ checklist: next });
  };
  const saveModel = async () => {
    if (!user || !naming?.trim()) return;
    const { error } = await (supabase as any).from('checklist_models').insert({ user_id: user.id, name: naming.trim(), items: items.map(({ id, text }) => ({ id, text })) });
    if (error) return toast({ title: 'Could not save model', description: error.message, variant: 'destructive' });
    setNaming(null); onModelsChange(); toast({ title: 'Checklist model saved' });
  };
  const loadModel = (id: string) => {
    const m = models.find(x => x.id === id); if (!m) return;
    // Copy the template structure; completion state stays per-day.
    set({ modelId: id, checklist: m.items.map(i => ({ id: i.id || uid(), text: i.text })), checked: {} });
  };

  return (
    <div className={`${card} relative overflow-hidden p-5 sm:p-6`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={label}>Pre-Trade Checklist</p>
          <p className="mt-1 text-sm text-foreground">{complete ? <span className="text-primary">✓ Checklist Complete</span> : `${done} / ${items.length} Complete`}</p>
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Select value={daily.modelId || undefined} onValueChange={loadModel}>
              <SelectTrigger className="h-9 w-44 rounded-xl text-xs"><SelectValue placeholder="Select Model" /></SelectTrigger>
              <SelectContent>
                {models.length ? models.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>) : <div className="px-2 py-1.5 text-xs text-muted-foreground">No saved models yet</div>}
              </SelectContent>
            </Select>
            <button type="button" onClick={() => setNaming('')} className="flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary"><Save className="h-3.5 w-3.5" /> Save as Model</button>
          </div>
        )}
      </div>
      {naming !== null && (
        <div className="mt-3 flex gap-2 animate-fade-in">
          <input autoFocus className={input} placeholder="Model name, e.g. ICT Model" value={naming} onChange={e => setNaming(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveModel()} />
          <button type="button" onClick={saveModel} className="rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground">Save</button>
          <button type="button" onClick={() => setNaming(null)} className="rounded-xl px-2 text-muted-foreground" aria-label="Cancel"><X className="h-4 w-4" /></button>
        </div>
      )}
      <div className="mt-3 h-1 overflow-hidden rounded-full bg-foreground/[0.06]">
        <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="space-y-1.5">
          {items.map(i => (
            <div key={i.id} draggable={!readOnly} onDragStart={() => (dragId.current = i.id)} onDragOver={e => e.preventDefault()} onDrop={() => drop(i.id)}
              className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-300 ${daily.checked[i.id] ? 'border-primary/30 bg-primary/[0.05]' : 'border-border bg-background/40'}`}>
              {!readOnly && <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/40" />}
              <Box disabled={readOnly} checked={!!daily.checked[i.id]} onClick={() => set({ checked: { ...daily.checked, [i.id]: !daily.checked[i.id] } })} />
              {readOnly ? <span className="flex-1 text-sm text-foreground">{i.text}</span> :
                <input className={`flex-1 bg-transparent text-sm outline-none transition-colors ${daily.checked[i.id] ? 'text-foreground/60' : 'text-foreground'}`} value={i.text} onChange={e => set({ checklist: items.map(x => x.id === i.id ? { ...x, text: e.target.value } : x) })} />}
              {!readOnly && <button type="button" onClick={() => set({ checklist: items.filter(x => x.id !== i.id) })} className="p-1 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-primary" aria-label="Delete item"><Trash2 className="h-3.5 w-3.5" /></button>}
            </div>
          ))}
          {!readOnly && (
            <div className="flex gap-2 pt-1">
              <input className={input} placeholder="Add checklist item" value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && draft.trim()) { set({ checklist: [...items, { id: uid(), text: draft.trim() }] }); setDraft(''); } }} />
              <button type="button" onClick={() => { if (draft.trim()) { set({ checklist: [...items, { id: uid(), text: draft.trim() }] }); setDraft(''); } }}
                className="flex shrink-0 items-center gap-1 rounded-xl border border-primary/40 px-3 text-xs font-semibold text-primary hover:bg-primary/10"><Plus className="h-3.5 w-3.5" /> Add Item</button>
            </div>
          )}
        </div>
        <div className="relative mx-auto w-28 sm:w-40">
          <div className={`absolute inset-0 rounded-full bg-primary blur-3xl transition-opacity duration-700 ${complete ? 'opacity-30' : 'opacity-[0.08]'}`} />
          <BrandLogo className="relative w-full select-none rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function PlanCalendar({ selected, onSelect, savedDates }: { selected: string; onSelect: (k: string) => void; savedDates: Set<string> }) {
  const [view, setView] = useState(() => { const d = fromKey(selected); return new Date(d.getFullYear(), d.getMonth(), 1); });
  useEffect(() => { const d = fromKey(selected); setView(v => v.getMonth() === d.getMonth() && v.getFullYear() === d.getFullYear() ? v : new Date(d.getFullYear(), d.getMonth(), 1)); }, [selected]);
  const today = toKey(new Date());
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(view.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => toKey(new Date(view.getFullYear(), view.getMonth(), i + 1)))];
  return (
    <div className={`${card} p-4`}>
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground"><CalendarDays className="h-4 w-4 text-primary" /> Calendar</p>
        <button type="button" onClick={() => onSelect(today)} className="rounded-lg border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground hover:border-primary/40 hover:text-primary">Today</button>
      </div>
      <div className="mb-2 flex items-center justify-between">
        <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="rounded-lg p-1.5 text-muted-foreground hover:text-primary" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-semibold text-foreground">{view.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
        <button type="button" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="rounded-lg p-1.5 text-muted-foreground hover:text-primary" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <span key={d} className="py-1 text-[10px] font-semibold text-muted-foreground">{d}</span>)}
        {cells.map((k, i) => k ? (
          <button key={k} type="button" onClick={() => onSelect(k)} aria-pressed={k === selected}
            className={`relative aspect-square rounded-lg text-xs transition-all duration-300 ${k === selected ? 'bg-primary text-primary-foreground shadow-[0_0_16px_hsl(var(--primary)/0.45)]' : k === today ? 'border border-primary/60 text-primary' : 'text-foreground/80 hover:bg-foreground/[0.06]'}`}>
            {Number(k.slice(8))}
            {savedDates.has(k) && <span className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${k === selected ? 'bg-primary-foreground' : 'bg-primary'}`} />}
          </button>
        ) : <span key={`e${i}`} />)}
      </div>
    </div>
  );
}

// ── Full View blocks ──────────────────────────────────────────────────────────
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-2 border-t border-border pt-5 first:border-0 first:pt-0"><p className={label}>{title}</p>{children}</div>;
}
const Text = ({ v }: { v: string }) => v?.trim() ? <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{v}</p> : <p className="text-sm text-muted-foreground">—</p>;
const Tag = ({ v }: { v: string }) => v ? <span className="inline-block rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{v}</span> : <span className="text-sm text-muted-foreground">—</span>;

// ── Main ──────────────────────────────────────────────────────────────────────
type Tab = 'weekly' | 'daily' | 'full';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export default function TradePlanV2() {
  const { user } = useAuth();
  const today = toKey(new Date());
  const [date, setDate] = useState(today);
  const [tab, setTab] = useState<Tab>('daily');
  const [calOpen, setCalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [daily, setDaily] = useState<Daily>(emptyDaily);
  const [weekly, setWeekly] = useState<Weekly>(EMPTY_WEEKLY);
  const [dailyExists, setDailyExists] = useState(false);
  const [creating, setCreating] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [state, setState] = useState<SaveState>('idle');
  const week = weekStartKey(date);

  // Refs to flush pending edits to the date they belong to.
  const prevAi = useRef<Record<string, any>>({});
  const pending = useRef<{ daily?: { date: string; data: Daily }; weekly?: { week: string; data: Weekly } }>({});
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const loadModels = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any).from('checklist_models').select('id,name,items').eq('user_id', user.id).order('created_at');
    setModels((data || []) as Model[]);
  }, [user]);
  const loadSaved = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('trade_plans').select('plan_date').eq('user_id', user.id).order('plan_date', { ascending: false }).limit(1000);
    setSaved(new Set((data || []).map((r: any) => r.plan_date)));
  }, [user]);
  useEffect(() => { loadModels(); loadSaved(); }, [loadModels, loadSaved]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const p = pending.current; pending.current = {};
    if (!user || (!p.daily && !p.weekly)) return;
    setState('saving');
    try {
      if (p.daily) {
        const d = p.daily.data;
        const num = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? null : Number(v));
        const { error } = await supabase.from('trade_plans').upsert({
          user_id: user.id, plan_date: p.daily.date,
          market_bias: d.bias ? (d.bias === 'Range' ? 'ranging' : d.bias.toLowerCase()) : 'neutral',
          notes: d.mainIdea, psych_notes: d.psychNotes,
          emotion: d.psychology[0]?.toLowerCase() || null,
          max_risk_per_trade: num(d.risk.riskPct), max_daily_loss: num(d.risk.maxLoss),
          max_trades: num(d.risk.maxTrades) as any,
          ai_analysis: { ...prevAi.current, daily_v2: d },
        } as any, { onConflict: 'user_id,plan_date' });
        if (error) throw error;
        prevAi.current = { ...prevAi.current, daily_v2: d };
        setSaved(s => new Set(s).add(p.daily!.date));
        if (p.daily.date === dateRef.current) setDailyExists(true);
      }
      if (p.weekly) {
        const w = p.weekly.data;
        const filled = [w.bias, w.scenario, w.chart, w.mainIdea].filter(Boolean).length + (w.news.length ? 1 : 0);
        const { error } = await supabase.from('trade_plan_checklists').upsert({
          user_id: user.id, account_key: 'all', checklist_type: 'weekly_outlook', period_date: p.weekly.week,
          data: w as any, status: filled === 0 ? 'empty' : filled === 5 ? 'complete' : 'partial',
        }, { onConflict: 'user_id,account_key,checklist_type,period_date' });
        if (error) throw error;
      }
      setState('saved');
    } catch (e: any) {
      setState('error');
      toast({ title: 'Could not save plan', description: e?.message, variant: 'destructive' });
    }
  }, [user]);
  const dateRef = useRef(date); dateRef.current = date;

  useEffect(() => {
    const h = () => { flush(); };
    window.addEventListener('pagehide', h);
    return () => { window.removeEventListener('pagehide', h); flush(); };
  }, [flush]);

  // Load the selected day's plan and its week's outlook.
  useEffect(() => {
    if (!user) return;
    let alive = true;
    setLoading(true); setCreating(false);
    (async () => {
      const [{ data: row }, { data: wk }] = await Promise.all([
        supabase.from('trade_plans').select('*').eq('user_id', user.id).eq('plan_date', date).maybeSingle(),
        supabase.from('trade_plan_checklists').select('data').eq('user_id', user.id).eq('account_key', 'all').eq('checklist_type', 'weekly_outlook').eq('period_date', week).maybeSingle(),
      ]);
      if (!alive) return;
      const ai = ((row as any)?.ai_analysis || {}) as Record<string, any>;
      prevAi.current = ai;
      setDaily(row ? (ai.daily_v2 ? normDaily(ai.daily_v2) : fromLegacy(row)) : emptyDaily());
      setDailyExists(!!row);
      setWeekly({ ...EMPTY_WEEKLY, ...((wk as any)?.data || {}) });
      setLoading(false); setState('idle');
    })();
    return () => { alive = false; };
  }, [user, date, week]);

  const schedule = () => { setState('saving'); clearTimeout(timer.current); timer.current = setTimeout(flush, 1000); };
  const setD = (p: Partial<Daily>) => setDaily(prev => { const n = { ...prev, ...p }; pending.current.daily = { date, data: n }; schedule(); return n; });
  const setW = (p: Partial<Weekly>) => setWeekly(prev => { const n = { ...prev, ...p }; pending.current.weekly = { week, data: n }; schedule(); return n; });

  const go = async (k: string) => { await flush(); setDate(k); setCalOpen(false); };
  const showDaily = dailyExists || creating || date === today;

  const weekLabel = useMemo(() => {
    const s = fromKey(week); const e = new Date(s); e.setDate(e.getDate() + 6);
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }, [week]);

  const empty = (
    <div className={`${card} flex flex-col items-center gap-4 px-6 py-16 text-center animate-fade-in`}>
      <p className="text-sm text-muted-foreground">No plan saved for this day</p>
      <button type="button" onClick={() => setCreating(true)} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]"><Plus className="h-4 w-4" /> Create Plan</button>
    </div>
  );

  const calendar = <PlanCalendar selected={date} onSelect={go} savedDates={saved} />;

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Trade Plan</h1>
          <p className="mt-1 text-sm text-muted-foreground">{longDate(date)}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
            {state === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</>}
            {state === 'saved' && <><Check className="h-3 w-3 text-primary" /> Saved</>}
            {state === 'error' && <span className="text-destructive">Not saved</span>}
          </span>
          <button type="button" onClick={() => { if (tab === 'daily' && showDaily) pending.current.daily = { date, data: daily }; if (tab === 'weekly') pending.current.weekly = { week, data: weekly }; flush(); }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.25)] transition-opacity hover:opacity-90"><Save className="h-4 w-4" /> Save Plan</button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="hidden lg:block">{calendar}</div>
          <div className="lg:hidden">
            <button type="button" onClick={() => setCalOpen(o => !o)} className={`${card} flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground`}>
              <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Calendar</span>
              <ChevronRight className={`h-4 w-4 transition-transform duration-300 ${calOpen ? 'rotate-90' : ''}`} />
            </button>
            {calOpen && <div className="mt-2 animate-fade-in">{calendar}</div>}
          </div>
        </aside>

        <main className="min-w-0 space-y-5">
          <div className="inline-flex rounded-xl border border-border bg-card p-1">
            {([['weekly', 'Weekly Outlook'], ['daily', 'Daily Plan'], ['full', 'Full View']] as [Tab, string][]).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setTab(k)} aria-pressed={tab === k}
                className={`rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-300 sm:px-4 ${tab === k ? 'bg-primary/15 text-primary shadow-[0_0_14px_hsl(var(--primary)/0.15)]' : 'text-muted-foreground hover:text-foreground'}`}>{l}</button>
            ))}
          </div>

          {loading ? (
            <div className={`${card} flex items-center justify-center py-20`}><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : (
            <div key={`${tab}-${date}`} className="content-crossfade space-y-5">
              {tab === 'weekly' && (
                <div className={`${card} space-y-6 p-5 sm:p-6`}>
                  <div><p className={label}>Weekly Outlook</p><p className="mt-1 text-sm text-foreground">{weekLabel}</p></div>
                  <Field title="Weekly Bias"><Chips options={BIASES} value={weekly.bias} onChange={v => setW({ bias: v })} /></Field>
                  <Field title="Scenario"><Area value={weekly.scenario} onChange={v => setW({ scenario: v })} placeholder="Describe the main scenario expected for this week..." /></Field>
                  <div className="max-w-xl"><ImageSlot title="Chart Screenshot" path={weekly.chart} onChange={p => setW({ chart: p })} /></div>
                  <Field title="News / Events"><NewsEditor withDate items={weekly.news} onChange={n => setW({ news: n })} /></Field>
                  <Field title="Main Idea"><Area value={weekly.mainIdea} onChange={v => setW({ mainIdea: v })} placeholder="What is the main idea for this trading week?" /></Field>
                </div>
              )}

              {tab === 'daily' && (!showDaily ? empty : (
                <>
                  <div className={`${card} space-y-6 p-5 sm:p-6`}>
                    <div className="grid gap-6 md:grid-cols-2">
                      <Field title="Market Bias"><Chips options={BIASES} value={daily.bias} onChange={v => setD({ bias: v })} /></Field>
                      <Field title="Current Price">
                        <Chips options={PRICES} value={daily.price} onChange={v => setD({ price: v })} />
                        {daily.price === 'Custom' && <input className={input} placeholder="Describe price location" value={daily.priceCustom} onChange={e => setD({ priceCustom: e.target.value })} />}
                      </Field>
                    </div>
                    <Field title="Daily Scenario"><Area value={daily.scenario} onChange={v => setD({ scenario: v })} placeholder="Describe today's expected scenario..." /></Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <ImageSlot title="Before" path={daily.before} onChange={p => setD({ before: p })} />
                      <ImageSlot title="After" path={daily.after} onChange={p => setD({ after: p })} />
                    </div>
                    <Field title="News"><NewsEditor items={daily.news} onChange={n => setD({ news: n })} /></Field>
                    <Field title="Risk Management">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {([['riskPct', 'Risk %', '1'], ['maxLoss', 'Max Daily Loss', '500'], ['maxTrades', 'Max Trades', '2'], ['rr', 'R:R Target', '1:3']] as const).map(([k, l, ph]) => (
                          <label key={k} className="space-y-1"><span className="text-xs text-muted-foreground">{l}</span>
                            <input className={input} placeholder={ph} value={daily.risk[k]} onChange={e => setD({ risk: { ...daily.risk, [k]: e.target.value } })} /></label>
                        ))}
                      </div>
                    </Field>
                    <Field title="Psychology">
                      <Chips multi options={PSYCH} value={daily.psychology} onChange={v => setD({ psychology: v })} />
                      <Area rows={2} value={daily.psychNotes} onChange={v => setD({ psychNotes: v })} placeholder="How do you feel before trading today?" />
                    </Field>
                    <Field title="Rules"><RulesEditor rules={daily.rules} onChange={r => setD({ rules: r })} /></Field>
                    <Field title="Main Idea"><Area value={daily.mainIdea} onChange={v => setD({ mainIdea: v })} placeholder="What is today's main trading idea?" /></Field>
                  </div>
                  <Checklist daily={daily} set={setD} models={models} onModelsChange={loadModels} />
                </>
              ))}

              {tab === 'full' && (
                <div className={`${card} space-y-5 p-5 sm:p-8`}>
                  <h2 className="font-heading text-xl font-semibold text-foreground">{longDate(date)}</h2>
                  <Block title={`Weekly Context · ${weekLabel}`}>
                    <div className="space-y-4">
                      <Tag v={weekly.bias} />
                      <Text v={weekly.scenario} />
                      <div className="max-w-xl"><ImageSlot readOnly title="Weekly Chart" path={weekly.chart} /></div>
                      <NewsView items={weekly.news} />
                      <div><p className="mb-1 text-xs text-muted-foreground">Main idea</p><Text v={weekly.mainIdea} /></div>
                    </div>
                  </Block>
                  {!dailyExists ? <Block title="Daily Plan"><p className="text-sm text-muted-foreground">No plan saved for this day</p></Block> : <>
                    <Block title="Daily Plan">
                      <div className="flex flex-wrap gap-2"><Tag v={daily.bias} /><Tag v={daily.price === 'Custom' ? daily.priceCustom || 'Custom' : daily.price} /></div>
                      <Text v={daily.scenario} />
                    </Block>
                    {(daily.before || daily.after) && <Block title="Before / After Charts"><div className="grid gap-4 sm:grid-cols-2"><ImageSlot readOnly title="Before" path={daily.before} /><ImageSlot readOnly title="After" path={daily.after} /></div></Block>}
                    <Block title="News"><NewsView items={daily.news} /></Block>
                    <Block title="Risk Management">
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {([['Risk %', daily.risk.riskPct], ['Max Daily Loss', daily.risk.maxLoss], ['Max Trades', daily.risk.maxTrades], ['R:R Target', daily.risk.rr]]).map(([l, v]) => (
                          <div key={l} className="rounded-xl border border-border bg-background/40 px-3 py-2"><p className="text-[11px] text-muted-foreground">{l}</p><p className="text-sm font-semibold text-foreground">{v || '—'}</p></div>
                        ))}
                      </div>
                    </Block>
                    <Block title="Psychology"><div className="flex flex-wrap gap-2">{daily.psychology.length ? daily.psychology.map(p => <Tag key={p} v={p} />) : <Tag v="" />}</div><Text v={daily.psychNotes} /></Block>
                    <Block title="Rules">
                      {daily.rules.length ? daily.rules.map(r => <div key={r.id} className="flex items-center gap-2 text-sm text-foreground"><Box disabled checked={r.done} />{r.text}</div>) : <p className="text-sm text-muted-foreground">—</p>}
                    </Block>
                    <Block title="Main Idea"><Text v={daily.mainIdea} /></Block>
                    <Checklist readOnly daily={daily} set={() => {}} models={models} onModelsChange={() => {}} />
                  </>}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
