import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Search, Filter, TrendingUp, TrendingDown, Target,
  BarChart3, Star, Edit, Trash2, Copy, X, Check, Minus, Zap,
  ChevronRight, ChevronLeft, Upload, Eye,
  AlertCircle, Sparkles,
  Award, Activity, DollarSign, RefreshCw,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Trade {
  id: string; user_id: string; pair: string; side: string;
  trade_date: string; session: string; outcome: string;
  result: number; rr: number | null; entry_price: number | null;
  exit_price: number | null; setup: string | null; notes: string | null;
  mistakes: string[]; screenshot_url: string | null; playbook_id: string | null;
  discipline_score: number | null; execution_score: number | null;
  emotion: string | null; account_type: string; ai_review: Record<string, any>;
  is_starred: boolean; tags: string[]; created_at: string; updated_at: string;
}

interface FormData {
  pair: string; side: 'long' | 'short';
  trade_date: string; session: string;
  outcome: 'win' | 'loss' | 'breakeven';
  result: string; rr: string;
  entry_price: string; exit_price: string;
  setup: string; playbook_id: string;
  mistakes: string[]; notes: string;
  screenshot_url: string; account_type: string;
  emotion: string; discipline_score: number;
  execution_score: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const SESSIONS = ['London', 'New York', 'Asia', 'London/NY Overlap', 'Pre-Market'];
const EMOTIONS = ['focused', 'confident', 'anxious', 'tired', 'excited', 'calm', 'frustrated'];
const MISTAKES = [
  'Entered too early', 'Entered too late', 'Moved stop loss',
  'Over-leveraged', 'Revenge trade', 'Ignored setup rules',
  'Missed take profit', 'FOMO entry', 'News trade', 'No plan',
];
const COMMON_PAIRS = ['NAS100', 'US30', 'XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'SP500', 'GBPJPY', 'USDJPY'];
const ACCOUNT_TYPES = [
  { value: 'main', label: '💼 Main Account' },
  { value: 'funded', label: '🏆 Funded Challenge' },
  { value: 'prop_firm', label: '🏦 Prop Firm' },
  { value: 'demo', label: '🧪 Demo Account' },
  { value: 'live', label: '🔴 Live Account' },
];

const EMPTY_FORM: FormData = {
  pair: '', side: 'long', trade_date: new Date().toISOString().split('T')[0],
  session: '', outcome: 'win', result: '', rr: '', entry_price: '', exit_price: '',
  setup: '', playbook_id: '', mistakes: [], notes: '', screenshot_url: '',
  account_type: 'main', emotion: 'focused', discipline_score: 7, execution_score: 7,
};

const ease = [0.22, 1, 0.36, 1] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtMoney(v: number) {
  const sign = v >= 0 ? '+' : '';
  return `${sign}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = 'text-white', icon: Icon, i }: {
  label: string; value: string | number; sub?: string; color?: string;
  icon: React.ElementType; i: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: i * 0.06, ease }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 hover:border-white/[0.14] hover:bg-white/[0.04] transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-wider mb-2">{label}</p>
          <p className={`text-2xl font-black tracking-tight ${color}`}>{value}</p>
          {sub && <p className="text-[11px] text-white/20 mt-1.5">{sub}</p>}
        </div>
        <div className={`rounded-xl p-2.5 ${color.includes('emerald') ? 'bg-emerald-500/10' : color.includes('red') ? 'bg-red-500/10' : color.includes('blue') ? 'bg-blue-500/10' : 'bg-violet-500/10'}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </motion.div>
  );
}

// ── Add Trade Modal ───────────────────────────────────────────────────────────
function AddTradeModal({ onClose, onSaved, editTrade, playbooks }: {
  onClose: () => void; onSaved: () => void;
  editTrade?: Trade | null; playbooks: { id: string; title: string }[];
}) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(editTrade ? {
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
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof FormData, v: any) => setForm(f => ({ ...f, [k]: v }));

  const validate = (s: number) => {
    const e: Record<string, string> = {};
    if (s === 1 && !form.pair.trim()) e.pair = 'Pair is required';
    if (s === 1 && !form.trade_date) e.trade_date = 'Date is required';
    if (s === 2 && form.result === '') e.result = 'P&L is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => { if (validate(step)) setStep(s => s + 1); };

  const handleSave = async (another = false) => {
    if (!validate(step)) return;
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        pair: form.pair.trim().toUpperCase(),
        side: form.side,
        trade_date: form.trade_date,
        session: form.session || null,
        outcome: form.outcome,
        result: Number(form.result) || 0,
        rr: form.rr ? Number(form.rr) : null,
        entry_price: form.entry_price ? Number(form.entry_price) : null,
        exit_price: form.exit_price ? Number(form.exit_price) : null,
        setup: form.setup || null,
        playbook_id: form.playbook_id || null,
        mistakes: form.mistakes,
        notes: form.notes || null,
        screenshot_url: form.screenshot_url || null,
        account_type: form.account_type,
        emotion: form.emotion,
        discipline_score: form.discipline_score,
        execution_score: form.execution_score,
        updated_at: new Date().toISOString(),
      };
      if (editTrade) {
        const { error } = await supabase.from('trades').update(payload).eq('id', editTrade.id);
        if (error) throw error;
        toast({ title: '✅ Trade updated!' });
      } else {
        const { error } = await supabase.from('trades').insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
        toast({ title: '✅ Trade saved!' });
      }
      if (another && !editTrade) {
        setForm({ ...EMPTY_FORM, trade_date: form.trade_date, session: form.session, account_type: form.account_type });
        setStep(1); setErrors({});
        onSaved();
      } else {
        onSaved(); onClose();
      }
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div initial={{ opacity: 0, y: 40, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full sm:max-w-lg bg-[#0c0c16] border border-white/[0.09] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }}>

        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-white/[0.07] flex-shrink-0">
          <div className="flex-1">
            <p className="text-sm font-black text-white">{editTrade ? 'Edit Trade' : 'Log Trade'}</p>
            <p className="text-xs text-white/30 mt-0.5">Step {step} of 3 — {step === 1 ? 'Basic Info' : step === 2 ? 'Result' : 'Setup & Notes'}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-b border-white/[0.05] flex-shrink-0">
          {[1, 2, 3].map(s => (
            <React.Fragment key={s}>
              <button onClick={() => step > s && setStep(s)}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step === s ? 'bg-violet-600 text-white' :
                  step > s ? 'bg-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-emerald-500/30' :
                  'bg-white/[0.06] text-white/25'
                }`}>
                {step > s ? <Check className="h-3 w-3" /> : s}
              </button>
              {s < 3 && <div className={`flex-1 h-px ${step > s ? 'bg-emerald-500/30' : 'bg-white/[0.06]'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {step === 1 && (
            <AnimatePresence mode="wait">
              <motion.div key="s1" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Symbol / Pair *</label>
                  <input value={form.pair} onChange={e => set('pair', e.target.value.toUpperCase())}
                    placeholder="e.g. NAS100, XAUUSD, EURUSD"
                    className={`w-full text-sm bg-white/[0.04] border rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 transition-colors ${errors.pair ? 'border-red-500/40' : 'border-white/[0.09]'}`} />
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {COMMON_PAIRS.map(p => (
                      <button key={p} onClick={() => set('pair', p)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          form.pair === p ? 'bg-violet-500/15 border-violet-500/25 text-violet-400' : 'border-white/[0.07] text-white/25 hover:bg-white/[0.05]'
                        }`}>{p}</button>
                    ))}
                  </div>
                  {errors.pair && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.pair}</p>}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Direction</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => set('side', 'long')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-black transition-all ${
                        form.side === 'long' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-md' : 'border-white/[0.08] text-white/30 hover:border-white/[0.15]'
                      }`}>
                      <TrendingUp className="h-4 w-4" /> Long (Buy)
                    </button>
                    <button onClick={() => set('side', 'short')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-black transition-all ${
                        form.side === 'short' ? 'bg-red-500/15 border-red-500/30 text-red-400 shadow-md' : 'border-white/[0.08] text-white/30 hover:border-white/[0.15]'
                      }`}>
                      <TrendingDown className="h-4 w-4" /> Short (Sell)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Date *</label>
                    <input type="date" value={form.trade_date} onChange={e => set('trade_date', e.target.value)}
                      className={`w-full text-sm bg-white/[0.04] border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-violet-500/40 transition-colors ${errors.trade_date ? 'border-red-500/40' : 'border-white/[0.09]'}`} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Session</label>
                    <select value={form.session} onChange={e => set('session', e.target.value)}
                      className="w-full text-sm bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-white/70 focus:outline-none focus:border-violet-500/40 transition-colors cursor-pointer">
                      <option value="">Select...</option>
                      {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Account</label>
                  <div className="grid grid-cols-2 gap-2">
                    {ACCOUNT_TYPES.map(a => (
                      <button key={a.value} onClick={() => set('account_type', a.value)}
                        className={`py-2.5 px-3 rounded-xl border text-xs font-semibold text-left transition-all ${
                          form.account_type === a.value ? 'bg-violet-500/12 border-violet-500/25 text-violet-300' : 'border-white/[0.07] text-white/30 hover:bg-white/[0.04]'
                        }`}>{a.label}</button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {step === 2 && (
            <AnimatePresence mode="wait">
              <motion.div key="s2" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Result</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { v: 'win', label: '✅ Win', c: 'emerald' },
                      { v: 'loss', label: '❌ Loss', c: 'red' },
                      { v: 'breakeven', label: '➖ Breakeven', c: 'gray' },
                    ].map(o => (
                      <button key={o.v} onClick={() => set('outcome', o.v)}
                        className={`py-3 rounded-xl border text-sm font-black transition-all ${
                          form.outcome === o.v
                            ? o.c === 'emerald' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 shadow-md'
                              : o.c === 'red' ? 'bg-red-500/15 border-red-500/30 text-red-400 shadow-md'
                                : 'bg-white/10 border-white/20 text-white'
                            : 'border-white/[0.08] text-white/30 hover:border-white/[0.15]'
                        }`}>{o.label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">P&L ($) *</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 text-sm font-bold">$</span>
                    <input type="number" value={form.result} onChange={e => set('result', e.target.value)}
                      placeholder={form.outcome === 'loss' ? '-120.00' : '280.00'}
                      className={`w-full text-lg font-black bg-white/[0.04] border rounded-xl pl-8 pr-4 py-3 focus:outline-none focus:border-violet-500/40 transition-colors placeholder:text-white/15 ${
                        errors.result ? 'border-red-500/40' : 'border-white/[0.09]'
                      } ${form.result ? (Number(form.result) >= 0 ? 'text-emerald-400' : 'text-red-400') : 'text-white'}`} />
                  </div>
                  {errors.result && <p className="text-xs text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.result}</p>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">R:R</label>
                    <input type="number" value={form.rr} onChange={e => set('rr', e.target.value)}
                      placeholder="2.5"
                      className="w-full text-sm bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Entry</label>
                    <input type="number" value={form.entry_price} onChange={e => set('entry_price', e.target.value)}
                      placeholder="20420"
                      className="w-full text-sm bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Exit</label>
                    <input type="number" value={form.exit_price} onChange={e => set('exit_price', e.target.value)}
                      placeholder="20540"
                      className="w-full text-sm bg-white/[0.04] border border-white/[0.09] rounded-xl px-3 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Emotion during trade</label>
                  <div className="flex gap-2 flex-wrap">
                    {EMOTIONS.map(e => (
                      <button key={e} onClick={() => set('emotion', e)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold capitalize transition-all ${
                          form.emotion === e ? 'bg-violet-500/15 border-violet-500/25 text-violet-300' : 'border-white/[0.07] text-white/25 hover:bg-white/[0.04]'
                        }`}>{e}</button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Execution — {form.execution_score}/10</label>
                    <input type="range" min="1" max="10" value={form.execution_score} onChange={e => set('execution_score', Number(e.target.value))} className="w-full accent-violet-500" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Discipline — {form.discipline_score}/10</label>
                    <input type="range" min="1" max="10" value={form.discipline_score} onChange={e => set('discipline_score', Number(e.target.value))} className="w-full accent-pink-500" />
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          )}

          {step === 3 && (
            <AnimatePresence mode="wait">
              <motion.div key="s3" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Chart Screenshot</label>
                  {form.screenshot_url ? (
                    <div className="relative group rounded-2xl overflow-hidden border border-white/[0.09]">
                      <img src={form.screenshot_url} alt="Trade screenshot" className="w-full h-40 object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button type="button" onClick={() => set('screenshot_url', '')}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors">
                          <X className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                      <div className="absolute bottom-2 left-2 right-2 text-center">
                        <span className="text-[10px] text-white/50 bg-black/50 px-2 py-0.5 rounded-full">Screenshot uploaded ✓</span>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !user) return;
                          if (file.size > 10 * 1024 * 1024) {
                            toast({ title: 'Image too large', description: 'Max size is 10MB', variant: 'destructive' });
                            return;
                          }
                          const localUrl = URL.createObjectURL(file);
                          set('screenshot_url', localUrl);
                          const ext = file.name.split('.').pop() ?? 'jpg';
                          const path = `${user.id}/${Date.now()}.${ext}`;
                          const { error } = await supabase.storage
                            .from('trade-screenshots')
                            .upload(path, file, { upsert: true, contentType: file.type });
                          if (error) {
                            toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
                            set('screenshot_url', '');
                            return;
                          }
                          const { data: urlData } = supabase.storage.from('trade-screenshots').getPublicUrl(path);
                          if (urlData?.publicUrl) {
                            set('screenshot_url', urlData.publicUrl);
                            URL.revokeObjectURL(localUrl);
                          }
                        }}
                      />
                      <button type="button" onClick={() => fileRef.current?.click()}
                        className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-2xl border-2 border-dashed border-white/[0.10] bg-white/[0.02] hover:bg-white/[0.04] hover:border-violet-500/30 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center group-hover:bg-violet-500/10 group-hover:border-violet-500/20 transition-all">
                          <Upload className="h-5 w-5 text-white/25 group-hover:text-violet-400 transition-colors" />
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-semibold text-white/40 group-hover:text-white/60 transition-colors">Click to upload screenshot</p>
                          <p className="text-[10px] text-white/20 mt-0.5">PNG, JPG, WebP · max 10MB</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Setup Name</label>
                  <input value={form.setup} onChange={e => set('setup', e.target.value)}
                    placeholder="e.g. Pullback to 20 EMA, ORB..."
                    className="w-full text-sm bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
                </div>

                {playbooks.length > 0 && (
                  <div>
                    <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Link to Playbook</label>
                    <select value={form.playbook_id} onChange={e => set('playbook_id', e.target.value)}
                      className="w-full text-sm bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-white/70 focus:outline-none focus:border-violet-500/40 cursor-pointer">
                      <option value="">Not linked</option>
                      {playbooks.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Mistakes (if any)</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {MISTAKES.map(m => (
                      <button key={m} onClick={() => set('mistakes', form.mistakes.includes(m) ? form.mistakes.filter(x => x !== m) : [...form.mistakes, m])}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium text-left transition-all ${
                          form.mistakes.includes(m) ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'border-white/[0.07] text-white/30 hover:bg-white/[0.04]'
                        }`}>
                        <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${form.mistakes.includes(m) ? 'bg-red-500' : 'border border-white/20'}`}>
                          {form.mistakes.includes(m) && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
                        </div>
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Notes</label>
                  <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                    placeholder="What happened? Key observations, lessons learned..."
                    rows={3}
                    className="w-full text-sm bg-white/[0.04] border border-white/[0.09] rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none" />
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-white/[0.07] flex-shrink-0">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.08] text-white/40 text-sm font-bold hover:bg-white/[0.04] hover:text-white transition-all">
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
          )}
          {step < 3 ? (
            <button onClick={handleNext}
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-violet-500/20">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <>
              {!editTrade && (
                <button onClick={() => handleSave(true)} disabled={saving}
                  className="flex-1 py-2.5 rounded-xl border border-white/[0.10] text-white/60 text-sm font-bold hover:bg-white/[0.05] hover:text-white transition-all disabled:opacity-40">
                  Save & Add Another
                </button>
              )}
              <button onClick={() => handleSave(false)} disabled={saving}
                className={`flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50 ${editTrade ? 'flex-1' : 'px-5'}`}>
                {saving ? 'Saving...' : editTrade ? '✓ Update Trade' : '✓ Save Trade'}
              </button>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Trade Row ─────────────────────────────────────────────────────────────────
function TradeRow({ trade, onView, onEdit, onDuplicate, onDelete }: {
  trade: Trade; onView: (t: Trade) => void; onEdit: (t: Trade) => void;
  onDuplicate: (t: Trade) => void; onDelete: (t: Trade) => void;
}) {
  const isWin = (trade.result ?? 0) > 0;
  const isLoss = (trade.result ?? 0) < 0;

  return (
    <motion.tr initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
      className="group border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
      onClick={() => onView(trade)}>
      <td className="px-4 py-3 text-xs text-white/40 whitespace-nowrap">{fmtDate(trade.trade_date)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {trade.is_starred && <Star className="h-3 w-3 text-amber-400 fill-amber-400 flex-shrink-0" />}
          <span className="text-sm font-bold text-white">{trade.pair}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${
          trade.side === 'long'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>{trade.side === 'long' ? '↑ Long' : '↓ Short'}</span>
      </td>
      <td className="px-4 py-3 text-xs text-white/40">{trade.session || '—'}</td>
      <td className="px-4 py-3 text-xs text-white/50">{trade.setup || '—'}</td>
      <td className="px-4 py-3">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          trade.outcome === 'win' ? 'bg-emerald-500/10 text-emerald-400' :
          trade.outcome === 'loss' ? 'bg-red-500/10 text-red-400' :
          'bg-white/5 text-white/30'
        }`}>{trade.outcome || '—'}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`text-sm font-black font-mono ${isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-white/40'}`}>
          {fmtMoney(trade.result ?? 0)}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-white/40">{trade.rr ? `1:${Number(trade.rr).toFixed(1)}` : '—'}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(trade)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white transition-colors"><Edit className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDuplicate(trade)} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white transition-colors"><Copy className="h-3.5 w-3.5" /></button>
          <button onClick={() => onDelete(trade)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-white/30 hover:text-red-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </td>
    </motion.tr>
  );
}

// ── Premium Trade Drawer ──────────────────────────────────────────────────────
function TradeDrawer({ trade, onClose, onEdit, onDuplicate, onDelete, onAIReview, playbooks }: {
  trade: Trade;
  onClose: () => void;
  onEdit: (t: Trade) => void;
  onDuplicate: (t: Trade) => void;
  onDelete: (t: Trade) => void;
  onAIReview: (t: Trade) => Promise<void>;
  playbooks: { id: string; title: string; entry_rules?: string | null }[];
}) {
  const [tab, setTab] = useState<'notes' | 'mistakes' | 'ai' | 'playbook'>('notes');
  const [reviewing, setReviewing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isWin = (trade.result ?? 0) > 0;
  const isLoss = (trade.result ?? 0) < 0;
  const ai = (trade.ai_review as any) ?? {};

  const linkedPlaybook = playbooks.find(p => p.id === trade.playbook_id);

  const accent = isWin ? '#10b981' : isLoss ? '#ef4444' : '#6b7280';
  const accentBg = isWin
    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
    : isLoss
      ? 'bg-red-500/10 border-red-500/25 text-red-400'
      : 'bg-muted border-border text-muted-foreground dark:bg-white/5 dark:border-white/15 dark:text-white/40';

  const handleReview = async () => {
    setReviewing(true);
    await onAIReview(trade);
    setReviewing(false);
    setTab('ai');
  };

  const handleDelete = async () => {
    setDeleting(true);
    await onDelete(trade);
    onClose();
  };

  const TABS = [
    { id: 'notes', label: 'Notes' },
    { id: 'mistakes', label: 'Mistakes' },
    { id: 'ai', label: 'AI Review' },
    { id: 'playbook', label: 'Playbook' },
  ] as const;

  const QUICK_STATS = [
    {
      label: 'P&L',
      value: `${(trade.result ?? 0) >= 0 ? '+' : ''}$${Math.abs(trade.result ?? 0).toFixed(2)}`,
      color: isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-muted-foreground/70 dark:text-white/50',
      glow: isWin ? 'shadow-emerald-500/15' : isLoss ? 'shadow-red-500/15' : '',
      bg: isWin ? 'bg-emerald-500/8' : isLoss ? 'bg-red-500/8' : 'bg-slate-50 dark:bg-white/[0.02]',
      border: isWin ? 'border-emerald-500/20' : isLoss ? 'border-red-500/20' : 'border-border dark:border-white/[0.07]',
    },
    { label: 'R:R', value: trade.rr ? `1:${Number(trade.rr).toFixed(1)}` : '—', color: 'text-blue-400', glow: 'shadow-blue-500/10', bg: 'bg-blue-500/8', border: 'border-blue-500/20' },
    { label: 'Session', value: trade.session || '—', color: 'text-violet-400', glow: '', bg: 'bg-violet-500/8', border: 'border-violet-500/20' },
    { label: 'Setup', value: trade.setup || '—', color: 'text-amber-400', glow: '', bg: 'bg-amber-500/8', border: 'border-amber-500/20' },
    { label: 'Execution', value: trade.execution_score ? `${trade.execution_score}/10` : '—', color: 'text-cyan-400', glow: '', bg: 'bg-cyan-500/8', border: 'border-cyan-500/20' },
    { label: 'Emotion', value: trade.emotion || '—', color: 'text-pink-400', glow: '', bg: 'bg-pink-500/8', border: 'border-pink-500/20' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 bg-black/10 dark:bg-black/60 backdrop-blur-sm dark:backdrop-blur-md" />

      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="relative w-full sm:w-[400px] lg:w-[440px] h-full overflow-hidden flex flex-col bg-white dark:bg-gradient-to-br dark:from-[#0d0d1f] dark:to-[#0a0a18] border-l border-border dark:border-white/[0.08]"
        style={{
          boxShadow: `-24px 0 80px rgba(0,0,0,0.08)${isWin ? ', 0 0 40px rgba(16,185,129,0.04)' : isLoss ? ', 0 0 40px rgba(239,68,68,0.04)' : ''}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 inset-x-0 h-0.5 opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

        {/* HEADER */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-black ${accentBg}`}>
                {isWin ? <TrendingUp className="h-3.5 w-3.5" /> : isLoss ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
                {isWin ? 'WIN' : isLoss ? 'LOSS' : 'BREAKEVEN'}
              </div>
              <div className={`px-2.5 py-1 rounded-lg border text-[10px] font-black ${
                trade.side === 'long' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {trade.side === 'long' ? '↑ LONG' : '↓ SHORT'}
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => onEdit(trade)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-muted hover:text-foreground transition-all dark:border-white/[0.08] dark:text-white/40 dark:hover:bg-white/[0.06] dark:hover:text-white">
                <Edit className="h-3.5 w-3.5" /> Edit
              </button>
              <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors dark:hover:bg-white/[0.06] dark:text-white/30 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex items-baseline justify-between mt-3">
            <div>
              <h2 className="text-2xl font-black text-foreground dark:text-white tracking-tight">{trade.pair}</h2>
              <p className="text-xs text-muted-foreground/70 dark:text-white/30 mt-0.5">
                {new Date(trade.trade_date + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                {trade.session && ` · ${trade.session}`}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-black tracking-tight font-mono ${isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-muted-foreground/60 dark:text-white/40'}`}>
                {(trade.result ?? 0) >= 0 ? '+' : ''}${Math.abs(trade.result ?? 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-5 pt-4 pb-3">
            <div className="grid grid-cols-3 gap-2">
              {QUICK_STATS.map(stat => (
                <motion.div key={stat.label} whileHover={{ scale: 1.02, transition: { duration: 0.15 } }} className={`rounded-xl border ${stat.border} ${stat.bg} p-2.5 shadow-lg ${stat.glow}`}>
                  <p className="text-[9px] font-bold text-muted-foreground/70 dark:text-white/25 uppercase tracking-wider mb-1">{stat.label}</p>
                  <p className={`text-sm font-black truncate ${stat.color}`}>{stat.value}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {(trade.entry_price || trade.exit_price) && (
            <div className="px-5 pb-4">
              <div className="rounded-2xl border border-border dark:border-white/[0.07] overflow-hidden bg-slate-50 dark:bg-white/[0.02]">
                <div className="grid grid-cols-2 divide-x divide-border dark:divide-white/[0.06]">
                  <div className="px-4 py-3">
                    <p className="text-[9px] font-bold text-muted-foreground/70 dark:text-white/25 uppercase tracking-wider mb-1.5">Entry</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400" />
                      <p className="text-base font-black text-foreground dark:text-white font-mono">{trade.entry_price ? Number(trade.entry_price).toLocaleString() : '—'}</p>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <p className="text-[9px] font-bold text-muted-foreground/70 dark:text-white/25 uppercase tracking-wider mb-1.5">Exit</p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isWin ? 'bg-emerald-400' : 'bg-red-400'}`} />
                      <p className={`text-base font-black font-mono ${isWin ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-foreground dark:text-white'}`}>
                        {trade.exit_price ? Number(trade.exit_price).toLocaleString() : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {trade.entry_price && trade.exit_price && (
                  <div className="px-4 pb-3">
                    <div className="relative h-1.5 bg-muted dark:bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-y-0 left-0 rounded-full" style={{ background: `linear-gradient(90deg, rgba(99,102,241,0.5), ${accent})` }} />
                    </div>
                    <div className="flex justify-between mt-1.5">
                      <span className="text-[9px] text-muted-foreground/60 dark:text-white/20 font-mono">{Number(trade.entry_price).toLocaleString()}</span>
                      <span className={`text-[9px] font-mono font-bold ${isWin ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isWin ? '▲' : '▼'} {Math.abs(((Number(trade.exit_price) - Number(trade.entry_price)) / Number(trade.entry_price)) * 100).toFixed(2)}%
                      </span>
                      <span className="text-[9px] text-muted-foreground/60 dark:text-white/20 font-mono">{Number(trade.exit_price).toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="px-5 pb-4">
            {trade.screenshot_url ? (
              <div className="rounded-2xl overflow-hidden border border-border dark:border-white/[0.08] relative group cursor-pointer"
                onClick={() => window.open(trade.screenshot_url!, '_blank')}>
                <img
                  src={trade.screenshot_url}
                  alt="Trade screenshot"
                  className="w-full object-cover"
                  style={{ maxHeight: '220px', minHeight: '120px' }}
                  onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }}
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-sm border border-white/[0.15] text-white text-xs font-bold">
                    <Eye className="h-3.5 w-3.5" /> View Full Size
                  </div>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                  <p className="text-[10px] text-white/70 font-medium">Chart Screenshot · Click to expand</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border dark:border-white/[0.08] bg-muted/30 dark:bg-white/[0.01] p-6 flex flex-col items-center justify-center gap-3 text-center">
                <div className="w-10 h-10 rounded-xl bg-muted dark:bg-white/[0.03] border border-border dark:border-white/[0.07] flex items-center justify-center">
                  <Upload className="h-5 w-5 text-muted-foreground/60 dark:text-white/15" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground dark:text-white/25">No chart screenshot</p>
                  <p className="text-[10px] text-muted-foreground/60 dark:text-white/15 mt-0.5">Upload one while editing this trade</p>
                </div>
                <button
                  onClick={() => onEdit(trade)}
                  className="text-[10px] font-bold text-violet-500 dark:text-violet-400/70 hover:text-violet-600 dark:hover:text-violet-400 transition-colors border border-violet-500/20 px-3 py-1.5 rounded-lg hover:bg-violet-500/10"
                >
                  + Add Screenshot
                </button>
              </div>
            )}
          </div>


          {(trade.discipline_score || trade.execution_score) && (
            <div className="px-5 pb-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Discipline', value: trade.discipline_score, color: '#ec4899' },
                  { label: 'Execution', value: trade.execution_score, color: '#7c3aed' },
                ].map(score => {
                  const pct = ((score.value ?? 0) / 10) * 100;
                  const circ = 2 * Math.PI * 20;
                  return (
                    <div key={score.label} className="flex items-center gap-3 p-3 rounded-2xl border border-border dark:border-white/[0.07] bg-card dark:bg-white/[0.02]">
                      <div className="relative w-11 h-11 flex items-center justify-center flex-shrink-0">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 44 44">
                          <circle cx="22" cy="22" r="20" fill="none" stroke="hsl(var(--muted))" strokeWidth="3.5" />
                          <motion.circle cx="22" cy="22" r="20" fill="none" stroke={score.color} strokeWidth="3.5" strokeDasharray={circ} initial={{ strokeDashoffset: circ }} animate={{ strokeDashoffset: circ * (1 - pct / 100) }} transition={{ duration: 1, delay: 0.3, ease: [0.22, 1, 0.36, 1] }} strokeLinecap="round" />
                        </svg>
                        <span className="text-xs font-black text-foreground dark:text-white">{score.value ?? 0}</span>
                      </div>
                      <div>
                        <p className="text-[9px] text-muted-foreground/70 dark:text-white/25 uppercase tracking-wider">{score.label}</p>
                        <p className="text-sm font-bold text-foreground dark:text-white">{score.value ?? 0}/10</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TABS */}
          <div className="px-5 pb-2">
            <div className="flex gap-0.5 p-1 rounded-xl bg-muted border border-border">
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-all ${tab === t.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-muted-foreground hover:text-foreground hover:bg-background/60 dark:text-white/30 dark:hover:text-white dark:hover:bg-white/[0.04]'}`}>
                  {t.label}
                  {t.id === 'ai' && ai?.verdict && <span className="ml-1 w-1 h-1 rounded-full bg-emerald-400 inline-block" />}
                </button>
              ))}
            </div>
          </div>

          <div className="px-5 pb-24">
            <AnimatePresence mode="wait">
              {tab === 'notes' && (
                <motion.div key="notes" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="pt-3">
                  {trade.notes ? (
                    <div className="rounded-2xl border border-border dark:border-white/[0.07] bg-card dark:bg-white/[0.02] p-4">
                      <p className="text-sm text-foreground/75 dark:text-white/65 leading-relaxed whitespace-pre-wrap">{trade.notes}</p>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-12 h-12 rounded-2xl bg-muted dark:bg-white/[0.03] border border-border dark:border-white/[0.07] flex items-center justify-center mx-auto mb-3">
                        <Edit className="h-5 w-5 text-muted-foreground/60 dark:text-white/20" />
                      </div>
                      <p className="text-sm text-muted-foreground dark:text-white/20">No notes for this trade</p>
                      <button onClick={() => onEdit(trade)} className="mt-3 text-xs text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 transition-colors">Add notes →</button>
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'mistakes' && (
                <motion.div key="mistakes" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="pt-3 space-y-2">
                  {(trade.mistakes ?? []).length > 0 ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] text-muted-foreground dark:text-white/25 uppercase tracking-wider font-bold">
                          {(trade.mistakes ?? []).length} mistake{(trade.mistakes ?? []).length > 1 ? 's' : ''} identified
                        </p>
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span className="text-[9px] font-bold text-red-400">Needs review</span>
                        </div>
                      </div>
                      {(trade.mistakes ?? []).map((m, i) => (
                        <motion.div key={m} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex items-center gap-3 p-3.5 rounded-xl border border-red-500/15 bg-red-500/5">
                          <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
                          </div>
                          <p className="text-xs font-medium text-red-300/80">{m}</p>
                        </motion.div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                        <Check className="h-5 w-5 text-emerald-400" />
                      </div>
                      <p className="text-sm font-bold text-emerald-400">No mistakes logged</p>
                      <p className="text-xs text-muted-foreground dark:text-white/25 mt-1">Clean execution on this trade</p>
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'ai' && (
                <motion.div key="ai" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="pt-3">
                  {ai?.verdict ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border overflow-hidden" style={{
                        borderColor: ai.verdict === 'Good trade' ? 'rgba(16,185,129,0.2)' : ai.verdict === 'Poor trade' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                        background: ai.verdict === 'Good trade' ? 'rgba(16,185,129,0.05)' : ai.verdict === 'Poor trade' ? 'rgba(239,68,68,0.05)' : 'rgba(245,158,11,0.05)',
                      }}>
                        <div className="px-4 py-3 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: ai.verdict === 'Good trade' ? 'rgba(16,185,129,0.15)' : ai.verdict === 'Poor trade' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)' }}>
                            <Sparkles className="h-4 w-4" style={{ color: ai.verdict === 'Good trade' ? '#10b981' : ai.verdict === 'Poor trade' ? '#ef4444' : '#f59e0b' }} />
                          </div>
                          <div>
                            <p className="text-xs font-black text-white">AI Verdict</p>
                            <p className="text-sm font-black" style={{ color: ai.verdict === 'Good trade' ? '#10b981' : ai.verdict === 'Poor trade' ? '#ef4444' : '#f59e0b' }}>{ai.verdict}</p>
                          </div>
                          {ai.discipline_score != null && (
                            <div className="ml-auto text-center">
                              <p className="text-[9px] text-white/25 uppercase">Score</p>
                              <p className="text-xl font-black" style={{ color: ai.discipline_score >= 70 ? '#10b981' : ai.discipline_score >= 40 ? '#f59e0b' : '#ef4444' }}>{ai.discipline_score}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {ai.what_went_well && (
                        <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-4">
                          <p className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Check className="h-3 w-3" /> What went well</p>
                          <p className="text-xs text-emerald-300/80 leading-relaxed">{ai.what_went_well}</p>
                        </div>
                      )}
                      {ai.what_went_wrong && (
                        <div className="rounded-2xl border border-red-500/15 bg-red-500/5 p-4">
                          <p className="text-[9px] font-bold text-red-400/60 uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertCircle className="h-3 w-3" /> What went wrong</p>
                          <p className="text-xs text-red-300/70 leading-relaxed">{ai.what_went_wrong}</p>
                        </div>
                      )}
                      {ai.improvement && (
                        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                          <p className="text-[9px] font-bold text-violet-400/60 uppercase tracking-wider mb-2 flex items-center gap-1.5"><Sparkles className="h-3 w-3" /> AI Suggestion</p>
                          <p className="text-xs text-violet-300/80 leading-relaxed">{ai.improvement}</p>
                        </div>
                      )}

                      <button onClick={handleReview} disabled={reviewing} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.08] text-white/35 text-xs font-bold hover:bg-white/[0.04] hover:text-white transition-all disabled:opacity-40">
                        <RefreshCw className={`h-3.5 w-3.5 ${reviewing ? 'animate-spin' : ''}`} />
                        {reviewing ? 'Re-analyzing...' : 'Re-analyze'}
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="relative mb-4 mx-auto w-16 h-16">
                        <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                          <Sparkles className="h-7 w-7 text-violet-400" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-violet-600 border-2 border-[#0d0d1f] flex items-center justify-center">
                          <Zap className="h-2.5 w-2.5 text-white" />
                        </div>
                      </div>
                      <p className="text-sm font-bold text-white mb-1">AI Trade Review</p>
                      <p className="text-xs text-white/30 mb-5 max-w-[200px] mx-auto leading-relaxed">Get instant analysis of what worked, what didn't, and how to improve.</p>
                      <button onClick={handleReview} disabled={reviewing} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-500/20 mx-auto disabled:opacity-50">
                        <Sparkles className={`h-4 w-4 ${reviewing ? 'animate-spin' : ''}`} />
                        {reviewing ? 'Analyzing...' : 'Analyze This Trade'}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {tab === 'playbook' && (
                <motion.div key="playbook" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="pt-3">
                  {linkedPlaybook ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[9px] text-violet-400/60 uppercase tracking-wider font-bold mb-1.5">Linked Playbook</p>
                            <p className="text-base font-black text-white">{linkedPlaybook.title}</p>
                            {trade.setup && <p className="text-xs text-white/40 mt-0.5">{trade.setup}</p>}
                          </div>
                        </div>
                      </div>

                      {linkedPlaybook.entry_rules && (
                        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
                          <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider mb-2.5">Entry Rules</p>
                          <p className="text-xs text-white/55 leading-relaxed">{linkedPlaybook.entry_rules}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5">
                          <p className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-wider mb-2">Rules followed</p>
                          <p className="text-2xl font-black text-emerald-400">{Math.max(0, 5 - (trade.mistakes?.length ?? 0))}</p>
                        </div>
                        <div className="p-3 rounded-xl border border-red-500/15 bg-red-500/5">
                          <p className="text-[9px] font-bold text-red-400/60 uppercase tracking-wider mb-2">Rules broken</p>
                          <p className="text-2xl font-black text-red-400">{trade.mistakes?.length ?? 0}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-center mx-auto mb-3">
                        <Target className="h-5 w-5 text-white/20" />
                      </div>
                      <p className="text-sm text-white/20">No playbook linked</p>
                      <button onClick={() => onEdit(trade)} className="mt-3 text-xs text-violet-400 hover:text-violet-300 transition-colors">Link a playbook →</button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* FLOATING BOTTOM ACTIONS */}
        <div className="absolute bottom-0 inset-x-0 px-5 py-4" style={{ background: 'linear-gradient(to top, rgba(10,10,24,1) 60%, transparent)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex items-center gap-2">
            <button onClick={() => onDuplicate(trade)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-white/[0.08] text-white/40 text-xs font-bold hover:bg-white/[0.05] hover:text-white transition-all">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </button>
            <button onClick={handleReview} disabled={reviewing} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-600/20 border border-violet-500/25 text-violet-400 text-xs font-bold hover:bg-violet-600/30 transition-all disabled:opacity-40">
              <Sparkles className={`h-3.5 w-3.5 ${reviewing ? 'animate-spin' : ''}`} /> AI Review
            </button>
            <button onClick={handleDelete} disabled={deleting} className="p-2.5 rounded-xl border border-red-500/20 text-red-400/50 hover:bg-red-500/10 hover:text-red-400 transition-all disabled:opacity-40">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <BarChart3 className="h-9 w-9 text-violet-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-violet-600 border-2 border-[#080812] flex items-center justify-center">
          <Plus className="h-3 w-3 text-white" />
        </div>
      </div>
      <h3 className="text-xl font-black text-white mb-2">Log your first trade</h3>
      <p className="text-sm text-white/40 max-w-xs mb-8 leading-relaxed">
        Start building your trading history. Every trade logged is a step toward understanding your edge.
      </p>
      <motion.button onClick={onAdd} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        className="group flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500 text-white px-7 py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg shadow-violet-500/20">
        <Plus className="h-4 w-4" /> Add Your First Trade
        <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </motion.div>
  );
}

// ── Main TradeVault ────────────────────────────────────────────────────────────
export default function TradeVault() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [playbooks, setPlaybooks] = useState<{ id: string; title: string; entry_rules?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [viewTrade, setViewTrade] = useState<Trade | null>(null);
  const [search, setSearch] = useState('');
  const [filterOutcome, setFilterOutcome] = useState('all');
  const [filterSession, setFilterSession] = useState('all');
  const [filterPair, setFilterPair] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [tradesRes, playbooksRes] = await Promise.all([
      supabase.from('trades').select('*').eq('user_id', user.id).order('trade_date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('playbooks').select('id,title,entry_rules').eq('user_id', user.id),
    ]);
    setTrades(((tradesRes.data ?? []) as unknown as Trade[]));
    setPlaybooks((playbooksRes.data ?? []) as any);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (trade: Trade) => {
    await supabase.from('trades').delete().eq('id', trade.id);
    toast({ title: 'Trade deleted' });
    if (viewTrade?.id === trade.id) setViewTrade(null);
    load();
  };

  const handleDuplicate = async (trade: Trade) => {
    const { id, created_at, updated_at, ...rest } = trade;
    await supabase.from('trades').insert({
      ...rest,
      trade_date: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    toast({ title: 'Trade duplicated!' });
    load();
  };

  const handleAIReview = async (trade: Trade) => {
    try {
      const { data, error } = await supabase.functions.invoke('trade-review', { body: { trade } });
      if (error) throw error;
      const review = data;
      await supabase.from('trades').update({ ai_review: review, updated_at: new Date().toISOString() }).eq('id', trade.id);
      setTrades(prev => prev.map(t => t.id === trade.id ? { ...t, ai_review: review } : t));
      setViewTrade(prev => prev && prev.id === trade.id ? { ...prev, ai_review: review } : prev);
      toast({ title: '✅ AI review complete' });
    } catch {
      toast({ title: 'AI review failed', variant: 'destructive' });
    }
  };

  const stats = useMemo(() => {
    const wins = trades.filter(t => (t.result ?? 0) > 0);
    const losses = trades.filter(t => (t.result ?? 0) < 0);
    const total = trades.reduce((s, t) => s + (t.result ?? 0), 0);
    const rrs = trades.filter(t => t.rr);
    const best = trades.reduce((b, t) => (t.result ?? 0) > (b?.result ?? -Infinity) ? t : b, null as Trade | null);
    const worst = trades.reduce((b, t) => (t.result ?? 0) < (b?.result ?? Infinity) ? t : b, null as Trade | null);
    return {
      total, count: trades.length,
      winRate: trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0,
      avgRR: rrs.length > 0 ? rrs.reduce((s, t) => s + (t.rr ?? 0), 0) / rrs.length : null,
      best, worst, wins: wins.length, losses: losses.length,
    };
  }, [trades]);

  const uniquePairs = useMemo(() => [...new Set(trades.map(t => t.pair))].sort(), [trades]);

  const filtered = useMemo(() => trades.filter(t => {
    if (search && !t.pair.toLowerCase().includes(search.toLowerCase()) && !(t.setup ?? '').toLowerCase().includes(search.toLowerCase())) return false;
    if (filterOutcome !== 'all' && t.outcome !== filterOutcome) return false;
    if (filterSession !== 'all' && t.session !== filterSession) return false;
    if (filterPair !== 'all' && t.pair !== filterPair) return false;
    return true;
  }), [trades, search, filterOutcome, filterSession, filterPair]);

  const openAdd = () => { setEditTrade(null); setModalOpen(true); };
  const openEdit = (t: Trade) => { setEditTrade(t); setModalOpen(true); setViewTrade(null); };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Trade Vault</h2>
          <p className="text-sm text-white/30 mt-0.5">Log every trade. Build your edge.</p>
        </div>
        <motion.button onClick={openAdd} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-500/20 flex-shrink-0">
          <Plus className="h-4 w-4" /> Log Trade
        </motion.button>
      </div>

      {!loading && trades.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total P&L', value: fmtMoney(stats.total), sub: `From ${stats.count} trades`, color: stats.total >= 0 ? 'text-emerald-400' : 'text-red-400', icon: DollarSign, i: 0 },
            { label: 'Win Rate', value: `${stats.winRate}%`, sub: `${stats.wins} wins`, color: stats.winRate >= 50 ? 'text-emerald-400' : 'text-amber-400', icon: Target, i: 1 },
            { label: 'Avg R:R', value: stats.avgRR ? `1:${stats.avgRR.toFixed(1)}` : '—', sub: 'Risk to reward', color: 'text-blue-400', icon: Activity, i: 2 },
            { label: 'Best Trade', value: stats.best ? fmtMoney(stats.best.result) : '—', sub: stats.best?.pair || '', color: 'text-amber-400', icon: Award, i: 3 },
          ].map(s => <StatCard key={s.label} {...s} />)}
        </div>
      )}

      {trades.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search pair or setup..."
                className="w-full pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
            </div>
            <button onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                showFilters || filterOutcome !== 'all' || filterSession !== 'all' || filterPair !== 'all'
                  ? 'bg-violet-500/12 border-violet-500/25 text-violet-400'
                  : 'border-white/[0.08] text-white/40 hover:bg-white/[0.04] hover:text-white'
              }`}>
              <Filter className="h-4 w-4" />
              Filters
              {(filterOutcome !== 'all' || filterSession !== 'all' || filterPair !== 'all') && (
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex flex-wrap gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/25 uppercase tracking-wider">Result</span>
                    {['all', 'win', 'loss', 'breakeven'].map(v => (
                      <button key={v} onClick={() => setFilterOutcome(v)}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-bold capitalize transition-all ${
                          filterOutcome === v
                            ? v === 'win' ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
                              : v === 'loss' ? 'bg-red-500/15 border-red-500/25 text-red-400'
                                : 'bg-violet-500/15 border-violet-500/25 text-violet-400'
                            : 'border-white/[0.07] text-white/25 hover:bg-white/[0.04]'
                        }`}>{v}</button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/25 uppercase tracking-wider">Session</span>
                    <select value={filterSession} onChange={e => setFilterSession(e.target.value)}
                      className="text-xs text-white/60 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 focus:outline-none">
                      <option value="all">All</option>
                      {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {uniquePairs.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/25 uppercase tracking-wider">Pair</span>
                      <select value={filterPair} onChange={e => setFilterPair(e.target.value)}
                        className="text-xs text-white/60 bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 focus:outline-none">
                        <option value="all">All</option>
                        {uniquePairs.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  )}
                  <button onClick={() => { setFilterOutcome('all'); setFilterSession('all'); setFilterPair('all'); }}
                    className="text-xs text-white/25 hover:text-white/50 flex items-center gap-1 transition-colors ml-auto">
                    <X className="h-3 w-3" /> Clear
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map(i => <div key={i} className="h-14 bg-white/[0.02] rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 && trades.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16"><Search className="h-10 w-10 text-white/10 mx-auto mb-3" /><p className="text-sm text-white/20">No trades match your filters</p></div>
      ) : (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Date', 'Pair', 'Side', 'Session', 'Setup', 'Result', 'P&L', 'R:R', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-white/25 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(trade => (
                  <TradeRow key={trade.id} trade={trade}
                    onView={setViewTrade} onEdit={openEdit}
                    onDuplicate={handleDuplicate} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-xs text-white/20">{filtered.length} trade{filtered.length !== 1 ? 's' : ''}{filtered.length !== trades.length ? ` (${trades.length} total)` : ''}</span>
          </div>
        </div>
      )}

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

      <AnimatePresence>
        {viewTrade && (
          <TradeDrawer
            trade={viewTrade}
            onClose={() => setViewTrade(null)}
            onEdit={openEdit}
            onDuplicate={(t) => { handleDuplicate(t); setViewTrade(null); }}
            onDelete={handleDelete}
            onAIReview={handleAIReview}
            playbooks={playbooks}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
