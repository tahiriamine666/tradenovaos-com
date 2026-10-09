// ─── AddTradeModal.tsx ────────────────────────────────────────────────────────
// Improved Add Trade modal:
// - Outcome field (Win / Loss / Breakeven) — required
// - Auto-normalize result based on outcome
// - Playbook empty state with link to Playbook Lab
// - Full validation + toast feedback

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  X, TrendingUp, TrendingDown, Minus, AlertCircle,
  Target, BookOpen, ArrowRight, Save, ChevronDown, Loader2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { PsychologyFields, EMPTY_PSYCHOLOGY, psychologyFrom, type Psychology } from '@/components/journal/PsychologyFields';

// ─── Types ────────────────────────────────────────────────────────────────────
type Outcome = 'win' | 'loss' | 'breakeven';
type Side = 'long' | 'short';

interface Playbook {
  id: string;
  title: string;
  status: string;
}

interface TradeForm {
  pair: string;
  side: Side | '';
  outcome: Outcome | '';
  result: string;
  trade_date: string;
  setup: string;
  playbook_id: string;
  notes: string;
  rr: string;
  session: string;
  weekly_context: string;
  daily_bias: string;
  timeframe: string;
  entry_price: string;
  stop_loss: string;
  take_profit: string;
  risk_amount: string;
  risk_percent: string;
  entry_reason: string;
  exit_reason: string;
  mistakes: string;
  rule_violations: string;
}

type Flags = { planned_trade: boolean | null; checklist_completed: boolean | null; late_entry: boolean | null; early_exit: boolean | null; moved_stop: boolean | null };
const EMPTY_FLAGS: Flags = { planned_trade: null, checklist_completed: null, late_entry: null, early_exit: null, moved_stop: null };
const tagsToText = (a: unknown) => (Array.isArray(a) ? a.join(', ') : '');
const textToTags = (s: string) => [...new Set(s.split(',').map(x => x.trim()).filter(Boolean))];
const numOrNull = (s: string) => (s.trim() === '' || isNaN(Number(s)) ? null : Number(s));

interface ValidationErrors {
  pair?: string;
  side?: string;
  outcome?: string;
  result?: string;
  trade_date?: string;
}

const EMPTY_FORM: TradeForm = {
  pair: '',
  side: '',
  outcome: '',
  result: '',
  trade_date: new Date().toISOString().split('T')[0],
  setup: '',
  playbook_id: '',
  notes: '',
  rr: '',
  session: '',
  weekly_context: '',
  daily_bias: '',
  timeframe: '',
  entry_price: '', stop_loss: '', take_profit: '', risk_amount: '', risk_percent: '',
  entry_reason: '', exit_reason: '', mistakes: '', rule_violations: '',
};

function Section({ title, defaultOpen = false, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border bg-muted/10">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm font-medium text-foreground">
        {title}<ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-3 border-t border-border px-3 py-3">{children}</div>}
    </div>
  );
}

function YesNo({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-1">
        {([true, false] as const).map(b => (
          <button key={String(b)} type="button" aria-label={`${label} ${b ? 'yes' : 'no'}`} aria-pressed={value === b} onClick={() => onChange(value === b ? null : b)}
            className={`h-7 flex-1 rounded border text-[11px] font-semibold transition-colors ${value === b ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:bg-muted'}`}>{b ? 'Yes' : 'No'}</button>
        ))}
      </div>
    </div>
  );
}

const SESSIONS = ['london', 'new_york', 'asia', 'overlap'];
const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1H', '4H', 'Daily', 'Weekly'];
const BIASES = ['Bullish', 'Bearish', 'Neutral'];

// ─── Outcome selector ─────────────────────────────────────────────────────────
function OutcomeSelector({ value, onChange, error }: {
  value: Outcome | ''; onChange: (v: Outcome) => void; error?: string;
}) {
  const options = [
    { value: 'win' as Outcome, label: 'Win', icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10 border-primary/40' },
    { value: 'loss' as Outcome, label: 'Loss', icon: TrendingDown, color: 'text-muted-foreground', bg: 'bg-muted/10 border-border/40' },
    { value: 'breakeven' as Outcome, label: 'Breakeven', icon: Minus, color: 'text-muted-foreground', bg: 'bg-muted/10 border-border/40' },
  ];

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-2">
        Outcome <span className="text-muted-foreground">*</span>
      </label>
      <div className="grid grid-cols-3 gap-2">
        {options.map(o => {
          const selected = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all ${
                selected ? `${o.bg} border-current ${o.color}` : 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted/30'
              }`}
            >
              <o.icon className="h-4 w-4" />
              <span className="text-xs font-medium">{o.label}</span>
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />{error}
        </p>
      )}
    </div>
  );
}

// ─── Side selector ────────────────────────────────────────────────────────────
function SideSelector({ value, onChange, error }: {
  value: Side | ''; onChange: (v: Side) => void; error?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-2">
        Side <span className="text-muted-foreground">*</span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        {(['long', 'short'] as Side[]).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            className={`py-2.5 rounded-xl border-2 text-sm font-medium capitalize transition-all ${
              value === s
                ? s === 'long'
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-muted/10 border-border/40 text-muted-foreground'
                : 'border-border text-muted-foreground hover:bg-muted/30'
            }`}
          >
            {s === 'long' ? '↑ Long' : '↓ Short'}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />{error}
        </p>
      )}
    </div>
  );
}

// ─── Playbook selector ────────────────────────────────────────────────────────
function PlaybookSelector({ value, onChange, playbooks, onGoToPlaybooks }: {
  value: string; onChange: (v: string) => void;
  playbooks: Playbook[]; onGoToPlaybooks: () => void;
}) {
  if (playbooks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center">
        <BookOpen className="h-7 w-7 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm font-medium text-foreground mb-0.5">No playbooks yet</p>
        <p className="text-xs text-muted-foreground mb-3">Create your first setup in Playbook Lab</p>
        <button
          type="button"
          onClick={onGoToPlaybooks}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline font-medium"
        >
          Go to Playbook Lab <ArrowRight className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1.5">Setup / Playbook</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
      >
        <option value="">No playbook selected</option>
        {playbooks.map(p => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Field error ──────────────────────────────────────────────────────────────
function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
      <AlertCircle className="h-3 w-3 flex-shrink-0" />{msg}
    </p>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
interface AddTradeModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  onGoToPlaybooks: () => void;
  editTrade?: any; // if provided, edit mode
}

export default function AddTradeModal({
  open, onClose, onSaved, onGoToPlaybooks, editTrade,
}: AddTradeModalProps) {
  const { user } = useAuth();
  const { activeAccountId } = useActiveAccount();
  const [form, setForm] = useState<TradeForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [chartFile, setChartFile] = useState<File | null>(null);
  const [beforeFile, setBeforeFile] = useState<File | null>(null);
  const [psy, setPsy] = useState<Psychology>(EMPTY_PSYCHOLOGY);
  const [flags, setFlags] = useState<Flags>(EMPTY_FLAGS);
  const [full, setFull] = useState<any>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Load playbooks
  useEffect(() => {
    if (!user || !open) return;
    supabase
      .from('playbooks')
      .select('id, title, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('title')
      .then(({ data }) => setPlaybooks(data ?? []));
  }, [user, open]);

  // Edit mode: fetch the COMPLETE own-user trade so partial list rows never wipe fields/account
  useEffect(() => {
    if (!open || !editTrade?.id || !user) { setFull(null); setLoadError(false); return; }
    let cancelled = false;
    setLoadingFull(true); setLoadError(false); setFull(null);
    supabase.from('trades').select('*').eq('id', editTrade.id).eq('user_id', user.id).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      setLoadingFull(false);
      if (error || !data) { setLoadError(true); return; }
      setFull(data);
    });
    return () => { cancelled = true; };
  }, [editTrade?.id, open, user]);

  useEffect(() => {
    const t = editTrade ? full : null;
    if (t) {
      const s = (v: unknown) => (v == null ? '' : String(v));
      setForm({
        pair: t.pair ?? '', side: t.side ?? '', outcome: t.outcome ?? '',
        result: t.result != null ? String(Math.abs(t.result)) : '',
        trade_date: t.trade_date ?? new Date().toISOString().split('T')[0],
        setup: t.setup ?? '', playbook_id: t.playbook_id ?? '', notes: t.notes ?? '', rr: s(t.rr), session: t.session ?? '',
        weekly_context: t.weekly_context ?? '', daily_bias: t.daily_bias ?? '', timeframe: t.timeframe ?? '',
        entry_price: s(t.entry_price), stop_loss: s(t.stop_loss), take_profit: s(t.take_profit), risk_amount: s(t.risk_amount), risk_percent: s(t.risk_percent),
        entry_reason: t.entry_reason ?? '', exit_reason: t.exit_reason ?? '', mistakes: tagsToText(t.mistakes), rule_violations: tagsToText(t.rule_violations),
      });
      setFlags({ planned_trade: t.planned_trade ?? null, checklist_completed: t.checklist_completed ?? null, late_entry: t.late_entry ?? null, early_exit: t.early_exit ?? null, moved_stop: t.moved_stop ?? null });
      setPsy(psychologyFrom(t));
    } else {
      setForm(EMPTY_FORM); setFlags(EMPTY_FLAGS); setPsy(EMPTY_PSYCHOLOGY);
    }
    setChartFile(null);
    setBeforeFile(null);
    setErrors({});
  }, [editTrade, full, open]);

  const set = (k: keyof TradeForm, v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  // When outcome changes, auto-adjust result sign display
  const handleOutcomeChange = (outcome: Outcome) => {
    set('outcome', outcome);
    if (outcome === 'breakeven') {
      set('result', '0');
    }
  };

  // Validate
  const validate = (): boolean => {
    const e: ValidationErrors = {};
    if (!form.pair.trim()) e.pair = 'Pair is required';
    if (!form.side) e.side = 'Select Long or Short';
    if (!form.outcome) e.outcome = 'Select Win, Loss, or Breakeven';
    if (form.outcome !== 'breakeven') {
      if (form.result === '' || isNaN(Number(form.result))) {
        e.result = 'Enter a valid P&L amount';
      } else if (Number(form.result) < 0) {
        e.result = 'Enter the absolute value (e.g. 150, not -150)';
      }
    }
    if (!form.trade_date) e.trade_date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // Compute final result based on outcome
  const computeResult = (): number => {
    if (form.outcome === 'breakeven') return 0;
    const abs = Math.abs(Number(form.result) || 0);
    return form.outcome === 'loss' ? -abs : abs;
  };

  // Save
  const handleSave = async () => {
    if (!user || (editTrade && !full)) return;
    if (!validate()) return;
    setSaving(true);

    const payload: any = {
      user_id: user.id,
      pair: form.pair.trim().toUpperCase(),
      side: form.side || null,
      outcome: form.outcome || null,
      result: computeResult(),
      trade_date: form.trade_date,
      setup: form.setup.trim() || null,
      playbook_id: form.playbook_id || null,
      notes: form.notes.trim() || null,
      rr: form.rr ? Number(form.rr) : null,
      session: form.session || null,
      weekly_context: form.weekly_context.trim() || null,
      daily_bias: form.daily_bias || null,
      timeframe: form.timeframe || null,
      entry_price: numOrNull(form.entry_price), stop_loss: numOrNull(form.stop_loss), take_profit: numOrNull(form.take_profit),
      risk_amount: numOrNull(form.risk_amount), risk_percent: numOrNull(form.risk_percent),
      entry_reason: form.entry_reason.trim() || null, exit_reason: form.exit_reason.trim() || null,
      mistakes: textToTags(form.mistakes), rule_violations: textToTags(form.rule_violations),
      ...flags,
      ...(!editTrade ? { trading_account_id: activeAccountId || null } : {}),
      ...psy,
      psychology_note: psy.psychology_note?.trim() || null,
    };

    for (const [file, field, label] of [
      [beforeFile, 'before_screenshot_url', 'Before screenshot'],
      [chartFile, 'screenshot_url', 'After screenshot'],
    ] as const) {
      if (!file) continue;
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type) || file.size > 10 * 1024 * 1024) {
        toast({ title: `${label} not uploaded`, description: 'Use a PNG, JPG, WebP or GIF under 10MB.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error: upErr } = await supabase.storage.from('trade-screenshots').upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        toast({ title: `${label} not uploaded`, description: 'Please try again.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      payload[field] = path;
    }

    let error;
    if (editTrade) {
      ({ error } = await supabase.from('trades').update(payload).eq('id', editTrade.id).eq('user_id', user.id));
    } else {
      ({ error } = await supabase.from('trades').insert(payload));
    }

    if (error) {
      const msg = error.message.includes('Free plan limit')
        ? 'Free plan limit reached (50 trades/month). Upgrade to Pro.'
        : 'Could not save trade. Please try again.';
      toast({ title: 'Error', description: msg, variant: 'destructive' });
      console.error(error);
    } else {
      toast({ title: editTrade ? 'Trade updated!' : 'Trade saved!', description: `${payload.pair} ${payload.outcome}` });
      onSaved();
      onClose();
      setForm(EMPTY_FORM);
    }
    setSaving(false);
  };

  const handleGoToPlaybooks = () => {
    onClose();
    onGoToPlaybooks();
  };

  if (!open) return null;

  const resultLabel = form.outcome === 'loss' ? 'Loss Amount ($)' :
    form.outcome === 'win' ? 'Profit Amount ($)' : 'P&L Amount ($)';

  const resultColor = form.outcome === 'win' ? 'text-primary' :
    form.outcome === 'loss' ? 'text-muted-foreground' : '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full sm:max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
            <div>
              <h2 className="font-heading font-bold text-foreground">
                {editTrade ? 'Edit Trade' : 'Add Trade'}
              </h2>
              <p className="text-xs text-muted-foreground">
                {editTrade ? 'Update your trade details' : 'Log your trade execution'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-5 py-5 space-y-3">
            {editTrade && loadingFull && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading full trade…</div>}
            {editTrade && loadError && <p className="rounded-lg border border-primary/30 px-3 py-2 text-sm text-foreground">Could not load this trade. Close and try again — nothing was changed.</p>}
            {(!editTrade || full) && (<>
            <Section title="Trade Details" defaultOpen>
            {/* Outcome — first, most important */}
            <OutcomeSelector
              value={form.outcome}
              onChange={handleOutcomeChange}
              error={errors.outcome}
            />

            {/* Pair + Side */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Pair <span className="text-muted-foreground">*</span>
                </label>
                <Input
                  value={form.pair}
                  onChange={e => set('pair', e.target.value.toUpperCase())}
                  placeholder="EURUSD"
                  className="rounded-lg uppercase"
                />
                <FieldError msg={errors.pair} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Date <span className="text-muted-foreground">*</span>
                </label>
                <input
                  type="date"
                  value={form.trade_date}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={e => set('trade_date', e.target.value)}
                  className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <FieldError msg={errors.trade_date} />
              </div>
            </div>

            {/* Side */}
            <SideSelector value={form.side} onChange={v => set('side', v)} error={errors.side} />

            {/* Result */}
            {form.outcome !== 'breakeven' && (
              <div>
                <label className={`text-xs font-medium block mb-1.5 ${resultColor || 'text-muted-foreground'}`}>
                  {resultLabel} <span className="text-muted-foreground">*</span>
                </label>
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium ${
                    form.outcome === 'win' ? 'text-primary' :
                    form.outcome === 'loss' ? 'text-muted-foreground' : 'text-muted-foreground'
                  }`}>
                    {form.outcome === 'loss' ? '-$' : '+$'}
                  </span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.result}
                    onChange={e => set('result', e.target.value)}
                    placeholder="150.00"
                    className="pl-8 rounded-lg"
                  />
                </div>
                {form.outcome && form.result && (
                  <p className={`text-xs mt-1 font-medium ${
                    form.outcome === 'win' ? 'text-primary' : 'text-muted-foreground'
                  }`}>
                    Will save as: {form.outcome === 'win' ? '+' : '-'}${Math.abs(Number(form.result)).toFixed(2)}
                  </p>
                )}
                <FieldError msg={errors.result} />
              </div>
            )}

            {/* Breakeven indicator */}
            {form.outcome === 'breakeven' && (
              <div className="flex items-center gap-2 bg-muted/10 border border-border/20 rounded-lg px-3 py-2.5">
                <Minus className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Result will be saved as $0.00</p>
              </div>
            )}

            {/* R:R + Session */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">R:R Ratio</label>
                <Input
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.rr}
                  onChange={e => set('rr', e.target.value)}
                  placeholder="2.5"
                  className="rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Session</label>
                <select
                  value={form.session}
                  onChange={e => set('session', e.target.value)}
                  className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select session</option>
                  {SESSIONS.map(s => (
                    <option key={s} value={s} className="capitalize">{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timeframe + before / after screenshots */}
            <div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Timeframe</label>
                <select
                  value={form.timeframe}
                  onChange={e => set('timeframe', e.target.value)}
                  className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select timeframe</option>
                  {TIMEFRAMES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            </Section>
            <Section title="Planning">
            {/* Weekly context + Daily bias */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Weekly Context</label>
                <Input
                  value={form.weekly_context}
                  onChange={e => set('weekly_context', e.target.value)}
                  placeholder="e.g. Turtle Soup / Bullish CRT"
                  className="rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Daily Bias</label>
                <select
                  value={form.daily_bias}
                  onChange={e => set('daily_bias', e.target.value)}
                  className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select bias</option>
                  {BIASES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>

            {/* Setup (text) */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Setup Tag</label>
              <Input
                value={form.setup}
                onChange={e => set('setup', e.target.value)}
                placeholder="e.g. Pullback, ORB, Liquidity Sweep..."
                className="rounded-lg"
              />
            </div>

            {/* Playbook */}
            <PlaybookSelector
              value={form.playbook_id}
              onChange={v => set('playbook_id', v)}
              playbooks={playbooks}
              onGoToPlaybooks={handleGoToPlaybooks}
            />

            <div className="grid grid-cols-2 gap-3">
              <YesNo label="Planned trade" value={flags.planned_trade} onChange={v => setFlags(f => ({ ...f, planned_trade: v }))} />
              <YesNo label="Checklist completed" value={flags.checklist_completed} onChange={v => setFlags(f => ({ ...f, checklist_completed: v }))} />
            </div>
            <div><label className="text-xs font-medium text-muted-foreground block mb-1.5" htmlFor="f-rv">Rule violations (comma separated)</label><Input id="f-rv" value={form.rule_violations} onChange={e => set('rule_violations', e.target.value)} placeholder="No confirmation, Traded news" className="rounded-lg" /></div>
            </Section>
            <Section title="Risk">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div><label className="text-xs font-medium text-muted-foreground block mb-1.5" htmlFor="f-entry_price">Entry</label><Input id="f-entry_price" type="number" step="any" value={form.entry_price} onChange={e => set('entry_price', e.target.value)} placeholder="1.0850" className="rounded-lg" /></div>
              <div><label className="text-xs font-medium text-muted-foreground block mb-1.5" htmlFor="f-stop_loss">Stop loss</label><Input id="f-stop_loss" type="number" step="any" value={form.stop_loss} onChange={e => set('stop_loss', e.target.value)} placeholder="1.0820" className="rounded-lg" /></div>
              <div><label className="text-xs font-medium text-muted-foreground block mb-1.5" htmlFor="f-take_profit">Take profit</label><Input id="f-take_profit" type="number" step="any" value={form.take_profit} onChange={e => set('take_profit', e.target.value)} placeholder="1.0920" className="rounded-lg" /></div>
              <div><label className="text-xs font-medium text-muted-foreground block mb-1.5" htmlFor="f-risk_amount">Risk amount ($)</label><Input id="f-risk_amount" type="number" step="any" value={form.risk_amount} onChange={e => set('risk_amount', e.target.value)} placeholder="100" className="rounded-lg" /></div>
              <div><label className="text-xs font-medium text-muted-foreground block mb-1.5" htmlFor="f-risk_percent">Risk per trade (%)</label><Input id="f-risk_percent" type="number" step="any" value={form.risk_percent} onChange={e => set('risk_percent', e.target.value)} placeholder="1" className="rounded-lg" /></div>
            </div>
            </Section>
            <Section title="Psychology">
              <PsychologyFields key={`${editTrade?.id ?? 'new'}-${open}-${full ? 1 : 0}`} value={psy} onChange={setPsy} collapsible={false} />
            </Section>
            <Section title="Review / Notes">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div><label className="text-xs font-medium text-muted-foreground block mb-1.5" htmlFor="f-er">Entry reason</label><Textarea id="f-er" value={form.entry_reason} onChange={e => set('entry_reason', e.target.value)} rows={2} className="text-sm resize-none rounded-lg" /></div>
              <div><label className="text-xs font-medium text-muted-foreground block mb-1.5" htmlFor="f-xr">Exit reason</label><Textarea id="f-xr" value={form.exit_reason} onChange={e => set('exit_reason', e.target.value)} rows={2} className="text-sm resize-none rounded-lg" /></div>
            </div>
            <div><label className="text-xs font-medium text-muted-foreground block mb-1.5" htmlFor="f-mt">Mistake tags (comma separated)</label><Input id="f-mt" value={form.mistakes} onChange={e => set('mistakes', e.target.value)} placeholder="Early entry, Oversized" className="rounded-lg" /></div>
            <div className="grid grid-cols-3 gap-3">
              <YesNo label="Late entry" value={flags.late_entry} onChange={v => setFlags(f => ({ ...f, late_entry: v }))} />
              <YesNo label="Early exit" value={flags.early_exit} onChange={v => setFlags(f => ({ ...f, early_exit: v }))} />
              <YesNo label="Moved stop" value={flags.moved_stop} onChange={v => setFlags(f => ({ ...f, moved_stop: v }))} />
            </div>
            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes</label>
              <Textarea
                value={form.notes}
                onChange={e => set('notes', e.target.value)}
                placeholder="Entry reason, market context, lessons..."
                rows={2}
                className="text-sm resize-none rounded-lg"
              />
            </div>
            </Section>
            <Section title="Screenshots">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Before screenshot</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={e => setBeforeFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:text-foreground"
                />
                {full?.before_screenshot_url && !beforeFile && <p className="mt-1 text-xs text-muted-foreground">Current before image saved</p>}
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">After screenshot</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={e => setChartFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs rounded-lg border border-border bg-background px-3 py-2 text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs file:text-foreground"
                />
                {full?.screenshot_url && !chartFile && <p className="mt-1 text-xs text-muted-foreground">Current after image saved</p>}
              </div>
            </div>



            </Section>
            </>)}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0">
            <Button onClick={handleSave} disabled={saving || (!!editTrade && !full)} className="rounded-xl flex-1">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : editTrade ? 'Update Trade' : 'Save Trade'}
            </Button>
            <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
