import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Search, TrendingUp, TrendingDown, Minus, Check, X, Edit, Trash2, Copy, Upload,
  ChevronLeft, ChevronRight, BarChart3, CalendarDays, AlertCircle, Sparkles, RefreshCw,
  Target, RotateCcw, SlidersHorizontal, BookOpen, Maximize2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { MetricCard } from '@/components/ui/metric-card';
import { cn } from '@/lib/utils';
import CSVImport from '@/components/CSVImport';

// ── Helpers ───────────────────────────────────────────────────────────────────
async function getSignedUrl(path: string): Promise<string | null> {
  if (!path) return null;
  if (path.includes('token=')) return path;
  let storagePath = path;
  const match = path.match(/trade-screenshots\/(.+)/);
  if (match) storagePath = match[1];
  const { data, error } = await supabase.storage
    .from('trade-screenshots').createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

function fmtMoney(v: number) {
  const s = v >= 0 ? '+' : '−';
  return `${s}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function pnlColor(v: number) {
  if (v > 0) return 'text-success';
  if (v < 0) return 'text-danger';
  return 'text-muted-foreground';
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
  pair: string; session: string; setup: string; side: string;
  outcome: string; account: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SESSIONS = ['London', 'New York', 'Asia', 'London/NY Overlap', 'Pre-Market'];
const EMOTIONS = ['focused', 'confident', 'anxious', 'tired', 'excited', 'calm', 'frustrated'];
const MISTAKES = [
  'Entered too early', 'Entered too late', 'Moved stop loss',
  'Over-leveraged', 'Revenge trade', 'Ignored setup rules',
  'Missed take profit', 'FOMO entry', 'News trade', 'No plan',
];
const COMMON_PAIRS = ['NAS100', 'US30', 'XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'SP500'];
const ACCOUNT_TYPES = [
  { value: 'main', label: 'Main Account' },
  { value: 'funded', label: 'Funded Challenge' },
  { value: 'prop_firm', label: 'Prop Firm' },
  { value: 'demo', label: 'Demo Account' },
];
const EMPTY_FORM: FormData = {
  pair: '', side: 'long', trade_date: new Date().toISOString().split('T')[0],
  session: '', outcome: 'win', result: '', rr: '', entry_price: '', exit_price: '',
  setup: '', playbook_id: '', mistakes: [], notes: '', screenshot_url: '',
  account_type: 'main', emotion: 'focused', discipline_score: 7, execution_score: 7,
};
const EMPTY_FILTERS: Filters = {
  search: '', dateFrom: '', dateTo: '', pair: '', session: '',
  setup: '', side: '', outcome: '', account: '',
};

// ── Filter Bar ────────────────────────────────────────────────────────────────
function FilterBar({ filters, setFilters, uniquePairs, uniqueSetups, onReset }: {
  filters: Filters; setFilters: (f: Filters) => void;
  uniquePairs: string[]; uniqueSetups: string[]; onReset: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const set = (k: keyof Filters, v: string) => setFilters({ ...filters, [k]: v });
  const hasActive = Object.values(filters).some(v => v !== '');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={filters.search}
            onChange={e => set('search', e.target.value)}
            placeholder="Search pair, setup, notes…"
            className="pl-9"
          />
        </div>

        <Input type="date" value={filters.dateFrom} onChange={e => set('dateFrom', e.target.value)}
          className="w-[140px]" aria-label="Date from" />
        <span className="text-muted-foreground text-xs">→</span>
        <Input type="date" value={filters.dateTo} onChange={e => set('dateTo', e.target.value)}
          className="w-[140px]" aria-label="Date to" />

        <Select value={filters.pair || 'all'} onValueChange={v => set('pair', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Pair" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Pairs</SelectItem>
            {uniquePairs.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.outcome || 'all'} onValueChange={v => set('outcome', v === 'all' ? '' : v)}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Result" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="win">Win</SelectItem>
            <SelectItem value="loss">Loss</SelectItem>
            <SelectItem value="breakeven">Breakeven</SelectItem>
          </SelectContent>
        </Select>

        <Button variant={expanded ? 'default' : 'outline'} size="sm"
          onClick={() => setExpanded(v => !v)} className="gap-1.5">
          <SlidersHorizontal className="h-3.5 w-3.5" /> More
        </Button>

        {hasActive && (
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5 text-muted-foreground">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </Button>
        )}
      </div>

      {expanded && (
        <div className="flex gap-2 flex-wrap pt-1">
          <Select value={filters.session || 'all'} onValueChange={v => set('session', v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Session" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions</SelectItem>
              {SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.setup || 'all'} onValueChange={v => set('setup', v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Setup" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Setups</SelectItem>
              {uniqueSetups.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filters.side || 'all'} onValueChange={v => set('side', v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Direction" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Both Directions</SelectItem>
              <SelectItem value="long">Long</SelectItem>
              <SelectItem value="short">Short</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.account || 'all'} onValueChange={v => set('account', v === 'all' ? '' : v)}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Account" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {ACCOUNT_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// ── Calendar View ─────────────────────────────────────────────────────────────
function CalendarView({ trades, onSelectDay }: {
  trades: Trade[]; onSelectDay: (date: string, trades: Trade[]) => void;
}) {
  const [current, setCurrent] = useState(new Date());
  const year = current.getFullYear();
  const month = current.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
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
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
        <div>
          <p className="text-sm font-semibold text-foreground">Trading Calendar</p>
          <p className="text-xs text-muted-foreground mt-0.5">Click a day to filter its trades</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setCurrent(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-foreground w-36 text-center">{monthLabel}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8"
            onClick={() => setCurrent(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-7 mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: cells }, (_, i) => {
            const dayNum = i - firstDayOfWeek + 1;
            const inMonth = dayNum >= 1 && dayNum <= daysInMonth;
            const dateStr = inMonth
              ? `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`
              : '';
            const entry = dateStr ? dayMap[dateStr] : undefined;
            const isProfit = (entry?.pnl ?? 0) > 0;
            const isLoss = (entry?.pnl ?? 0) < 0;

            return (
              <button key={i}
                disabled={!inMonth || !entry}
                onClick={() => entry && onSelectDay(dateStr, entry.trades)}
                className={cn(
                  'relative min-h-[68px] rounded-lg p-2 text-left transition-colors border',
                  !inMonth && 'opacity-0 pointer-events-none',
                  entry && isProfit && 'bg-success/10 border-success/25 hover:bg-success/15',
                  entry && isLoss && 'bg-danger/10 border-danger/25 hover:bg-danger/15',
                  !entry && inMonth && 'bg-transparent border-border/60',
                )}
              >
                {inMonth && (
                  <>
                    <span className={cn('text-xs font-semibold',
                      entry && isProfit && 'text-success',
                      entry && isLoss && 'text-danger',
                      !entry && 'text-muted-foreground',
                    )}>{dayNum}</span>
                    {entry && (
                      <div className="mt-1">
                        <p className={cn('text-[11px] font-semibold leading-tight font-mono',
                          isProfit ? 'text-success' : 'text-danger')}>
                          {isProfit ? '+' : '−'}${Math.abs(entry.pnl).toFixed(0)}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{entry.count} trade{entry.count > 1 ? 's' : ''}</p>
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 mt-4 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-success/20 border border-success/30" />
            <span className="text-xs text-muted-foreground">Profit day</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-danger/20 border border-danger/30" />
            <span className="text-xs text-muted-foreground">Loss day</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add/Edit Trade Modal ──────────────────────────────────────────────────────
function AddTradeModal({ open, onClose, onSaved, editTrade, playbooks }: {
  open: boolean; onClose: () => void; onSaved: () => void;
  editTrade?: Trade | null;
  playbooks: { id: string; title: string }[];
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (k: keyof FormData, v: any) => setForm(f => ({ ...f, [k]: v }));

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1); setErrors({});
      setForm(editTrade ? {
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
    }
  }, [open, editTrade]);

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
        toast({ title: 'Trade updated' });
      } else {
        const { error } = await supabase.from('trades').insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
        toast({ title: 'Trade saved' });
      }
      if (another && !editTrade) {
        setForm({ ...EMPTY_FORM, trade_date: form.trade_date, session: form.session, account_type: form.account_type });
        setStep(1); setErrors({});
        onSaved();
      } else { onSaved(); onClose(); }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border">
          <DialogTitle className="flex items-center justify-between">
            <span>{editTrade ? 'Edit Trade' : 'Log Trade'}</span>
            <span className="text-xs font-normal text-muted-foreground">Step {step} of 3</span>
          </DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 py-3 border-b border-border">
          {[1, 2, 3].map((s, i) => (
            <React.Fragment key={s}>
              <button onClick={() => step > s && setStep(s)}
                className={cn('w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors',
                  step === s && 'bg-primary text-primary-foreground',
                  step > s && 'bg-success/15 text-success cursor-pointer',
                  step < s && 'bg-muted text-muted-foreground',
                )}>
                {step > s ? <Check className="h-3 w-3" /> : s}
              </button>
              {i < 2 && <div className={cn('flex-1 h-px', step > s ? 'bg-success/30' : 'bg-border')} />}
            </React.Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Pair *</Label>
                <Input value={form.pair} onChange={e => set('pair', e.target.value.toUpperCase())}
                  placeholder="NAS100, XAUUSD…" className={errors.pair ? 'border-danger' : ''} />
                <div className="flex gap-1.5 flex-wrap">
                  {COMMON_PAIRS.map(p => (
                    <button key={p} onClick={() => set('pair', p)}
                      className={cn('text-[11px] font-medium px-2.5 py-1 rounded border transition-colors',
                        form.pair === p
                          ? 'bg-primary/10 border-primary/30 text-primary'
                          : 'border-border text-muted-foreground hover:bg-muted',
                      )}>{p}</button>
                  ))}
                </div>
                {errors.pair && <p className="text-xs text-danger">{errors.pair}</p>}
              </div>

              <div className="space-y-2">
                <Label>Direction</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: 'long', label: 'Long', icon: <TrendingUp className="h-4 w-4" /> },
                    { v: 'short', label: 'Short', icon: <TrendingDown className="h-4 w-4" /> },
                  ] as const).map(o => (
                    <button key={o.v} onClick={() => set('side', o.v)}
                      className={cn('flex items-center justify-center gap-2 py-2.5 rounded-md border text-sm font-medium transition-colors',
                        form.side === o.v
                          ? o.v === 'long'
                            ? 'bg-success/10 border-success/30 text-success'
                            : 'bg-danger/10 border-danger/30 text-danger'
                          : 'border-border text-muted-foreground hover:bg-muted',
                      )}>{o.icon}{o.label}</button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={form.trade_date} onChange={e => set('trade_date', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Session</Label>
                  <Select value={form.session} onValueChange={v => set('session', v)}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {SESSIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={form.account_type} onValueChange={v => set('account_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Result</Label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: 'win', label: 'Win' },
                    { v: 'loss', label: 'Loss' },
                    { v: 'breakeven', label: 'Breakeven' },
                  ] as const).map(o => (
                    <button key={o.v} onClick={() => set('outcome', o.v)}
                      className={cn('py-2.5 rounded-md border text-sm font-medium transition-colors',
                        form.outcome === o.v
                          ? o.v === 'win' ? 'bg-success/10 border-success/30 text-success'
                            : o.v === 'loss' ? 'bg-danger/10 border-danger/30 text-danger'
                              : 'bg-muted border-border text-foreground'
                          : 'border-border text-muted-foreground hover:bg-muted',
                      )}>{o.label}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>P&L ($) *</Label>
                <Input type="number" value={form.result} onChange={e => set('result', e.target.value)}
                  placeholder={form.outcome === 'loss' ? '-120.00' : '280.00'}
                  className={cn('text-base font-semibold font-mono',
                    form.result && (Number(form.result) >= 0 ? 'text-success' : 'text-danger'),
                    errors.result && 'border-danger')} />
                {errors.result && <p className="text-xs text-danger">{errors.result}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                {([
                  { label: 'R:R', key: 'rr', placeholder: '2.5' },
                  { label: 'Entry', key: 'entry_price', placeholder: '20420' },
                  { label: 'Exit', key: 'exit_price', placeholder: '20540' },
                ] as const).map(f => (
                  <div key={f.key} className="space-y-2">
                    <Label>{f.label}</Label>
                    <Input type="number" value={(form as any)[f.key]} onChange={e => set(f.key as any, e.target.value)}
                      placeholder={f.placeholder} />
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="flex justify-between">Execution <span className="text-muted-foreground">{form.execution_score}/10</span></Label>
                  <input type="range" min="1" max="10" value={form.execution_score}
                    onChange={e => set('execution_score', Number(e.target.value))}
                    className="w-full accent-primary" />
                </div>
                <div className="space-y-2">
                  <Label className="flex justify-between">Discipline <span className="text-muted-foreground">{form.discipline_score}/10</span></Label>
                  <input type="range" min="1" max="10" value={form.discipline_score}
                    onChange={e => set('discipline_score', Number(e.target.value))}
                    className="w-full accent-primary" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Emotion</Label>
                <Select value={form.emotion} onValueChange={v => set('emotion', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EMOTIONS.map(e => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Chart Screenshot</Label>
                {form.screenshot_url && previewUrl ? (
                  <div className="relative group rounded-md overflow-hidden border border-border">
                    <img src={previewUrl} alt="screenshot" className="w-full h-40 object-cover" />
                    <button type="button" onClick={() => set('screenshot_url', '')}
                      className="absolute top-2 right-2 p-1.5 rounded-md bg-background/90 border border-border text-danger hover:bg-danger/10">
                      <X className="h-3.5 w-3.5" />
                    </button>
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
                        set('screenshot_url', path);
                        URL.revokeObjectURL(local);
                      }} />
                    <button type="button" onClick={() => fileRef.current?.click()}
                      className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-md border-2 border-dashed border-border bg-muted/30 hover:bg-muted/60 hover:border-primary/40 transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Click to upload · PNG, JPG · max 10MB</p>
                    </button>
                  </>
                )}
              </div>

              <div className="space-y-2">
                <Label>Setup</Label>
                <Input value={form.setup} onChange={e => set('setup', e.target.value)} placeholder="e.g. Pullback to 20 EMA" />
              </div>

              {playbooks.length > 0 && (
                <div className="space-y-2">
                  <Label>Link Playbook</Label>
                  <Select value={form.playbook_id || 'none'} onValueChange={v => set('playbook_id', v === 'none' ? '' : v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not linked</SelectItem>
                      {playbooks.map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Mistakes</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MISTAKES.map(m => {
                    const active = form.mistakes.includes(m);
                    return (
                      <button key={m} onClick={() => set('mistakes', active ? form.mistakes.filter(x => x !== m) : [...form.mistakes, m])}
                        className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs text-left transition-colors',
                          active ? 'bg-danger/10 border-danger/25 text-danger' : 'border-border text-muted-foreground hover:bg-muted')}>
                        <div className={cn('w-3.5 h-3.5 rounded-sm flex items-center justify-center flex-shrink-0',
                          active ? 'bg-danger' : 'border border-border')}>
                          {active && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                        </div>
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  placeholder="Observations, lessons, context…" rows={3} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 px-6 py-4 border-t border-border">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={() => validate(step) && setStep(s => s + 1)} className="flex-1 gap-1">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <>
              {!editTrade && (
                <Button variant="outline" onClick={() => handleSave(true)} disabled={saving} className="flex-1">
                  Save & Add Another
                </Button>
              )}
              <Button onClick={() => handleSave(false)} disabled={saving} className={editTrade ? 'flex-1' : 'px-6'}>
                {saving ? 'Saving…' : editTrade ? 'Update' : 'Save Trade'}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Trade Drawer (Sheet) ──────────────────────────────────────────────────────
function TradeDetails({ trade, onClose, onEdit, onDuplicate, onDelete, onAIReview, playbooks, reviewing }: {
  trade: Trade; onClose: () => void; onEdit: (t: Trade) => void;
  onDuplicate: (t: Trade) => void; onDelete: (t: Trade) => void;
  onAIReview: (t: Trade) => Promise<void>;
  playbooks: { id: string; title: string; entry_rules?: string }[];
  reviewing: boolean;
}) {
  const isWin = (trade.result ?? 0) > 0;
  const isLoss = (trade.result ?? 0) < 0;
  const ai = trade.ai_review as any ?? {};
  const linkedPb = playbooks.find(p => p.id === trade.playbook_id);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [zoomOpen, setZoomOpen] = useState(false);

  useEffect(() => {
    if (!trade.screenshot_url) { setScreenshotUrl(null); return; }
    getSignedUrl(trade.screenshot_url).then(setScreenshotUrl);
  }, [trade.screenshot_url]);

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className={cn('gap-1 font-medium border',
                isWin && 'border-success/30 bg-success/10 text-success',
                isLoss && 'border-danger/30 bg-danger/10 text-danger',
                !isWin && !isLoss && 'border-border text-muted-foreground')}>
                {isWin ? <TrendingUp className="h-3 w-3" /> : isLoss ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                {isWin ? 'Win' : isLoss ? 'Loss' : 'BE'}
              </Badge>
              <Badge variant="outline" className="capitalize">{trade.side}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onEdit(trade)} className="h-8 gap-1">
              <Edit className="h-3.5 w-3.5" /> Edit
            </Button>
          </div>
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground tracking-tight">{trade.pair}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(trade.trade_date)}</p>
            </div>
            <p className={cn('text-2xl font-semibold font-mono tracking-tight', pnlColor(trade.result ?? 0))}>
              {fmtMoney(trade.result ?? 0)}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Metrics grid */}
          <div className="px-5 pt-4 pb-3 grid grid-cols-3 gap-2">
            {[
              { label: 'Entry', value: trade.entry_price ? Number(trade.entry_price).toLocaleString() : '—' },
              { label: 'Exit', value: trade.exit_price ? Number(trade.exit_price).toLocaleString() : '—' },
              { label: 'R:R', value: trade.rr ? `1:${Number(trade.rr).toFixed(1)}` : '—' },
              { label: 'Session', value: trade.session || '—' },
              { label: 'Setup', value: trade.setup || '—' },
              { label: 'Discipline', value: trade.discipline_score ? `${trade.discipline_score}/10` : '—' },
            ].map(s => (
              <div key={s.label} className="rounded-md border border-border bg-card px-2.5 py-2">
                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                <p className="text-sm font-medium text-foreground truncate mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Screenshot */}
          <div className="px-5 pb-3">
            {screenshotUrl ? (
              <button onClick={() => setZoomOpen(true)}
                className="relative w-full rounded-md overflow-hidden border border-border group">
                <img src={screenshotUrl} alt="chart" className="w-full object-cover max-h-[220px]" />
                <div className="absolute inset-0 bg-background/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-background/95 border border-border text-xs font-medium">
                    <Maximize2 className="h-3.5 w-3.5" /> View full size
                  </div>
                </div>
              </button>
            ) : (
              <div className="rounded-md border border-dashed border-border bg-muted/30 p-5 flex flex-col items-center gap-2 text-center">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No screenshot uploaded</p>
                <Button variant="outline" size="sm" onClick={() => onEdit(trade)}>Add screenshot</Button>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="px-5 pb-24">
            <Tabs defaultValue="notes" className="w-full">
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="mistakes">Mistakes</TabsTrigger>
                <TabsTrigger value="ai">AI</TabsTrigger>
                <TabsTrigger value="playbook">Playbook</TabsTrigger>
              </TabsList>

              <TabsContent value="notes" className="pt-3">
                {trade.notes ? (
                  <div className="rounded-md border border-border bg-card p-4">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{trade.notes}</p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No notes for this trade</p>
                    <Button variant="link" size="sm" onClick={() => onEdit(trade)}>Add notes</Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="mistakes" className="pt-3 space-y-2">
                {(trade.mistakes ?? []).length > 0 ? (
                  (trade.mistakes ?? []).map(m => (
                    <div key={m} className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-danger/20 bg-danger/5">
                      <AlertCircle className="h-4 w-4 text-danger flex-shrink-0" />
                      <p className="text-sm text-foreground">{m}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Check className="h-6 w-6 text-success mx-auto mb-2" />
                    <p className="text-sm text-success font-medium">Clean execution</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ai" className="pt-3">
                {ai?.verdict ? (
                  <div className="space-y-3">
                    <div className={cn('rounded-md border px-4 py-3 flex items-center gap-3',
                      ai.verdict === 'Good trade' && 'border-success/25 bg-success/5',
                      ai.verdict === 'Poor trade' && 'border-danger/25 bg-danger/5',
                      ai.verdict === 'Average trade' && 'border-border bg-muted/30',
                    )}>
                      <Sparkles className={cn('h-4 w-4',
                        ai.verdict === 'Good trade' && 'text-success',
                        ai.verdict === 'Poor trade' && 'text-danger',
                        ai.verdict === 'Average trade' && 'text-muted-foreground',
                      )} />
                      <div className="flex-1">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">AI Verdict</p>
                        <p className={cn('text-sm font-semibold',
                          ai.verdict === 'Good trade' && 'text-success',
                          ai.verdict === 'Poor trade' && 'text-danger',
                        )}>{ai.verdict}</p>
                      </div>
                      {ai.discipline_score != null && (
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">Score</p>
                          <p className="text-lg font-semibold text-foreground">{ai.discipline_score}</p>
                        </div>
                      )}
                    </div>
                    {ai.what_went_well && (
                      <div className="rounded-md border border-success/20 bg-success/5 p-3">
                        <p className="text-[10px] font-semibold text-success uppercase tracking-wider mb-1">What went well</p>
                        <p className="text-sm text-foreground/80">{ai.what_went_well}</p>
                      </div>
                    )}
                    {ai.what_went_wrong && (
                      <div className="rounded-md border border-danger/20 bg-danger/5 p-3">
                        <p className="text-[10px] font-semibold text-danger uppercase tracking-wider mb-1">What went wrong</p>
                        <p className="text-sm text-foreground/80">{ai.what_went_wrong}</p>
                      </div>
                    )}
                    {ai.rule_broken && (
                      <div className="rounded-md border border-border bg-muted/30 p-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Rule broken</p>
                        <p className="text-sm text-foreground/80">{ai.rule_broken}</p>
                      </div>
                    )}
                    {ai.improvement && (
                      <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                        <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-1">Action item</p>
                        <p className="text-sm text-foreground/80">{ai.improvement}</p>
                      </div>
                    )}
                    <Button variant="outline" size="sm" onClick={() => onAIReview(trade)} disabled={reviewing} className="w-full gap-2">
                      <RefreshCw className={cn('h-3.5 w-3.5', reviewing && 'animate-spin')} /> Re-analyze
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="h-6 w-6 text-primary mx-auto mb-2" />
                    <p className="text-sm font-medium text-foreground">AI Trade Review</p>
                    <p className="text-xs text-muted-foreground mt-1 mb-4">Get instant feedback on this trade</p>
                    <Button onClick={() => onAIReview(trade)} disabled={reviewing} size="sm" className="gap-2">
                      <Sparkles className={cn('h-3.5 w-3.5', reviewing && 'animate-spin')} />
                      {reviewing ? 'Analyzing…' : 'Analyze trade'}
                    </Button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="playbook" className="pt-3">
                {linkedPb ? (
                  <div className="space-y-3">
                    <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
                      <p className="text-[10px] text-primary uppercase tracking-wider font-semibold mb-1">Linked Playbook</p>
                      <p className="text-sm font-semibold text-foreground">{linkedPb.title}</p>
                      {trade.setup && <p className="text-xs text-muted-foreground mt-0.5">{trade.setup}</p>}
                    </div>
                    {linkedPb.entry_rules && (
                      <div className="rounded-md border border-border bg-card p-3">
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Entry Rules</p>
                        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{linkedPb.entry_rules}</p>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-md border border-success/20 bg-success/5 p-3 text-center">
                        <p className="text-[10px] font-semibold text-success uppercase tracking-wider mb-1">Rules followed</p>
                        <p className="text-xl font-semibold text-success">{Math.max(0, 5 - (trade.mistakes?.length ?? 0))}</p>
                      </div>
                      <div className="rounded-md border border-danger/20 bg-danger/5 p-3 text-center">
                        <p className="text-[10px] font-semibold text-danger uppercase tracking-wider mb-1">Rules broken</p>
                        <p className="text-xl font-semibold text-danger">{trade.mistakes?.length ?? 0}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No playbook linked</p>
                    <Button variant="link" size="sm" onClick={() => onEdit(trade)}>Link a playbook</Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="px-5 py-3 border-t border-border bg-background flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { onDuplicate(trade); onClose(); }} className="flex-1 gap-1.5">
            <Copy className="h-3.5 w-3.5" /> Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={() => onAIReview(trade)} disabled={reviewing} className="flex-1 gap-1.5 text-primary">
            <Sparkles className={cn('h-3.5 w-3.5', reviewing && 'animate-spin')} /> AI
          </Button>
          <Button variant="outline" size="sm" onClick={() => { onDelete(trade); onClose(); }}
            className="text-danger border-danger/30 hover:bg-danger/10">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Zoom dialog */}
        <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
          <DialogContent className="max-w-5xl p-2">
            {screenshotUrl && <img src={screenshotUrl} alt="chart full" className="w-full h-auto rounded" />}
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TradeVault() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [playbooks, setPlaybooks] = useState<{ id: string; title: string; entry_rules?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [viewTrade, setViewTrade] = useState<Trade | null>(null);
  const [view, setView] = useState<'table' | 'calendar'>('table');
  const [importOpen, setImportOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [tr, pb] = await Promise.all([
      supabase.from('trades').select('*').eq('user_id', user.id)
        .order('trade_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('playbooks').select('id,title,entry_rules').eq('user_id', user.id),
    ]);
    setTrades((tr.data as Trade[]) ?? []);
    setPlaybooks(pb.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (t: Trade) => {
    if (!confirm(`Delete this ${t.pair} trade?`)) return;
    await supabase.from('trades').delete().eq('id', t.id);
    toast({ title: 'Trade deleted' });
    if (viewTrade?.id === t.id) setViewTrade(null);
    load();
  };

  const handleDuplicate = async (t: Trade) => {
    const { id, created_at, updated_at, ...rest } = t;
    await supabase.from('trades').insert({
      ...rest, trade_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    });
    toast({ title: 'Trade duplicated' });
    load();
  };

  const handleAIReview = async (trade: Trade) => {
    setReviewingId(trade.id);
    try {
      const { data, error } = await supabase.functions.invoke('trade-review', { body: { trade } });
      if (error) throw error;
      const review = data;
      await supabase.from('trades').update({ ai_review: review, updated_at: new Date().toISOString() }).eq('id', trade.id);
      setTrades(p => p.map(t => t.id === trade.id ? { ...t, ai_review: review } : t));
      if (viewTrade?.id === trade.id) setViewTrade(p => p ? { ...p, ai_review: review } : p);
      toast({ title: 'AI review ready' });
    } catch (e: any) {
      toast({ title: 'AI review failed', description: e.message, variant: 'destructive' });
    } finally {
      setReviewingId(null);
    }
  };

  const openEdit = (t: Trade) => { setEditTrade(t); setModalOpen(true); setViewTrade(null); };

  const stats = useMemo(() => {
    const wins = trades.filter(t => (t.result ?? 0) > 0);
    const total = trades.reduce((s, t) => s + (t.result ?? 0), 0);
    const rrs = trades.filter(t => t.rr);
    return {
      total, count: trades.length,
      winRate: trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0,
      avgRR: rrs.length > 0 ? rrs.reduce((s, t) => s + (t.rr ?? 0), 0) / rrs.length : null,
    };
  }, [trades]);

  const uniquePairs = useMemo(() => [...new Set(trades.map(t => t.pair))].sort(), [trades]);
  const uniqueSetups = useMemo(() => [...new Set(trades.map(t => t.setup).filter(Boolean) as string[])].sort(), [trades]);

  const filtered = useMemo(() => trades.filter(t => {
    const s = filters.search.toLowerCase();
    if (s && !t.pair.toLowerCase().includes(s) && !(t.setup ?? '').toLowerCase().includes(s) && !(t.notes ?? '').toLowerCase().includes(s)) return false;
    if (filters.dateFrom && t.trade_date < filters.dateFrom) return false;
    if (filters.dateTo && t.trade_date > filters.dateTo) return false;
    if (filters.pair && t.pair !== filters.pair) return false;
    if (filters.session && t.session !== filters.session) return false;
    if (filters.setup && t.setup !== filters.setup) return false;
    if (filters.side && t.side !== filters.side) return false;
    if (filters.outcome && t.outcome !== filters.outcome) return false;
    if (filters.account && t.account_type !== filters.account) return false;
    return true;
  }), [trades, filters]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Trade Vault"
        description="Every trade, reviewed and searchable."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 p-0.5 rounded-md border border-border bg-muted/40">
              <button onClick={() => setView('table')}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
                  view === 'table' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                <BarChart3 className="h-3.5 w-3.5" /> Table
              </button>
              <button onClick={() => setView('calendar')}
                className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
                  view === 'calendar' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                <CalendarDays className="h-3.5 w-3.5" /> Calendar
              </button>
            </div>
            <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
              <Upload className="h-4 w-4" /> Import
            </Button>
            <Button onClick={() => { setEditTrade(null); setModalOpen(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Log Trade
            </Button>
          </div>
        }
      />

      {/* Stats */}
      {!loading && trades.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Total P&L" value={fmtMoney(stats.total)} tone={stats.total > 0 ? 'success' : stats.total < 0 ? 'danger' : 'neutral'} />
          <MetricCard label="Win Rate" value={`${stats.winRate}%`} tone={stats.winRate >= 50 ? 'success' : 'neutral'} />
          <MetricCard label="Avg R:R" value={stats.avgRR ? `1:${stats.avgRR.toFixed(1)}` : '—'} />
          <MetricCard label="Total Trades" value={`${stats.count}`} />
        </div>
      )}

      {/* Filters */}
      {trades.length > 0 && (
        <FilterBar filters={filters} setFilters={setFilters}
          uniquePairs={uniquePairs} uniqueSetups={uniqueSetups}
          onReset={() => setFilters(EMPTY_FILTERS)} />
      )}

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-muted/40 rounded-md animate-pulse" />)}
        </div>
      ) : trades.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No trades yet."
          description="Start your trading history. Every trade logged sharpens your edge."
          actions={
            <>
              <Button onClick={() => { setEditTrade(null); setModalOpen(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Log First Trade
              </Button>
              <Button variant="outline" onClick={() => setImportOpen(true)} className="gap-2">
                <Upload className="h-4 w-4" /> Import Trades
              </Button>
            </>
          }
        />
      ) : view === 'calendar' ? (
        <CalendarView trades={filtered} onSelectDay={(date) => {
          setView('table');
          setFilters(f => ({ ...f, dateFrom: date, dateTo: date }));
        }} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No trades match your filters"
          actions={<Button variant="outline" onClick={() => setFilters(EMPTY_FILTERS)}>Clear filters</Button>}
        />
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr className="text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Pair</th>
                  <th className="px-4 py-2.5">Side</th>
                  <th className="px-4 py-2.5">Setup</th>
                  <th className="px-4 py-2.5">Session</th>
                  <th className="px-4 py-2.5">Result</th>
                  <th className="px-4 py-2.5 text-right">P&L</th>
                  <th className="px-4 py-2.5">R:R</th>
                  <th className="px-4 py-2.5 w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(t => {
                  const isWin = (t.result ?? 0) > 0;
                  const isLoss = (t.result ?? 0) < 0;
                  return (
                    <tr key={t.id} onClick={() => setViewTrade(t)}
                      className="group cursor-pointer hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(t.trade_date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-foreground">{t.pair}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('inline-flex items-center gap-1 text-xs font-medium capitalize',
                          t.side === 'long' ? 'text-success' : 'text-danger')}>
                          {t.side === 'long' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {t.side}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[180px]">{t.setup || '—'}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.session || '—'}</td>
                      <td className="px-4 py-2.5">
                        <span className={cn('text-[11px] font-medium px-2 py-0.5 rounded capitalize',
                          isWin && 'bg-success/10 text-success',
                          isLoss && 'bg-danger/10 text-danger',
                          !isWin && !isLoss && 'bg-muted text-muted-foreground')}>
                          {t.outcome}
                        </span>
                      </td>
                      <td className={cn('px-4 py-2.5 text-right font-mono font-medium', pnlColor(t.result ?? 0))}>
                        {fmtMoney(t.result ?? 0)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.rr ? `1:${Number(t.rr).toFixed(1)}` : '—'}</td>
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(t)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDuplicate(t)}>
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-danger hover:text-danger" onClick={() => handleDelete(t)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <AddTradeModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTrade(null); }}
        onSaved={load}
        editTrade={editTrade}
        playbooks={playbooks}
      />

      {viewTrade && (
        <TradeDetails
          trade={viewTrade}
          onClose={() => setViewTrade(null)}
          onEdit={openEdit}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onAIReview={handleAIReview}
          playbooks={playbooks}
          reviewing={reviewingId === viewTrade.id}
        />
      )}

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Trades</DialogTitle>
          </DialogHeader>
          <CSVImport onComplete={() => { setImportOpen(false); load(); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
