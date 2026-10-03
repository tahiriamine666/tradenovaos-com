import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, History, Copy, Plus, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type ChecklistType = 'daily' | 'weekly';
type Status = 'empty' | 'partial' | 'complete';

const pad = (n: number) => String(n).padStart(2, '0');
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const weekStart = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); const day = (x.getDay() + 6) % 7; return addDays(x, -day); };
const periodOf = (type: ChecklistType, d: Date) => type === 'weekly' ? weekStart(d) : new Date(d.getFullYear(), d.getMonth(), d.getDate());
const shift = (type: ChecklistType, d: Date, dir: number) => addDays(d, dir * (type === 'weekly' ? 7 : 1));

const fmtShort = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtLong = (type: ChecklistType, d: Date) => type === 'weekly'
  ? `${d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${addDays(d, 6).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
  : d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

function computeStatus(data: Record<string, any>, fields: string[]): Status {
  const filled = fields.filter(f => typeof data[f] === 'string' ? data[f].trim() !== '' : !!data[f]).length;
  if (filled === 0) return 'empty';
  return filled === fields.length ? 'complete' : 'partial';
}

export function StatusDot({ status }: { status: Status }) {
  const label = status === 'complete' ? 'Complete' : status === 'partial' ? 'Partial' : 'Empty';
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
      <span className={`h-1.5 w-1.5 rounded-full ${status === 'complete' ? 'bg-primary' : status === 'partial' ? 'bg-primary/40' : 'border border-white/30'}`} />
      {label}
    </span>
  );
}

const btn = 'flex items-center gap-1 px-2 py-1 rounded-lg border border-white/[0.08] text-[10px] font-bold text-white/45 hover:text-primary hover:border-primary/30 transition-colors disabled:opacity-40';

interface Props<T extends Record<string, any>> {
  type: ChecklistType;
  title: string;
  icon: React.ElementType;
  template: T;
  statusFields: (keyof T & string)[];
  children: (data: T, set: (patch: Partial<T>) => void) => React.ReactNode;
}

export default function DatedChecklist<T extends Record<string, any>>({ type, title, icon: Icon, template, statusFields, children }: Props<T>) {
  const { user } = useAuth();
  const { activeAccountId } = useActiveAccount();
  const accountKey = activeAccountId ?? 'all';
  const unit = type === 'weekly' ? 'Week' : 'Day';

  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState(() => periodOf(type, new Date()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<T | null>(null);
  const [save, setSave] = useState<'idle' | 'dirty' | 'saving' | 'saved'>('idle');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<{ period_date: string; status: Status }[]>([]);
  const [copyOpen, setCopyOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const pending = useRef<{ key: string; account: string; data: T } | null>(null);
  const timer = useRef<number>();
  const reqId = useRef(0);

  const persist = useCallback(async () => {
    const p = pending.current;
    if (!p || !user) return;
    pending.current = null;
    setSave('saving');
    const { error } = await supabase.from('trade_plan_checklists').upsert({
      user_id: user.id,
      account_id: p.account === 'all' ? null : p.account,
      account_key: p.account,
      checklist_type: type,
      period_date: p.key,
      data: p.data as any,
      status: computeStatus(p.data, statusFields),
    }, { onConflict: 'user_id,account_key,checklist_type,period_date' });
    setSave(error ? 'dirty' : pending.current ? 'dirty' : 'saved');
    if (error) pending.current = p;
  }, [user, type, statusFields]);

  const flush = useCallback(async () => { window.clearTimeout(timer.current); await persist(); }, [persist]);

  // Load record for the current period/account
  useEffect(() => {
    if (!user) return;
    const id = ++reqId.current;
    setLoading(true); setData(null);
    (async () => {
      await flush();
      const { data: row } = await supabase.from('trade_plan_checklists').select('data')
        .eq('user_id', user.id).eq('account_key', accountKey).eq('checklist_type', type)
        .eq('period_date', toKey(period)).maybeSingle();
      if (id !== reqId.current) return;
      setData(row ? ({ ...template, ...(row.data as any) }) : null);
      setSave(row ? 'saved' : 'idle');
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, accountKey, type, period]);

  // Warn / flush on leave
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => { if (pending.current) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', h);
    return () => { window.removeEventListener('beforeunload', h); window.clearTimeout(timer.current); void persist(); };
  }, [persist]);

  const write = (next: T) => {
    setData(next);
    pending.current = { key: toKey(period), account: accountKey, data: next };
    setSave('dirty');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void persist(), 900);
  };
  const set = (patch: Partial<T>) => data && write({ ...data, ...patch });

  const go = (d: Date) => { setNotice(null); setPeriod(periodOf(type, d)); setOpen(true); };

  const viewPrevious = async () => {
    if (!user) return;
    const prev = shift(type, period, -1);
    const { data: row } = await supabase.from('trade_plan_checklists').select('id')
      .eq('user_id', user.id).eq('account_key', accountKey).eq('checklist_type', type)
      .eq('period_date', toKey(prev)).maybeSingle();
    go(prev);
    if (!row) setNotice(type === 'weekly' ? 'No Weekly Outlook saved for the previous week.' : `No checklist saved for ${prev.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}.`);
  };

  const doCopy = async () => {
    if (!user) return;
    const prev = shift(type, period, -1);
    const { data: row } = await supabase.from('trade_plan_checklists').select('data')
      .eq('user_id', user.id).eq('account_key', accountKey).eq('checklist_type', type)
      .eq('period_date', toKey(prev)).maybeSingle();
    if (!row) { setNotice(`No previous ${unit.toLowerCase()} checklist to copy.`); return; }
    write({ ...template, ...(row.data as any) });
    setNotice(null);
  };

  const openHistory = async () => {
    if (!user) return;
    setHistoryOpen(true);
    const { data: rows } = await supabase.from('trade_plan_checklists').select('period_date,status')
      .eq('user_id', user.id).eq('account_key', accountKey).eq('checklist_type', type)
      .order('period_date', { ascending: false }).limit(60);
    const map = new Map((rows ?? []).map(r => [r.period_date, r.status as Status]));
    const list: { period_date: string; status: Status }[] = [];
    const cur = periodOf(type, new Date());
    for (let i = 0; i < (type === 'weekly' ? 8 : 14); i++) {
      const k = toKey(shift(type, cur, -i)); list.push({ period_date: k, status: map.get(k) ?? 'empty' });
    }
    (rows ?? []).forEach(r => { if (!list.some(l => l.period_date === r.period_date)) list.push({ period_date: r.period_date, status: r.status as Status }); });
    setHistory(list);
  };

  const isCurrent = toKey(period) === toKey(periodOf(type, new Date()));
  const status = data ? computeStatus(data, statusFields) : 'empty';

  return (
    <div className="border-b border-white/[0.06]">
      <div className="flex items-center justify-between w-full px-5 py-3 gap-3">
        <button type="button" onClick={() => setOpen(v => !v)} className="flex items-center gap-2.5 flex-1 text-left min-w-0">
          <div className="w-6 h-6 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-xs font-black text-white/70 uppercase tracking-widest">{title}</p>
          {!loading && <StatusDot status={status} />}
        </button>
        <div className="flex items-center gap-1.5">
          <button type="button" className={btn} onClick={openHistory}><History className="h-3 w-3" /> History</button>
          <button type="button" aria-label={open ? 'Collapse' : 'Expand'} onClick={() => setOpen(v => !v)} className="p-1 text-white/25 hover:text-white/50">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="px-5 pb-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <button type="button" className={btn} onClick={() => go(shift(type, period, -1))}><ChevronLeft className="h-3 w-3" /> {fmtShort(shift(type, period, -1))}</button>
                  <button type="button" className={btn} disabled={isCurrent} onClick={() => go(new Date())}>{type === 'weekly' ? 'Current Week' : 'Today'}</button>
                  <button type="button" className={btn} onClick={() => go(shift(type, period, 1))}>{fmtShort(shift(type, period, 1))} <ChevronRight className="h-3 w-3" /></button>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-white/80">{type === 'weekly' ? 'Week of ' : ''}{fmtLong(type, period)}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" className={btn} onClick={viewPrevious}>View Previous {unit}</button>
                  <button type="button" className={btn} onClick={() => setCopyOpen(true)}><Copy className="h-3 w-3" /> Copy Previous</button>
                </div>
              </div>

              {notice && <p className="text-[11px] text-white/45 px-1">{notice}</p>}

              {loading ? (
                <div className="flex items-center gap-2 text-xs text-white/40 py-6 justify-center"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading checklist...</div>
              ) : data ? (
                <>
                  {children(data, set)}
                  <p className="text-[10px] text-white/35 text-right flex items-center justify-end gap-1">
                    {save === 'saving' ? 'Saving...' : save === 'dirty' ? 'Unsaved changes' : save === 'saved' ? <><Check className="h-3 w-3 text-primary" /> Saved</> : ''}
                  </p>
                </>
              ) : (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-white/[0.08] px-4 py-3">
                  <p className="text-xs text-white/40">No checklist saved for this {type === 'weekly' ? 'week' : 'date'}.</p>
                  <button type="button" onClick={() => write({ ...template })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/25 bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/15 transition-colors">
                    <Plus className="h-3 w-3" /> Create Checklist
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-[320px] sm:w-[360px]">
          <SheetHeader><SheetTitle className="text-sm uppercase tracking-widest">{title} History</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-1 overflow-y-auto max-h-[80vh] pr-1">
            {history.map(h => {
              const d = fromKey(h.period_date);
              const today = h.period_date === toKey(periodOf(type, new Date()));
              return (
                <button key={h.period_date} type="button" onClick={() => { go(d); setHistoryOpen(false); }}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-white/[0.05] transition-colors ${h.period_date === toKey(period) ? 'bg-white/[0.04]' : ''}`}>
                  <span className="text-xs text-white/75">
                    {type === 'weekly' ? `Week of ${fmtShort(d)}` : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {today && <span className="ml-2 text-[10px] text-primary">{type === 'weekly' ? 'This week' : 'Today'}</span>}
                  </span>
                  <StatusDot status={h.status} />
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={copyOpen} onOpenChange={setCopyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy previous checklist?</AlertDialogTitle>
            <AlertDialogDescription>This will copy the previous {unit.toLowerCase()}'s values into the current checklist.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void doCopy()}>Copy</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
