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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  X, TrendingUp, TrendingDown, Minus, AlertCircle,
  Target, BookOpen, ArrowRight, Save,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
}

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
};

const SESSIONS = ['london', 'new_york', 'asia', 'overlap'];

// ─── Outcome selector ─────────────────────────────────────────────────────────
function OutcomeSelector({ value, onChange, error }: {
  value: Outcome | ''; onChange: (v: Outcome) => void; error?: string;
}) {
  const options = [
    { value: 'win' as Outcome, label: 'Win', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/40' },
    { value: 'loss' as Outcome, label: 'Loss', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10 border-red-500/40' },
    { value: 'breakeven' as Outcome, label: 'Breakeven', icon: Minus, color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/40' },
  ];

  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-2">
        Outcome <span className="text-red-500">*</span>
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
        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
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
        Side <span className="text-red-500">*</span>
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
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500'
                  : 'bg-red-500/10 border-red-500/40 text-red-500'
                : 'border-border text-muted-foreground hover:bg-muted/30'
            }`}
          >
            {s === 'long' ? '↑ Long' : '↓ Short'}
          </button>
        ))}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
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
    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
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
  const [form, setForm] = useState<TradeForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);

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

  // Populate form in edit mode
  useEffect(() => {
    if (editTrade) {
      setForm({
        pair: editTrade.pair ?? '',
        side: editTrade.side ?? '',
        outcome: editTrade.outcome ?? '',
        result: editTrade.result != null ? String(Math.abs(editTrade.result)) : '',
        trade_date: editTrade.trade_date ?? new Date().toISOString().split('T')[0],
        setup: editTrade.setup ?? '',
        playbook_id: editTrade.playbook_id ?? '',
        notes: editTrade.notes ?? '',
        rr: editTrade.rr != null ? String(editTrade.rr) : '',
        session: editTrade.session ?? '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [editTrade, open]);

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
    if (!validate() || !user) return;
    setSaving(true);

    const payload = {
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
    };

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

  const resultColor = form.outcome === 'win' ? 'text-emerald-500' :
    form.outcome === 'loss' ? 'text-red-500' : '';

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
          <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

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
                  Pair <span className="text-red-500">*</span>
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
                  Date <span className="text-red-500">*</span>
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
                  {resultLabel} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium ${
                    form.outcome === 'win' ? 'text-emerald-500' :
                    form.outcome === 'loss' ? 'text-red-500' : 'text-muted-foreground'
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
                    form.outcome === 'win' ? 'text-emerald-500' : 'text-red-500'
                  }`}>
                    Will save as: {form.outcome === 'win' ? '+' : '-'}${Math.abs(Number(form.result)).toFixed(2)}
                  </p>
                )}
                <FieldError msg={errors.result} />
              </div>
            )}

            {/* Breakeven indicator */}
            {form.outcome === 'breakeven' && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
                <Minus className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-600 dark:text-amber-400">Result will be saved as $0.00</p>
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
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-border flex gap-3 flex-shrink-0">
            <Button onClick={handleSave} disabled={saving} className="rounded-xl flex-1">
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
