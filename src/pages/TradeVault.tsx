import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Search, Filter, TrendingUp, TrendingDown, Minus,
  Check, X, Eye, Edit, Trash2, Copy, Upload,
  ChevronLeft, ChevronRight, BarChart3, CalendarDays,
  AlertCircle, Sparkles, RefreshCw, Target, Award,
  RotateCcw, SlidersHorizontal,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Helper: get a signed URL for a private trade-screenshots object.
async function getSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  if (path.includes('token=')) return path;
  let storagePath = path;
  const match = path.match(/trade-screenshots\/(.+)/);
  if (match) storagePath = match[1];
  const { data, error } = await supabase.storage
    .from('trade-screenshots')
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}


// ── Types ─────────────────────────────────────────────────────────────────────
interface Trade {
  id: string; user_id: string; pair: string; side: string;
  trade_date: string; session: string | null; outcome: string;
  result: number; rr: number | null; entry_price: number | null;
  exit_price: number | null; setup: string | null; notes: string | null;
  mistakes: string[]; screenshot_url: string | null;
  playbook_id: string | null; discipline_score: number | null;
  execution_score: number | null; emotion: string | null;
  account_type: string; ai_review: Record<string, any>;
  is_starred: boolean; tags: string[]; created_at: string; updated_at: string;
}

interface FormData {
  pair: string; side: 'long' | 'short'; trade_date: string;
  session: string; outcome: 'win' | 'loss' | 'breakeven';
  result: string; rr: string; entry_price: string; exit_price: string;
  setup: string; playbook_id: string; mistakes: string[]; notes: string;
  screenshot_url: string; account_type: string; emotion: string;
  discipline_score: number; execution_score: number;
}

interface Filters {
  search: string; dateFrom: string; dateTo: string;
  pair: string; session: string; setup: string;
  outcome: string; account: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SESSIONS   = ['London', 'New York', 'Asia', 'London/NY Overlap', 'Pre-Market'];
const EMOTIONS   = ['focused', 'confident', 'anxious', 'tired', 'excited', 'calm', 'frustrated'];
const MISTAKES   = [
  'Entered too early', 'Entered too late', 'Moved stop loss',
  'Over-leveraged', 'Revenge trade', 'Ignored setup rules',
  'Missed take profit', 'FOMO entry', 'News trade', 'No plan',
];
const COMMON_PAIRS   = ['NAS100', 'US30', 'XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'SP500'];
const ACCOUNT_TYPES  = [
  { value: 'main',      label: 'Main Account' },
  { value: 'funded',    label: 'Funded Challenge' },
  { value: 'prop_firm', label: 'Prop Firm' },
  { value: 'demo',      label: 'Demo Account' },
];
const EMPTY_FORM: FormData = {
  pair: '', side: 'long', trade_date: new Date().toISOString().split('T')[0],
  session: '', outcome: 'win', result: '', rr: '', entry_price: '', exit_price: '',
  setup: '', playbook_id: '', mistakes: [], notes: '', screenshot_url: '',
  account_type: 'main', emotion: 'focused', discipline_score: 7, execution_score: 7,
};
const EMPTY_FILTERS: Filters = {
  search: '', dateFrom: '', dateTo: '', pair: '', session: '',
  setup: '', outcome: '', account: '',
};

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

function fmtMoney(v: number) {
  const s = v >= 0 ? '+' : '';
  return `${s}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtShort(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, positive, neutral = false, i }: {
  label: string; value: string; sub?: string;
  positive?: boolean; neutral?: boolean; i: number;
}) {
  const color = neutral ? 'text-white' : positive ? 'text-emerald-400' : 'text-red-400';
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: i * 0.05, ease }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3.5 hover:bg-white/[0.04] transition-colors"
    >
      <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-1.5">{label}</p>
      <p className={`text-xl font-black tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-white/20 mt-1">{sub}</p>}
    </motion.div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────
function FilterBar({ filters, setFilters, uniquePairs, uniqueSetups, onReset }: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  uniquePairs: string[];
  uniqueSetups: string[];
  onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const set = (k: keyof Filters, v: string) => setFilters({ ...filters, [k]: v });
  const hasActive = Object.values(filters).some(v => v !== '');

  const selectCls = "text-xs text-white/60 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 focus:outline-none focus:border-violet-500/40 transition-colors cursor-pointer hover:bg-white/[0.07] w-full";

  return (
    <div className="space-y-2.5">
      {/* Row 1: search + main dropdowns */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20 pointer-events-none"/>
          <input
            value={filters.search}
            onChange={e => set('search', e.target.value)}
            placeholder="Search pair, setup, notes..."
            className="w-full pl-9 pr-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 transition-colors"
          />
        </div>

        {/* Date from/to */}
        <input type="date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)}
          className={selectCls + ' max-w-[140px]'} />
        <span className="text-white/20 text-xs">→</span>
        <input type="date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)}
          className={selectCls + ' max-w-[140px]'} />

        {/* Pair */}
        <select value={filters.pair} onChange={e => set('pair', e.target.value)} className={selectCls + ' max-w-[120px]'}>
          <option value="">All Pairs</option>
          {uniquePairs.map(p => <option key={p} value={p}>{p}</option>)}
        </select>

        {/* Outcome */}
        <select value={filters.outcome} onChange={e => set('outcome', e.target.value)} className={selectCls + ' max-w-[120px]'}>
          <option value="">All Results</option>
          <option value="win">Win</option>
          <option value="loss">Loss</option>
          <option value="breakeven">Breakeven</option>
        </select>

        {/* More filters toggle */}
        <button onClick={() => setExpanded(v => !v)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
            expanded || filters.session || filters.setup || filters.account
              ? 'border-violet-500/30 bg-violet-500/10 text-violet-400'
              : 'border-white/[0.08] text-white/40 hover:bg-white/[0.05] hover:text-white'
          }`}>
          <SlidersHorizontal className="h-3.5 w-3.5"/>
          More
        </button>

        {/* Reset */}
        {hasActive && (
          <button onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/[0.08] text-white/30 text-xs font-semibold hover:bg-white/[0.05] hover:text-white transition-all">
            <RotateCcw className="h-3.5 w-3.5"/> Reset
          </button>
        )}
      </div>

      {/* Row 2: expanded filters */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex gap-2 flex-wrap pt-1">
              <select value={filters.session} onChange={e => set('session', e.target.value)} className={selectCls + ' max-w-[160px]'}>
                <option value="">All Sessions</option>
                {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filters.setup} onChange={e => set('setup', e.target.value)} className={selectCls + ' max-w-[160px]'}>
                <option value="">All Setups</option>
                {uniqueSetups.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select value={filters.account} onChange={e => set('account', e.target.value)} className={selectCls + ' max-w-[160px]'}>
                <option value="">All Accounts</option>
                {ACCOUNT_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter pills */}
      {hasActive && (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(filters).filter(([, v]) => v).map(([k, v]) => (
            <span key={k} className="flex items-center gap-1.5 text-[10px] font-semibold bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2.5 py-1 rounded-full">
              {v}
              <button onClick={() => set(k as keyof Filters, '')} className="hover:text-white transition-colors">
                <X className="h-2.5 w-2.5"/>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Calendar View ─────────────────────────────────────────────────────────────
function CalendarView({ trades, onSelectDay }: {
  trades: Trade[];
  onSelectDay: (date: string, trades: Trade[]) => void;
}) {
  const [current, setCurrent] = useState(new Date());
  const year  = current.getFullYear();
  const month = current.getMonth();
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthLabel = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const dayMap = useMemo(() => {
    const m: Record<string, { pnl: number; count: number; trades: Trade[] }> = {};
    trades.forEach(t => {
      const d = t.trade_date;
      if (!m[d]) m[d] = { pnl: 0, count: 0, trades: [] };
      m[d].pnl += t.result ?? 0;
      m[d].count++;
      m[d].trades.push(t);
    });
    return m;
  }, [trades]);

  const cells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div>
          <p className="text-sm font-black text-white">Trading Calendar</p>
          <p className="text-xs text-white/30 mt-0.5">Click a day to see its trades</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrent(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors">
            <ChevronLeft className="h-4 w-4"/>
          </button>
          <span className="text-sm font-bold text-white w-36 text-center">{monthLabel}</span>
          <button onClick={() => setCurrent(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/40 hover:text-white transition-colors">
            <ChevronRight className="h-4 w-4"/>
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-[10px] font-bold text-white/20 uppercase py-2">{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: cells }, (_, i) => {
            const dayNum = i - firstDayOfWeek + 1;
            const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
            const dateStr = inMonth
              ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              : '';
            const entry  = dateStr ? dayMap[dateStr] : undefined;
            const isProfit = (entry?.pnl ?? 0) > 0;
            const isLoss   = (entry?.pnl ?? 0) < 0;

            return (
              <button key={i}
                disabled={!inMonth || !entry}
                onClick={() => entry && onSelectDay(dateStr, entry.trades)}
                className={`
                  relative min-h-[64px] rounded-xl p-2 text-left transition-all
                  ${!inMonth ? 'opacity-0 pointer-events-none' : ''}
                  ${entry && isProfit ? 'bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15' : ''}
                  ${entry && isLoss   ? 'bg-red-500/10 border border-red-500/20 hover:bg-red-500/15' : ''}
                  ${!entry && inMonth ? 'bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04]' : ''}
                `}
              >
                {inMonth && (
                  <>
                    <span className={`text-xs font-bold ${entry ? (isProfit ? 'text-emerald-300' : 'text-red-300') : 'text-white/30'}`}>
                      {dayNum}
                    </span>
                    {entry && (
                      <div className="mt-1">
                        <p className={`text-[10px] font-black leading-tight ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {isProfit ? '+' : ''}${Math.abs(entry.pnl).toFixed(0)}
                        </p>
                        <p className="text-[9px] text-white/30">{entry.count}t</p>
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30"/>
            <span className="text-[10px] text-white/30">Profit day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30"/>
            <span className="text-[10px] text-white/30">Loss day</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Trade Modal ───────────────────────────────────────────────────────────
function AddTradeModal({ onClose, onSaved, editTrade, playbooks }: {
  onClose: () => void; onSaved: () => void;
  editTrade?: Trade | null;
  playbooks: { id: string; title: string }[];
}) {
  const { user } = useAuth();
  const [step,   setStep]   = useState(1);
  const [form,   setForm]   = useState<FormData>(editTrade ? {
    pair: editTrade.pair, side: (editTrade.side as any) ?? 'long',
    trade_date: editTrade.trade_date, session: editTrade.session ?? '',
    outcome: (editTrade.outcome as any) ?? 'win',
    result: editTrade.result?.toString() ?? '', rr: editTrade.rr?.toString() ?? '',
    entry_price: editTrade.entry_price?.toString() ?? '',
    exit_price: editTrade.exit_price?.toString() ?? '',
    setup: editTrade.setup ?? '', playbook_id: editTrade.playbook_id ?? '',
    mistakes: editTrade.mistakes ?? [], notes: editTrade.notes ?? '',
    screenshot_url: editTrade.screenshot_url ?? '',
    account_type: editTrade.account_type ?? 'main',
    emotion: editTrade.emotion ?? 'focused',
    discipline_score: editTrade.discipline_score ?? 7,
    execution_score: editTrade.execution_score ?? 7,
  } : EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof FormData, v: any) => setForm(f => ({ ...f, [k]: v }));

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!form.screenshot_url) { setPreviewUrl(null); return; }
    if (form.screenshot_url.startsWith('blob:')) { setPreviewUrl(form.screenshot_url); return; }
    getSignedUrl(form.screenshot_url).then(setPreviewUrl);
  }, [form.screenshot_url]);


  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 1 && !form.pair.trim()) e.pair = 'Required';
    if (s === 2 && form.result === '') e.result = 'Required';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSave = async (another = false) => {
    if (!validate(step) || !user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id, pair: form.pair.trim().toUpperCase(), side: form.side,
        trade_date: form.trade_date, session: form.session || null,
        outcome: form.outcome, result: Number(form.result) || 0,
        rr: form.rr ? Number(form.rr) : null,
        entry_price: form.entry_price ? Number(form.entry_price) : null,
        exit_price: form.exit_price ? Number(form.exit_price) : null,
        setup: form.setup || null, playbook_id: form.playbook_id || null,
        mistakes: form.mistakes, notes: form.notes || null,
        screenshot_url: form.screenshot_url || null,
        account_type: form.account_type, emotion: form.emotion,
        discipline_score: form.discipline_score, execution_score: form.execution_score,
        updated_at: new Date().toISOString(),
      };
      if (editTrade) {
        const { error } = await supabase.from('trades').update(payload).eq('id', editTrade.id);
        if (error) throw error;
        toast({ title: '✅ Trade updated' });
      } else {
        const { error } = await supabase.from('trades').insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
        toast({ title: '✅ Trade saved' });
      }
      if (another && !editTrade) {
        setForm({ ...EMPTY_FORM, trade_date: form.trade_date, session: form.session, account_type: form.account_type });
        setStep(1); setErrors({});
      } else { onSaved(); onClose(); }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const inputCls = (err?: string) =>
    `w-full text-sm bg-white/[0.04] border ${err ? 'border-red-500/40' : 'border-white/[0.09]'} rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 transition-colors`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full sm:max-w-lg bg-[#0c0c16] border border-white/[0.09] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-white/[0.07] flex-shrink-0">
          <p className="text-sm font-black text-white flex-1">
            {editTrade ? 'Edit Trade' : 'Log Trade'} — Step {step}/3
          </p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white transition-colors">
            <X className="h-4 w-4"/>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-white/[0.05] flex-shrink-0">
          {[1,2,3].map((s, i) => (
            <React.Fragment key={s}>
              <button onClick={() => step > s && setStep(s)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === s ? 'bg-violet-600 text-white' :
                  step > s   ? 'bg-emerald-500/20 text-emerald-400 cursor-pointer' :
                  'bg-white/[0.06] text-white/25'
                }`}>
                {step > s ? <Check className="h-3 w-3"/> : s}
              </button>
              {i < 2 && <div className={`flex-1 h-px ${step > s ? 'bg-emerald-500/30' : 'bg-white/[0.06]'}`}/>}
            </React.Fragment>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Pair *</label>
                <input value={form.pair} onChange={e => set('pair', e.target.value.toUpperCase())}
                  placeholder="NAS100, XAUUSD..." className={inputCls(errors.pair)}/>
                <div className="flex gap-1.5 flex-wrap mt-2">
                  {COMMON_PAIRS.map(p => (
                    <button key={p} onClick={() => set('pair', p)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        form.pair === p ? 'bg-violet-500/15 border-violet-500/25 text-violet-400' : 'border-white/[0.07] text-white/25 hover:bg-white/[0.05]'
                      }`}>{p}</button>
                  ))}
                </div>
                {errors.pair && <p className="text-xs text-red-400 mt-1">{errors.pair}</p>}
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Direction</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { v:'long',  label:'↑ Long',  cls:'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
                    { v:'short', label:'↓ Short', cls:'bg-red-500/15 border-red-500/30 text-red-400' },
                  ].map(o => (
                    <button key={o.v} onClick={() => set('side', o.v)}
                      className={`py-3 rounded-xl border text-sm font-black transition-all ${form.side === o.v ? o.cls + ' shadow-md' : 'border-white/[0.08] text-white/30 hover:border-white/[0.15]'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Date *</label>
                  <input type="date" value={form.trade_date} onChange={e => set('trade_date', e.target.value)} className={inputCls(errors.trade_date)}/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Session</label>
                  <select value={form.session} onChange={e => set('session', e.target.value)}
                    className="w-full text-sm bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-white/70 focus:outline-none focus:border-violet-500/40 cursor-pointer">
                    <option value="">Select...</option>
                    {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Result</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { v:'win',       label:'✅ Win',       cls:'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' },
                    { v:'loss',      label:'❌ Loss',      cls:'bg-red-500/15 border-red-500/30 text-red-400' },
                    { v:'breakeven', label:'➖ Breakeven', cls:'bg-white/10 border-white/20 text-white' },
                  ].map(o => (
                    <button key={o.v} onClick={() => set('outcome', o.v)}
                      className={`py-3 rounded-xl border text-sm font-black transition-all ${form.outcome === o.v ? o.cls + ' shadow-md' : 'border-white/[0.08] text-white/30'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">P&L ($) *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm">$</span>
                  <input type="number" value={form.result} onChange={e => set('result', e.target.value)}
                    placeholder={form.outcome === 'loss' ? '-120.00' : '280.00'}
                    className={`${inputCls(errors.result)} pl-8 text-lg font-black ${form.result ? (Number(form.result) >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-white'}`}/>
                </div>
                {errors.result && <p className="text-xs text-red-400 mt-1">{errors.result}</p>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label:'R:R', key:'rr', placeholder:'2.5' },
                  { label:'Entry', key:'entry_price', placeholder:'20,420' },
                  { label:'Exit',  key:'exit_price',  placeholder:'20,540' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">{f.label}</label>
                    <input type="number" value={(form as any)[f.key]} onChange={e => set(f.key as any, e.target.value)}
                      placeholder={f.placeholder} className={inputCls()}/>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Execution — {form.execution_score}/10</label>
                  <input type="range" min="1" max="10" value={form.execution_score} onChange={e => set('execution_score', Number(e.target.value))} className="w-full accent-violet-500"/>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Discipline — {form.discipline_score}/10</label>
                  <input type="range" min="1" max="10" value={form.discipline_score} onChange={e => set('discipline_score', Number(e.target.value))} className="w-full accent-violet-500"/>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {/* Screenshot upload */}
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Chart Screenshot</label>
                {form.screenshot_url ? (
                  <div className="relative group rounded-2xl overflow-hidden border border-white/[0.09]">
                    <img src={form.screenshot_url} alt="screenshot" className="w-full h-40 object-cover"/>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button type="button" onClick={() => set('screenshot_url', '')}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold">
                        <X className="h-3.5 w-3.5"/> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <input ref={fileRef} type="file" accept="image/*" className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file || !user) return;
                        if (file.size > 10 * 1024 * 1024) { toast({ title: 'Max 10MB', variant: 'destructive' }); return; }
                        const local = URL.createObjectURL(file);
                        set('screenshot_url', local);
                        const path = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
                        const { error } = await supabase.storage.from('trade-screenshots').upload(path, file, { upsert: true, contentType: file.type });
                        if (error) { toast({ title: 'Upload failed', description: error.message, variant: 'destructive' }); set('screenshot_url', ''); return; }
                        // Bucket is private — store the storage path, not a public URL.
                        set('screenshot_url', path);
                        URL.revokeObjectURL(local);

                      }}
                    />
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.04] hover:border-violet-500/30 transition-all group">
                      <Upload className="h-6 w-6 text-white/20 group-hover:text-violet-400 transition-colors"/>
                      <p className="text-xs font-semibold text-white/35 group-hover:text-white/60 transition-colors">Click to upload · PNG, JPG · max 10MB</p>
                    </button>
                  </>
                )}
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Setup</label>
                <input value={form.setup} onChange={e => set('setup', e.target.value)} placeholder="e.g. Pullback to 20 EMA" className={inputCls()}/>
              </div>
              {playbooks.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Link Playbook</label>
                  <select value={form.playbook_id} onChange={e => set('playbook_id', e.target.value)}
                    className="w-full text-sm bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-white/70 focus:outline-none focus:border-violet-500/40 cursor-pointer">
                    <option value="">Not linked</option>
                    {playbooks.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Mistakes</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MISTAKES.map(m => (
                    <button key={m} onClick={() => set('mistakes', form.mistakes.includes(m) ? form.mistakes.filter(x => x !== m) : [...form.mistakes, m])}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium text-left transition-all ${
                        form.mistakes.includes(m) ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'border-white/[0.07] text-white/30 hover:bg-white/[0.04]'
                      }`}>
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 transition-all ${form.mistakes.includes(m) ? 'bg-red-500' : 'border border-white/20'}`}>
                        {form.mistakes.includes(m) && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3}/>}
                      </div>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Observations, lessons, context..." rows={3}
                  className="w-full text-sm bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none"/>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-white/[0.07] flex-shrink-0">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.08] text-white/40 text-sm font-bold hover:bg-white/[0.04] hover:text-white transition-all">
              <ChevronLeft className="h-4 w-4"/> Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={() => validate(step) && setStep(s => s + 1)}
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-violet-500/20">
              Next <ChevronRight className="h-4 w-4"/>
            </button>
          ) : (
            <>
              {!editTrade && (
                <button onClick={() => handleSave(true)} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl border border-white/[0.10] text-white/50 text-sm font-bold hover:bg-white/[0.05] transition-all disabled:opacity-40">
                  Save & Add Another
                </button>
              )}
              <button onClick={() => handleSave(false)} disabled={saving}
                className={`flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 ${editTrade ? 'flex-1' : 'px-6'}`}>
                {saving ? 'Saving...' : editTrade ? '✓ Update' : '✓ Save Trade'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Trade row ─────────────────────────────────────────────────────────────────
function TradeRow({ trade, onView, onEdit, onDuplicate, onDelete }: {
  trade: Trade;
  onView: (t: Trade) => void; onEdit: (t: Trade) => void;
  onDuplicate: (t: Trade) => void; onDelete: (t: Trade) => void;
}) {
  const isWin  = (trade.result ?? 0) > 0;
  const isLoss = (trade.result ?? 0) < 0;
  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="group border-b border-white/[0.04] hover:bg-white/[0.025] transition-colors cursor-pointer"
      onClick={() => onView(trade)}>
      <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">{fmtShort(trade.trade_date)}</td>
      <td className="px-4 py-3 text-sm font-bold text-white">{trade.pair}</td>
      <td className="px-4 py-3">
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${trade.side === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
          {trade.side === 'long' ? '↑ L' : '↓ S'}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-white/40 max-w-[100px] truncate">{trade.session || '—'}</td>
      <td className="px-4 py-3 text-xs text-white/40 max-w-[100px] truncate">{trade.setup || '—'}</td>
      <td className="px-4 py-3">
        <span className={`text-[10px] font-black px-2 py-1 rounded-lg capitalize ${trade.outcome === 'win' ? 'bg-emerald-500/10 text-emerald-400' : trade.outcome === 'loss' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-white/30'}`}>
          {trade.outcome}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-sm font-black font-mono ${isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-white/40'}`}>
          {fmtMoney(trade.result ?? 0)}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-white/40">{trade.rr ? `1:${Number(trade.rr).toFixed(1)}` : '—'}</td>
      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(trade)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white transition-colors"><Edit className="h-3.5 w-3.5"/></button>
          <button onClick={() => onDuplicate(trade)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white transition-colors"><Copy className="h-3.5 w-3.5"/></button>
          <button onClick={() => onDelete(trade)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5"/></button>
        </div>
      </td>
    </motion.tr>
  );
}

// ── Premium Trade Drawer ──────────────────────────────────────────────────────
function TradeDrawer({ trade, onClose, onEdit, onDuplicate, onDelete, onAIReview, playbooks }: {
  trade: Trade; onClose: () => void; onEdit: (t: Trade) => void;
  onDuplicate: (t: Trade) => void; onDelete: (t: Trade) => void;
  onAIReview: (t: Trade) => Promise<void>;
  playbooks: { id: string; title: string; entry_rules?: string }[];
}) {
  const [tab,       setTab]       = useState<'notes'|'mistakes'|'ai'|'playbook'>('notes');
  const [reviewing, setReviewing] = useState(false);
  const isWin  = (trade.result ?? 0) > 0;
  const isLoss = (trade.result ?? 0) < 0;
  const ai     = trade.ai_review as any ?? {};
  const accentColor = isWin ? '#10b981' : isLoss ? '#ef4444' : '#6b7280';
  const accentBg    = isWin ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : isLoss ? 'bg-red-500/10 border-red-500/25 text-red-400' : 'bg-white/5 border-white/15 text-white/40';
  const linkedPb = playbooks.find(p => p.id === trade.playbook_id);

  const handleReview = async () => {
    setReviewing(true);
    await onAIReview(trade);
    setReviewing(false);
    setTab('ai');
  };

  const STATS = [
    { label:'P&L',       value: fmtMoney(trade.result ?? 0), color: isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-white/40' },
    { label:'R:R',       value: trade.rr ? `1:${Number(trade.rr).toFixed(1)}` : '—', color: 'text-white' },
    { label:'Session',   value: trade.session || '—',   color: 'text-white/70' },
    { label:'Setup',     value: trade.setup   || '—',   color: 'text-white/70' },
    { label:'Execution', value: trade.execution_score ? `${trade.execution_score}/10` : '—', color: 'text-white' },
    { label:'Discipline',value: trade.discipline_score ? `${trade.discipline_score}/10` : '—', color: 'text-white' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="flex-1 bg-black/10 dark:bg-black/60 backdrop-blur-sm dark:backdrop-blur-md"/>
      <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="relative w-full sm:w-[400px] h-full flex flex-col overflow-hidden bg-background dark:bg-gradient-to-br dark:from-[#0d0d1f] dark:to-[#0a0a18] border-l border-border"
        style={{ boxShadow: `-24px 0 80px rgba(0,0,0,0.5),0 0 40px ${isWin?'rgba(16,185,129,0.06)':isLoss?'rgba(239,68,68,0.06)':'transparent'}` }}
        onClick={e => e.stopPropagation()}>

        {/* accent line */}
        <div className="absolute top-0 inset-x-0 h-0.5 opacity-60"
          style={{ background: `linear-gradient(90deg,transparent,${accentColor},transparent)` }}/>

        {/* Header */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-black ${accentBg}`}>
                {isWin ? <TrendingUp className="h-3 w-3"/> : isLoss ? <TrendingDown className="h-3 w-3"/> : <Minus className="h-3 w-3"/>}
                {isWin ? 'WIN' : isLoss ? 'LOSS' : 'BE'}
              </div>
              <div className={`px-2 py-1 rounded-lg border text-[10px] font-black ${trade.side==='long'?'bg-emerald-500/10 border-emerald-500/20 text-emerald-400':'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {trade.side==='long'?'↑ LONG':'↓ SHORT'}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onEdit(trade)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-border text-muted-foreground text-[10px] font-bold hover:bg-muted hover:text-foreground transition-all">
                <Edit className="h-3 w-3"/> Edit
              </button>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted dark:hover:bg-white/[0.06] text-muted-foreground/50 dark:text-white/30 hover:text-foreground dark:hover:text-white transition-colors">
                <X className="h-4 w-4"/>
              </button>
            </div>
          </div>
          <div className="flex items-baseline justify-between mt-3">
            <div>
              <h2 className="text-2xl font-black text-foreground dark:text-white tracking-tight">{trade.pair}</h2>
              <p className="text-xs text-muted-foreground/50 dark:text-white/30 mt-0.5">{fmtDate(trade.trade_date)}</p>
            </div>
            <p className={`text-3xl font-black font-mono tracking-tight ${isWin?'text-emerald-400':isLoss?'text-red-400':'text-muted-foreground/60 dark:text-white/40'}`}>
              {(trade.result??0)>=0?'+':''}${Math.abs(trade.result??0).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Stats grid */}
          <div className="px-5 pt-4 pb-3 grid grid-cols-3 gap-2">
            {STATS.map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-card dark:bg-white/[0.02] p-2.5">
                <p className="text-[9px] font-bold text-muted-foreground/40 dark:text-white/25 uppercase tracking-wider mb-1">{s.label}</p>
                <p className={`text-sm font-black truncate ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Entry/Exit bar */}
          {(trade.entry_price || trade.exit_price) && (
            <div className="px-5 pb-3">
              <div className="rounded-2xl border border-border bg-card dark:bg-white/[0.02] overflow-hidden">
                <div className="grid grid-cols-2 divide-x divide-border">
                  <div className="px-4 py-3">
                    <p className="text-[9px] font-bold text-muted-foreground/40 dark:text-white/25 uppercase tracking-wider mb-1.5">Entry</p>
                    <p className="text-base font-black text-foreground dark:text-white font-mono">{trade.entry_price ? Number(trade.entry_price).toLocaleString() : '—'}</p>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[9px] font-bold text-muted-foreground/40 dark:text-white/25 uppercase tracking-wider mb-1.5">Exit</p>
                    <p className={`text-base font-black font-mono ${isWin?'text-emerald-400':isLoss?'text-red-400':'text-foreground dark:text-white'}`}>
                      {trade.exit_price ? Number(trade.exit_price).toLocaleString() : '—'}
                    </p>
                  </div>
                </div>
                {trade.entry_price && trade.exit_price && (
                  <div className="px-4 pb-3">
                    <div className="h-1 bg-muted dark:bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.8, ease }}
                        className="h-full rounded-full" style={{ background: `linear-gradient(90deg,rgba(99,102,241,0.5),${accentColor})` }}/>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Score circles */}
          {(trade.discipline_score || trade.execution_score) && (
            <div className="px-5 pb-3 grid grid-cols-2 gap-2">
              {[
                { label:'Discipline', value: trade.discipline_score ?? 0, color:'#7c3aed' },
                { label:'Execution',  value: trade.execution_score  ?? 0, color:'#7c3aed' },
              ].map(sc => {
                const pct = (sc.value / 10) * 100;
                const circ = 2 * Math.PI * 20;
                return (
                  <div key={sc.label} className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card dark:bg-white/[0.02]">
                    <div className="relative w-11 h-11 flex items-center justify-center flex-shrink-0">
                      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
                        <circle cx="22" cy="22" r="20" fill="none" stroke="hsl(var(--muted))" strokeWidth="3.5"/>
                        <motion.circle cx="22" cy="22" r="20" fill="none" stroke={sc.color}
                          strokeWidth="3.5" strokeDasharray={circ}
                          initial={{ strokeDashoffset: circ }}
                          animate={{ strokeDashoffset: circ*(1-pct/100) }}
                          transition={{ duration:1, delay:0.3, ease }}
                          strokeLinecap="round"/>
                      </svg>
                      <span className="text-xs font-black text-foreground dark:text-white">{sc.value}</span>
                    </div>
                    <div>
                      <p className="text-[9px] text-muted-foreground/40 dark:text-white/25 uppercase tracking-wider">{sc.label}</p>
                      <p className="text-sm font-bold text-foreground dark:text-white">{sc.value}/10</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Screenshot */}
          <div className="px-5 pb-3">
            {trade.screenshot_url ? (
              <div className="rounded-2xl overflow-hidden border border-border dark:border-white/[0.08] relative group cursor-pointer"
                onClick={() => window.open(trade.screenshot_url!, '_blank')}>
                <img src={trade.screenshot_url} alt="chart" className="w-full object-cover" style={{ maxHeight:'200px', minHeight:'100px' }}
                  onError={e => { (e.target as HTMLImageElement).parentElement!.style.display='none'; }}/>
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-sm border border-border/60 dark:border-white/[0.15] text-white text-xs font-bold">
                    <Eye className="h-3.5 w-3.5"/> View Full Size
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                  <p className="text-[10px] text-white/50">Chart Screenshot · Click to expand</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-muted/20 dark:bg-white/[0.01] p-5 flex flex-col items-center gap-2 text-center">
                <Upload className="h-5 w-5 text-muted-foreground/30 dark:text-white/15"/>
                <p className="text-xs text-muted-foreground/30 dark:text-white/20">No screenshot</p>
                <button onClick={() => onEdit(trade)} className="text-[10px] text-violet-400/60 hover:text-violet-400 transition-colors border border-violet-500/20 px-3 py-1 rounded-lg hover:bg-violet-500/10">+ Add Screenshot</button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="px-5 pb-2">
            <div className="flex gap-0.5 p-1 rounded-xl bg-muted border border-border">
              {(['notes','mistakes','ai','playbook'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-bold capitalize transition-all ${
                    tab === t ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-muted-foreground/50 dark:text-white/30 hover:text-foreground dark:hover:text-white hover:bg-muted dark:hover:bg-white/[0.04]'
                  }`}>
                  {t === 'ai' ? 'AI' : t}
                  {t === 'ai' && ai?.verdict && <span className="ml-1 w-1 h-1 rounded-full bg-emerald-400 inline-block"/>}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pb-24">
            <AnimatePresence mode="wait">
              {tab === 'notes' && (
                <motion.div key="notes" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}} className="pt-3">
                  {trade.notes ? (
                    <div className="rounded-2xl border border-border bg-card dark:bg-white/[0.02] p-4">
                      <p className="text-sm text-foreground/70 dark:text-white/65 leading-relaxed whitespace-pre-wrap">{trade.notes}</p>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-sm text-muted-foreground/30 dark:text-white/20">No notes for this trade</p>
                      <button onClick={() => onEdit(trade)} className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors">Add notes →</button>
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'mistakes' && (
                <motion.div key="mistakes" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}} className="pt-3 space-y-2">
                  {(trade.mistakes ?? []).length > 0 ? (
                    (trade.mistakes ?? []).map((m, i) => (
                      <motion.div key={m} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.05}}
                        className="flex items-center gap-3 p-3.5 rounded-xl border border-red-500/15 bg-red-500/5">
                        <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0"/>
                        <p className="text-xs font-medium text-red-300/80">{m}</p>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                        <Check className="h-5 w-5 text-emerald-400"/>
                      </div>
                      <p className="text-sm font-bold text-emerald-400">Clean execution</p>
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'ai' && (
                <motion.div key="ai" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}} className="pt-3">
                  {ai?.verdict ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border overflow-hidden"
                        style={{ borderColor: ai.verdict==='Good trade'?'rgba(16,185,129,0.2)':ai.verdict==='Poor trade'?'rgba(239,68,68,0.2)':'rgba(107,114,128,0.3)', background: ai.verdict==='Good trade'?'rgba(16,185,129,0.05)':ai.verdict==='Poor trade'?'rgba(239,68,68,0.05)':'rgba(107,114,128,0.05)' }}>
                        <div className="px-4 py-3 flex items-center gap-3">
                          <Sparkles className="h-5 w-5" style={{ color: ai.verdict==='Good trade'?'#10b981':ai.verdict==='Poor trade'?'#ef4444':'#6b7280' }}/>
                          <div className="flex-1">
                            <p className="text-[9px] text-muted-foreground/40 dark:text-white/25 uppercase tracking-wider">AI Verdict</p>
                            <p className="text-sm font-black" style={{ color: ai.verdict==='Good trade'?'#10b981':ai.verdict==='Poor trade'?'#ef4444':'#6b7280' }}>{ai.verdict}</p>
                          </div>
                          {ai.discipline_score != null && (
                            <div className="text-center">
                              <p className="text-[9px] text-muted-foreground/40 dark:text-white/25">Score</p>
                              <p className="text-2xl font-black" style={{ color: ai.discipline_score>=70?'#10b981':ai.discipline_score>=40?'#6b7280':'#ef4444' }}>{ai.discipline_score}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      {ai.what_went_well && (
                        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                          <p className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Check className="h-3 w-3"/>What went well</p>
                          <p className="text-xs text-muted-foreground dark:text-white/60 leading-relaxed">{ai.what_went_well}</p>
                        </div>
                      )}
                      {ai.what_went_wrong && (
                        <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-4">
                          <p className="text-[9px] font-bold text-red-400/60 uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertCircle className="h-3 w-3"/>What went wrong</p>
                          <p className="text-xs text-red-300/70 leading-relaxed">{ai.what_went_wrong}</p>
                        </div>
                      )}
                      {ai.improvement && (
                        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                          <p className="text-[9px] font-bold text-violet-400/60 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Sparkles className="h-3 w-3"/>Suggestion</p>
                          <p className="text-xs text-muted-foreground dark:text-white/60 leading-relaxed">{ai.improvement}</p>
                        </div>
                      )}
                      <button onClick={handleReview} disabled={reviewing}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-muted hover:text-foreground transition-all disabled:opacity-40">
                        <RefreshCw className={`h-3.5 w-3.5 ${reviewing?'animate-spin':''}`}/> Re-analyze
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="h-6 w-6 text-violet-400"/>
                      </div>
                      <p className="text-sm font-bold text-foreground dark:text-white mb-1">AI Trade Review</p>
                      <p className="text-xs text-muted-foreground/50 dark:text-white/30 mb-5 max-w-[200px] mx-auto">Get instant analysis of this trade</p>
                      <button onClick={handleReview} disabled={reviewing}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-500/20 mx-auto disabled:opacity-50">
                        <Sparkles className={`h-4 w-4 ${reviewing?'animate-spin':''}`}/>{reviewing?'Analyzing...':'Analyze'}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'playbook' && (
                <motion.div key="playbook" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}} className="pt-3">
                  {linkedPb ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                        <p className="text-[9px] text-violet-400/60 uppercase tracking-wider font-bold mb-2">Linked Playbook</p>
                        <p className="text-base font-black text-foreground dark:text-white">{linkedPb.title}</p>
                        {trade.setup && <p className="text-xs text-muted-foreground/60 dark:text-white/40 mt-0.5">{trade.setup}</p>}
                      </div>
                      {linkedPb.entry_rules && (
                        <div className="rounded-2xl border border-border bg-card dark:bg-white/[0.02] p-4">
                          <p className="text-[9px] font-bold text-muted-foreground/40 dark:text-white/25 uppercase tracking-wider mb-2">Entry Rules</p>
                          <p className="text-xs text-muted-foreground/75 dark:text-white/55 leading-relaxed">{linkedPb.entry_rules}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5 text-center">
                          <p className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-wider mb-1">Rules Followed</p>
                          <p className="text-2xl font-black text-emerald-400">{Math.max(0, 5 - (trade.mistakes?.length ?? 0))}</p>
                        </div>
                        <div className="p-3 rounded-xl border border-red-500/15 bg-red-500/5 text-center">
                          <p className="text-[9px] font-bold text-red-400/60 uppercase tracking-wider mb-1">Rules Broken</p>
                          <p className="text-2xl font-black text-red-400">{trade.mistakes?.length ?? 0}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <Target className="h-10 w-10 text-muted-foreground/20 dark:text-white/10 mx-auto mb-3"/>
                      <p className="text-sm text-muted-foreground/30 dark:text-white/20">No playbook linked</p>
                      <button onClick={() => onEdit(trade)} className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors">Link a playbook →</button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="absolute bottom-0 inset-x-0 px-5 py-4 bg-gradient-to-t from-background via-background/90 to-transparent border-t border-border">
          <div className="flex items-center gap-2">
            <button onClick={() => { onDuplicate(trade); onClose(); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-muted hover:text-foreground transition-all">
              <Copy className="h-3.5 w-3.5"/> Duplicate
            </button>
            <button onClick={handleReview} disabled={reviewing}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600/20 border border-violet-500/25 text-violet-400 text-xs font-bold hover:bg-violet-600/30 transition-all disabled:opacity-40">
              <Sparkles className={`h-3.5 w-3.5 ${reviewing?'animate-spin':''}`}/> AI
            </button>
            <button onClick={() => { onDelete(trade); onClose(); }}
              className="p-2.5 rounded-xl border border-red-500/20 text-red-400/50 hover:bg-red-500/10 hover:text-red-400 transition-all">
              <Trash2 className="h-4 w-4"/>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
      className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <BarChart3 className="h-9 w-9 text-violet-400"/>
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-violet-600 border-2 border-[#080812] flex items-center justify-center">
          <Plus className="h-3 w-3 text-white"/>
        </div>
      </div>
      <h3 className="text-xl font-black text-white mb-2">Log your first trade</h3>
      <p className="text-sm text-white/35 max-w-xs mb-8 leading-relaxed">Start building your trading history. Every trade logged is a step toward understanding your edge.</p>
      <motion.button onClick={onAdd} whileHover={{scale:1.02}} whileTap={{scale:0.98}}
        className="flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500 text-white px-7 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg shadow-violet-500/20">
        <Plus className="h-4 w-4"/> Add Your First Trade
      </motion.button>
    </motion.div>
  );
}

// ── Main TradeVault ───────────────────────────────────────────────────────────
export default function TradeVault() {
  const { user } = useAuth();
  const [trades,     setTrades]     = useState<Trade[]>([]);
  const [playbooks,  setPlaybooks]  = useState<{id:string;title:string;entry_rules?:string}[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTrade,  setEditTrade]  = useState<Trade|null>(null);
  const [viewTrade,  setViewTrade]  = useState<Trade|null>(null);
  const [view,       setView]       = useState<'table'|'calendar'>('table');
  const [filters,    setFilters]    = useState<Filters>(EMPTY_FILTERS);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [tr, pb] = await Promise.all([
      supabase.from('trades').select('*').eq('user_id', user.id).order('trade_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('playbooks').select('id,title,entry_rules').eq('user_id', user.id),
    ]);
    setTrades((tr.data as Trade[]) ?? []);
    setPlaybooks(pb.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (t: Trade) => {
    await supabase.from('trades').delete().eq('id', t.id);
    toast({ title: 'Trade deleted' });
    if (viewTrade?.id === t.id) setViewTrade(null);
    load();
  };

  const handleDuplicate = async (t: Trade) => {
    const { id, created_at, updated_at, ...rest } = t;
    await supabase.from('trades').insert({ ...rest, trade_date: new Date().toISOString().split('T')[0], created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    toast({ title: 'Trade duplicated' }); load();
  };

  const handleAIReview = async (trade: Trade) => {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:500, messages:[{
          role:'user', content:`Review this trade. Respond with ONLY JSON (no markdown):
{"verdict":"Good trade"|"Average trade"|"Poor trade","what_went_well":string|null,"what_went_wrong":string|null,"improvement":string,"discipline_score":0-100}
Trade: ${trade.pair} ${trade.side?.toUpperCase()} ${trade.outcome?.toUpperCase()} P&L:$${trade.result} R:R:${trade.rr??'N/A'} Setup:${trade.setup??'none'} Emotion:${trade.emotion??'N/A'} Mistakes:${(trade.mistakes??[]).join(',')||'none'}`
        }]}),
      });
      const data = await res.json();
      const review = JSON.parse((data.content?.[0]?.text ?? '{}').replace(/```json|```/g,'').trim());
      await supabase.from('trades').update({ ai_review:review, updated_at:new Date().toISOString() }).eq('id', trade.id);
      setTrades(p => p.map(t => t.id===trade.id ? {...t,ai_review:review} : t));
      if (viewTrade?.id === trade.id) setViewTrade(p => p ? {...p,ai_review:review} : p);
      toast({ title:'✅ AI review done' });
    } catch { toast({ title:'AI review failed', variant:'destructive' }); }
  };

  const openEdit = (t: Trade) => { setEditTrade(t); setModalOpen(true); setViewTrade(null); };

  const stats = useMemo(() => {
    const wins   = trades.filter(t => (t.result??0)>0);
    const total  = trades.reduce((s,t)=>s+(t.result??0),0);
    const rrs    = trades.filter(t=>t.rr);
    const best   = trades.reduce((b,t)=>(t.result??0)>(b?.result??-Infinity)?t:b, null as Trade|null);
    const worst  = trades.reduce((b,t)=>(t.result??0)<(b?.result??Infinity)?t:b, null as Trade|null);
    return { total, count:trades.length, winRate:trades.length>0?Math.round((wins.length/trades.length)*100):0, avgRR:rrs.length>0?rrs.reduce((s,t)=>s+(t.rr??0),0)/rrs.length:null, best, worst };
  }, [trades]);

  const uniquePairs  = useMemo(() => [...new Set(trades.map(t=>t.pair))].sort(), [trades]);
  const uniqueSetups = useMemo(() => [...new Set(trades.map(t=>t.setup).filter(Boolean) as string[])].sort(), [trades]);

  const filtered = useMemo(() => trades.filter(t => {
    const s = filters.search.toLowerCase();
    if (s && !t.pair.toLowerCase().includes(s) && !(t.setup??'').toLowerCase().includes(s) && !(t.notes??'').toLowerCase().includes(s)) return false;
    if (filters.dateFrom && t.trade_date < filters.dateFrom) return false;
    if (filters.dateTo   && t.trade_date > filters.dateTo)   return false;
    if (filters.pair     && t.pair !== filters.pair)         return false;
    if (filters.session  && t.session !== filters.session)   return false;
    if (filters.setup    && t.setup !== filters.setup)       return false;
    if (filters.outcome  && t.outcome !== filters.outcome)   return false;
    if (filters.account  && t.account_type !== filters.account) return false;
    return true;
  }), [trades, filters]);

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Trade Vault</h2>
          <p className="text-sm text-white/30 mt-0.5">Log every trade. Build your edge.</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-1 rounded-xl bg-white/[0.03] border border-white/[0.07]">
            <button onClick={() => setView('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view==='table' ? 'bg-violet-600 text-white shadow' : 'text-white/35 hover:text-white'}`}>
              <BarChart3 className="h-3.5 w-3.5"/> Table
            </button>
            <button onClick={() => setView('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${view==='calendar' ? 'bg-violet-600 text-white shadow' : 'text-white/35 hover:text-white'}`}>
              <CalendarDays className="h-3.5 w-3.5"/> Calendar
            </button>
          </div>
          <motion.button onClick={() => { setEditTrade(null); setModalOpen(true); }}
            whileHover={{scale:1.02}} whileTap={{scale:0.98}}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-500/20">
            <Plus className="h-4 w-4"/> Log Trade
          </motion.button>
        </div>
      </div>

      {/* Stats */}
      {!loading && trades.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total P&L"    value={fmtMoney(stats.total)} positive={stats.total>=0} neutral={stats.total===0} sub={`${stats.count} trades`} i={0}/>
          <StatCard label="Win Rate"     value={`${stats.winRate}%`} positive={stats.winRate>=50} neutral={stats.winRate===0} i={1}/>
          <StatCard label="Avg R:R"      value={stats.avgRR?`1:${stats.avgRR.toFixed(1)}`:'—'} neutral i={2}/>
          <StatCard label="Total Trades" value={`${stats.count}`} neutral i={3}/>
          <StatCard label="Best Trade"   value={stats.best?fmtMoney(stats.best.result):'—'} positive sub={stats.best?.pair} i={4}/>
          <StatCard label="Worst Trade"  value={stats.worst?fmtMoney(stats.worst.result):'—'} positive={false} sub={stats.worst?.pair} i={5}/>
        </div>
      )}

      {/* Filters */}
      {trades.length > 0 && (
        <FilterBar filters={filters} setFilters={setFilters} uniquePairs={uniquePairs} uniqueSetups={uniqueSetups} onReset={() => setFilters(EMPTY_FILTERS)}/>
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i=><div key={i} className="h-12 bg-white/[0.02] rounded-xl animate-pulse"/>)}</div>
      ) : trades.length === 0 ? (
        <EmptyState onAdd={() => setModalOpen(true)}/>
      ) : view === 'calendar' ? (
        <CalendarView trades={filtered} onSelectDay={(date, dayTrades) => {
          if (dayTrades.length === 1) setViewTrade(dayTrades[0]);
          else toast({ title: `${dayTrades.length} trades on ${fmtShort(date)}`, description: 'Click a row to view details' });
          setView('table');
          setFilters(f => ({ ...f, dateFrom: date, dateTo: date }));
        }}/>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Search className="h-10 w-10 text-white/10 mx-auto mb-3"/>
          <p className="text-sm text-white/20">No trades match your filters</p>
          <button onClick={() => setFilters(EMPTY_FILTERS)} className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors">Clear filters →</button>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Date','Pair','Side','Session','Setup','Result','P&L','R:R',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-white/20 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <TradeRow key={t.id} trade={t} onView={setViewTrade} onEdit={openEdit} onDuplicate={handleDuplicate} onDelete={handleDelete}/>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-white/[0.05]">
            <span className="text-xs text-white/20">{filtered.length} trade{filtered.length!==1?'s':''}{filtered.length!==trades.length?` (${trades.length} total)`:''}</span>
          </div>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <AddTradeModal
            onClose={() => { setModalOpen(false); setEditTrade(null); }}
            onSaved={load}
            editTrade={editTrade}
            playbooks={playbooks}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      <AnimatePresence>
        {viewTrade && (
          <TradeDrawer
            trade={viewTrade}
            onClose={() => setViewTrade(null)}
            onEdit={openEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onAIReview={handleAIReview}
            playbooks={playbooks}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
