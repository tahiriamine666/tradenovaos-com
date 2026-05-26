import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Search, Filter, ChevronDown, ChevronUp, X, Check,
  Sparkles, RefreshCw, AlertCircle, BarChart3, Brain,
  TrendingUp, Calendar, SlidersHorizontal, RotateCcw,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface JournalEntry {
  id: string; user_id: string; entry_date: string;
  mood: string; energy_level: number; confidence_level: number;
  confidence_score: number; rule_adherence: number; stress_score: number;
  stress_label: string; bias: string; what_went_well: string | null;
  mistakes: string | null; mistakes_list: string[];
  lesson: string | null; emotional_trigger: string | null;
  notes: string | null; summary: string | null;
  session: string | null; session_time: string | null;
  ai_review: Record<string, any>; created_at: string; updated_at: string;
}

interface FormData {
  entry_date: string; mood: string; energy_level: number;
  confidence_level: number; rule_adherence: number;
  stress_score: number; stress_label: string; bias: string;
  what_went_well: string; mistakes: string; mistakes_list: string[];
  lesson: string; emotional_trigger: string; notes: string;
  session: string; session_time: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MOODS = [
  { value: 'focused',     emoji: '🎯', label: 'Focused',     positive: true  },
  { value: 'calm',        emoji: '🧘', label: 'Calm',        positive: true  },
  { value: 'confident',   emoji: '💪', label: 'Confident',   positive: true  },
  { value: 'patient',     emoji: '⏳', label: 'Patient',     positive: true  },
  { value: 'neutral',     emoji: '😐', label: 'Neutral',     positive: null  },
  { value: 'anxious',     emoji: '😰', label: 'Anxious',     positive: false },
  { value: 'frustrated',  emoji: '😤', label: 'Frustrated',  positive: false },
  { value: 'tired',       emoji: '😴', label: 'Tired',       positive: false },
  { value: 'excited',     emoji: '🔥', label: 'Excited',     positive: null  },
  { value: 'distracted',  emoji: '🌀', label: 'Distracted',  positive: false },
  { value: 'disciplined', emoji: '🏆', label: 'Disciplined', positive: true  },
  { value: 'fearful',     emoji: '😨', label: 'Fearful',     positive: false },
];

const COMMON_MISTAKES = [
  'FOMO Entry', 'Early Entry', 'Overtrading', 'No Stop Loss',
  'Revenge Trading', 'Moved Stop Loss', 'Ignored Rules',
  'Sized Too Big', 'No Plan', 'Chased Price',
];

const SESSIONS = ['London', 'New York', 'Asia', 'London/NY Overlap', 'Pre-Market'];
const BIAS_OPTIONS = ['Bullish', 'Bearish', 'Neutral', 'Ranging'];
const STRESS_LABELS = ['Low', 'Medium', 'High'];

const EMPTY_FORM: FormData = {
  entry_date: new Date().toISOString().split('T')[0],
  mood: 'focused', energy_level: 7, confidence_level: 7,
  rule_adherence: 80, stress_score: 3, stress_label: 'Low',
  bias: 'Neutral', what_went_well: '', mistakes: '',
  mistakes_list: [], lesson: '', emotional_trigger: '',
  notes: '', session: '', session_time: '',
};

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

function moodColor(mood: string) {
  const m = MOODS.find(x => x.value === mood);
  if (!m) return 'text-muted-foreground bg-muted border-border';
  if (m.positive === true)  return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20';
  if (m.positive === false) return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20';
  return 'text-foreground/70 bg-muted border-border';
}

function stressColor(label: string) {
  if (label === 'Low')    return 'text-emerald-600 dark:text-emerald-400';
  if (label === 'High')   return 'text-red-600 dark:text-red-400';
  return 'text-foreground/60';
}

function adherenceColor(v: number) {
  if (v >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (v >= 50) return 'text-foreground/70';
  return 'text-red-600 dark:text-red-400';
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color = '', i }: {
  label: string; value: string; sub?: string;
  icon: React.ElementType; color?: string; i: number;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: i * 0.05, ease }}
      className="rounded-2xl border border-border bg-card px-4 py-3.5 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
        <Icon className={`h-4 w-4 ${color || 'text-muted-foreground/50'}`}/>
      </div>
      <p className={`text-xl font-black tracking-tight ${color || 'text-foreground'}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground/60 mt-1">{sub}</p>}
    </motion.div>
  );
}

// ── New Entry Modal ───────────────────────────────────────────────────────────
function NewEntryModal({ onClose, onSaved, editEntry }: {
  onClose: () => void; onSaved: () => void; editEntry?: JournalEntry | null;
}) {
  const { user } = useAuth();
  const [form,   setForm]   = useState<FormData>(editEntry ? {
    entry_date:        editEntry.entry_date,
    mood:              editEntry.mood ?? 'focused',
    energy_level:      editEntry.energy_level ?? 7,
    confidence_level:  editEntry.confidence_level ?? 7,
    rule_adherence:    Number(editEntry.rule_adherence) ?? 80,
    stress_score:      editEntry.stress_score ?? 3,
    stress_label:      editEntry.stress_label ?? 'Low',
    bias:              editEntry.bias ?? 'Neutral',
    what_went_well:    editEntry.what_went_well ?? '',
    mistakes:          editEntry.mistakes ?? '',
    mistakes_list:     editEntry.mistakes_list ?? [],
    lesson:            editEntry.lesson ?? '',
    emotional_trigger: editEntry.emotional_trigger ?? '',
    notes:             editEntry.notes ?? '',
    session:           editEntry.session ?? '',
    session_time:      editEntry.session_time ?? '',
  } : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof FormData, v: any) => setForm(f => ({ ...f, [k]: v }));

  const toggleMistake = (m: string) =>
    set('mistakes_list', form.mistakes_list.includes(m)
      ? form.mistakes_list.filter(x => x !== m)
      : [...form.mistakes_list, m]);

  const handleSave = async () => {
    if (!user || !form.entry_date) return;
    setSaving(true);
    try {
      const payload = {
        user_id:           user.id,
        entry_date:        form.entry_date,
        mood:              form.mood,
        energy_level:      form.energy_level,
        confidence_level:  form.confidence_level,
        confidence_score:  form.confidence_level,
        rule_adherence:    form.rule_adherence,
        stress_score:      form.stress_score,
        stress_label:      STRESS_LABELS[Math.floor((form.stress_score - 1) / 3.4)] ?? 'Low',
        bias:              form.bias,
        what_went_well:    form.what_went_well || null,
        mistakes:          form.mistakes || null,
        mistakes_list:     form.mistakes_list,
        lesson:            form.lesson || null,
        emotional_trigger: form.emotional_trigger || null,
        notes:             form.notes || null,
        session:           form.session || null,
        session_time:      form.session_time || null,
        updated_at:        new Date().toISOString(),
      };
      if (editEntry) {
        const { error } = await supabase.from('journal_entries').update(payload).eq('id', editEntry.id);
        if (error) throw error;
        toast({ title: '✅ Entry updated' });
      } else {
        const { error } = await supabase.from('journal_entries').insert({ ...payload, created_at: new Date().toISOString() });
        if (error) throw error;
        toast({ title: '✅ Journal entry saved' });
      }
      onSaved(); onClose();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const moodObj = MOODS.find(m => m.value === form.mood);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 dark:bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 32 }} transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="relative w-full sm:max-w-xl bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div>
            <p className="text-sm font-black text-foreground">{editEntry ? 'Edit Entry' : 'New Journal Entry'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Log your psychology for this session</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4"/>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Date + Session */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Date</label>
              <input type="date" value={form.entry_date} onChange={e => set('entry_date', e.target.value)}
                className="w-full text-sm bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-violet-500/50"/>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Session</label>
              <select value={form.session} onChange={e => set('session', e.target.value)}
                className="w-full text-sm bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-violet-500/50 cursor-pointer">
                <option value="">Select...</option>
                {SESSIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Mood</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {MOODS.map(m => (
                <button key={m.value} onClick={() => set('mood', m.value)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-bold transition-all ${
                    form.mood === m.value
                      ? m.positive === true  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 shadow-sm'
                      : m.positive === false ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400 shadow-sm'
                      : 'bg-muted border-border text-foreground shadow-sm'
                      : 'border-border text-muted-foreground hover:bg-muted/60 hover:border-border/80'
                  }`}>
                  <span className="text-base">{m.emoji}</span>
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: `Energy Level — ${form.energy_level}/10`,    key: 'energy_level',     min: 1, max: 10, val: form.energy_level },
              { label: `Confidence — ${form.confidence_level}/10`,  key: 'confidence_level', min: 1, max: 10, val: form.confidence_level },
              { label: `Rule Adherence — ${form.rule_adherence}%`,  key: 'rule_adherence',   min: 0, max: 100,val: form.rule_adherence },
              { label: `Stress Level — ${STRESS_LABELS[Math.floor((form.stress_score-1)/3.4)]??'Low'}`, key:'stress_score', min:1, max:10, val:form.stress_score },
            ].map(s => (
              <div key={s.key}>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">{s.label}</label>
                <input type="range" min={s.min} max={s.max} value={s.val}
                  onChange={e => set(s.key as keyof FormData, Number(e.target.value))}
                  className="w-full accent-violet-600"/>
              </div>
            ))}
          </div>

          {/* Bias */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Market Bias</label>
            <div className="flex gap-2">
              {BIAS_OPTIONS.map(b => (
                <button key={b} onClick={() => set('bias', b)}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    form.bias === b
                      ? b === 'Bullish'  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                      : b === 'Bearish'  ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400'
                      : 'bg-muted border-border text-foreground'
                      : 'border-border text-muted-foreground hover:bg-muted/60'
                  }`}>{b}</button>
              ))}
            </div>
          </div>

          {/* What went well */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">What Went Well</label>
            <textarea value={form.what_went_well} onChange={e => set('what_went_well', e.target.value)}
              placeholder="Describe your wins and positive execution..."
              rows={2} className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-emerald-500/40 resize-none"/>
          </div>

          {/* Mistakes */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Mistakes Made</label>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
              {COMMON_MISTAKES.map(m => (
                <button key={m} onClick={() => toggleMistake(m)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium text-left transition-all ${
                    form.mistakes_list.includes(m)
                      ? 'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/20 text-red-700 dark:text-red-400'
                      : 'border-border text-muted-foreground hover:bg-muted/60'
                  }`}>
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${form.mistakes_list.includes(m) ? 'bg-red-500' : 'border border-border'}`}>
                    {form.mistakes_list.includes(m) && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3}/>}
                  </div>
                  {m}
                </button>
              ))}
            </div>
            <textarea value={form.mistakes} onChange={e => set('mistakes', e.target.value)}
              placeholder="Describe any other mistakes or issues..."
              rows={2} className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-red-500/30 resize-none"/>
          </div>

          {/* Lesson + Trigger */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Lesson Learned</label>
              <textarea value={form.lesson} onChange={e => set('lesson', e.target.value)}
                placeholder="Key takeaway from today..."
                rows={3} className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40 resize-none"/>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Emotional Trigger</label>
              <textarea value={form.emotional_trigger} onChange={e => set('emotional_trigger', e.target.value)}
                placeholder="What caused emotional reactions today?"
                rows={3} className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40 resize-none"/>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Additional Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Any other observations..."
              rows={2} className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40 resize-none"/>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50">
            {saving ? 'Saving...' : editEntry ? '✓ Update Entry' : '✓ Save Entry'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────
function EntryCard({ entry, onEdit, onDelete, onAIReview, reviewing }: {
  entry: JournalEntry; onEdit: (e: JournalEntry) => void;
  onDelete: (e: JournalEntry) => void;
  onAIReview: (e: JournalEntry) => void; reviewing: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const mood = MOODS.find(m => m.value === entry.mood);
  const ai   = entry.ai_review as any ?? {};
  const adherence = Number(entry.rule_adherence ?? 0);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden hover:border-border/80 transition-all">

      {/* Main row */}
      <div className="flex items-start gap-4 px-5 py-4">
        {/* Date dot */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
          <div className={`w-2 h-2 rounded-full ${mood?.positive === true ? 'bg-emerald-500' : mood?.positive === false ? 'bg-red-500' : 'bg-muted-foreground/40'}`}/>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <p className="text-sm font-black text-foreground">
                  {new Date(entry.entry_date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </p>
                {entry.session && <span className="text-[10px] text-muted-foreground/60">{entry.session}</span>}
                {entry.session_time && <span className="text-[10px] text-muted-foreground/40">{entry.session_time}</span>}
              </div>
              {/* Mood badge */}
              {mood && (
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${moodColor(entry.mood)}`}>
                  <span>{mood.emoji}</span> {mood.label}
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Confidence</p>
                <p className="text-sm font-black text-foreground">{entry.confidence_level ?? entry.confidence_score ?? '—'}/10</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Rule Adherence</p>
                <p className={`text-sm font-black ${adherenceColor(adherence)}`}>{adherence}%</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-0.5">Stress</p>
                <p className={`text-sm font-black ${stressColor(entry.stress_label ?? '')}`}>{entry.stress_label || '—'}</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                <button onClick={() => onEdit(entry)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  <SlidersHorizontal className="h-3.5 w-3.5"/>
                </button>
                <button onClick={() => onDelete(entry)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                  <X className="h-3.5 w-3.5"/>
                </button>
                <button onClick={() => setExpanded(v => !v)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                  {expanded ? <ChevronUp className="h-3.5 w-3.5"/> : <ChevronDown className="h-3.5 w-3.5"/>}
                </button>
              </div>
            </div>
          </div>

          {/* Summary */}
          {(entry.what_went_well || entry.lesson || (entry.mistakes_list?.length ?? 0) > 0) && (
            <div className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {entry.what_went_well || entry.lesson || entry.mistakes_list?.join(', ')}
            </div>
          )}

          {/* Mistakes pills */}
          {(entry.mistakes_list?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(entry.mistakes_list ?? []).slice(0, 3).map(m => (
                <span key={m} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400">{m}</span>
              ))}
              {(entry.mistakes_list?.length ?? 0) > 3 && (
                <span className="text-[10px] text-muted-foreground">+{(entry.mistakes_list?.length ?? 0) - 3} more</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded section */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease }}
            className="overflow-hidden border-t border-border">
            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {entry.what_went_well && (
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/15 bg-emerald-50 dark:bg-emerald-500/5 p-3.5">
                    <p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400/60 uppercase tracking-wider mb-2 flex items-center gap-1"><Check className="h-3 w-3"/>What went well</p>
                    <p className="text-xs text-foreground/70 leading-relaxed">{entry.what_went_well}</p>
                  </div>
                )}
                {entry.mistakes && (
                  <div className="rounded-xl border border-red-200 dark:border-red-500/15 bg-red-50 dark:bg-red-500/5 p-3.5">
                    <p className="text-[9px] font-bold text-red-600 dark:text-red-400/60 uppercase tracking-wider mb-2 flex items-center gap-1"><AlertCircle className="h-3 w-3"/>Mistakes</p>
                    <p className="text-xs text-foreground/70 leading-relaxed">{entry.mistakes}</p>
                  </div>
                )}
                {entry.lesson && (
                  <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1"><Brain className="h-3 w-3"/>Lesson</p>
                    <p className="text-xs text-foreground/70 leading-relaxed">{entry.lesson}</p>
                  </div>
                )}
                {entry.emotional_trigger && (
                  <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Emotional Trigger</p>
                    <p className="text-xs text-foreground/70 leading-relaxed">{entry.emotional_trigger}</p>
                  </div>
                )}
              </div>

              {/* AI Review inline */}
              <div className="rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/5">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-violet-200 dark:border-violet-500/10">
                  <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400/70 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3"/> AI Review
                  </p>
                  <button onClick={() => onAIReview(entry)} disabled={reviewing === entry.id}
                    className="flex items-center gap-1 text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:opacity-80 transition-opacity disabled:opacity-40">
                    <RefreshCw className={`h-3 w-3 ${reviewing === entry.id ? 'animate-spin' : ''}`}/>
                    {reviewing === entry.id ? 'Analyzing...' : ai?.verdict ? 'Re-analyze' : 'Analyze'}
                  </button>
                </div>
                <div className="px-4 py-3">
                  {ai?.verdict ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${ai.verdict === 'Good session' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400' : ai.verdict === 'Poor session' ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400' : 'bg-muted border-border text-muted-foreground'}`}>
                          {ai.verdict}
                        </span>
                        {ai.discipline_score != null && (
                          <span className="text-xs text-muted-foreground">Discipline: <span className={`font-black ${ai.discipline_score >= 70 ? 'text-emerald-600 dark:text-emerald-400' : ai.discipline_score >= 40 ? 'text-muted-foreground' : 'text-red-600 dark:text-red-400'}`}>{ai.discipline_score}/100</span></span>
                        )}
                      </div>
                      {ai.pattern && <p className="text-xs text-muted-foreground leading-relaxed">{ai.pattern}</p>}
                      {ai.suggestion && <p className="text-xs text-violet-600 dark:text-violet-400/80 leading-relaxed flex items-start gap-1.5"><Sparkles className="h-3 w-3 flex-shrink-0 mt-0.5"/>{ai.suggestion}</p>}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/50">Click "Analyze" for AI psychology review</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main MindJournal ──────────────────────────────────────────────────────────
export default function MindJournal() {
  const { user } = useAuth();
  const [entries,    setEntries]    = useState<JournalEntry[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editEntry,  setEditEntry]  = useState<JournalEntry | null>(null);
  const [reviewing,  setReviewing]  = useState<string | null>(null);
  const [aiLoading,  setAiLoading]  = useState(false);

  // Filters
  const [search,     setSearch]     = useState('');
  const [filterMood, setFilterMood] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [activeTab,  setActiveTab]  = useState<'all'|'mistakes'|'lessons'|'emotions'>('all');
  const [showFilters,setShowFilters]= useState(false);

  // AI sidebar
  const [sideTab,    setSideTab]    = useState<'review'|'trends'|'mistakes'>('review');
  const [globalAI,   setGlobalAI]   = useState<Record<string,any>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from('journal_entries').select('*').eq('user_id', user.id).order('entry_date', { ascending: false });
    setEntries((data as JournalEntry[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (entry: JournalEntry) => {
    await supabase.from('journal_entries').delete().eq('id', entry.id);
    toast({ title: 'Entry deleted' }); load();
  };

  const handleAIReview = async (entry: JournalEntry) => {
    setReviewing(entry.id);
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400,
          messages: [{ role: 'user', content:
            `Review this trading journal entry. Respond ONLY with JSON (no markdown):
{"verdict":"Good session"|"Average session"|"Poor session","discipline_score":0-100,"pattern":string,"suggestion":string}
Entry: Mood:${entry.mood} Confidence:${entry.confidence_level}/10 Rules:${entry.rule_adherence}% Stress:${entry.stress_label} Bias:${entry.bias} WentWell:${entry.what_went_well||'N/A'} Mistakes:[${(entry.mistakes_list??[]).join(',')}] Lesson:${entry.lesson||'N/A'} Trigger:${entry.emotional_trigger||'N/A'}`
          }]
        }),
      });
      const data = await res.json();
      const review = JSON.parse((data.content?.[0]?.text ?? '{}').replace(/```json|```/g, '').trim());
      await supabase.from('journal_entries').update({ ai_review: review, updated_at: new Date().toISOString() }).eq('id', entry.id);
      setEntries(p => p.map(e => e.id === entry.id ? { ...e, ai_review: review } : e));
      toast({ title: '✅ AI review complete' });
    } catch { toast({ title: 'AI review failed', variant: 'destructive' }); }
    finally { setReviewing(null); }
  };

  const handleGlobalAI = async () => {
    if (entries.length === 0) return;
    setAiLoading(true);
    try {
      const summary = entries.slice(0, 20).map(e => `${e.entry_date}: mood=${e.mood} conf=${e.confidence_level} rules=${e.rule_adherence}% mistakes=[${(e.mistakes_list??[]).join(',')}]`).join('\n');
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 500,
          messages: [{ role: 'user', content:
            `Analyze this trader's journal history. Respond ONLY with JSON (no markdown):
{"discipline_score":0-100,"summary":string,"top_pattern":string,"top_mistake":string,"top_strength":string,"suggestions":["string","string"]}
Journal entries:\n${summary}`
          }]
        }),
      });
      const data = await res.json();
      const review = JSON.parse((data.content?.[0]?.text ?? '{}').replace(/```json|```/g, '').trim());
      setGlobalAI(review);
      toast({ title: '✅ Psychology review complete' });
    } catch { toast({ title: 'AI review failed', variant: 'destructive' }); }
    finally { setAiLoading(false); }
  };

  // Stats
  const stats = useMemo(() => {
    if (!entries.length) return null;
    const avgConf = Math.round(entries.reduce((s, e) => s + (e.confidence_level ?? 0), 0) / entries.length * 10) / 10;
    const avgRule = Math.round(entries.reduce((s, e) => s + Number(e.rule_adherence ?? 0), 0) / entries.length);
    const moodCounts: Record<string, number> = {};
    entries.forEach(e => { moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + 1; });
    const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
    const allMistakes: string[] = entries.flatMap(e => e.mistakes_list ?? []);
    const mistakeCounts: Record<string, number> = {};
    allMistakes.forEach(m => { mistakeCounts[m] = (mistakeCounts[m] ?? 0) + 1; });
    const topMistake = Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1])[0];
    const bestMood = MOODS.filter(m => m.positive === true).map(m => m.value);
    const bestEntries = entries.filter(e => bestMood.includes(e.mood));
    const bestMoodEntry = bestEntries.length > 0
      ? MOODS.find(m => m.value === bestEntries.reduce((b, e) => (e.confidence_level ?? 0) > (b.confidence_level ?? 0) ? e : b).mood)
      : null;
    return { count: entries.length, avgConf, avgRule, topMood, topMistake, bestMood: bestMoodEntry };
  }, [entries]);

  // Chart data
  const chartData = useMemo(() => entries.slice(0, 14).reverse().map(e => ({
    date: new Date(e.entry_date + 'T12:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    confidence: e.confidence_level ?? 0,
    rules: Number(e.rule_adherence ?? 0) / 10,
  })), [entries]);

  // Top mistakes
  const topMistakes = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.flatMap(e => e.mistakes_list ?? []).forEach(m => { counts[m] = (counts[m] ?? 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [entries]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter(e => {
      if (q) {
        const haystack = [
          e.mood ?? '',
          e.notes ?? '',
          e.mistakes ?? '',
          e.lesson ?? '',
          e.bias ?? '',
          (e as any).emotional_trigger ?? '',
          (e as any).what_went_well ?? '',
          (e as any).summary ?? '',
          ...((e.mistakes_list as string[] | null) ?? []),
        ].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filterMood && e.mood !== filterMood) return false;
      if (filterDate && e.entry_date < filterDate) return false;

      if (activeTab === 'mistakes') {
        const hasMistakes = ((e.mistakes_list as string[] | null)?.length ?? 0) > 0
          || (e.mistakes != null && e.mistakes.trim() !== '');
        if (!hasMistakes) return false;
      }
      if (activeTab === 'lessons') {
        if (!(e.lesson != null && e.lesson.trim() !== '')) return false;
      }
      if (activeTab === 'emotions') {
        const trig = (e as any).emotional_trigger as string | null | undefined;
        const hasEmotion = (trig != null && trig.trim() !== '') || (e.mood != null && e.mood !== '');
        if (!hasEmotion) return false;
      }
      return true;
    });
  }, [entries, search, filterMood, filterDate, activeTab]);

  const tabCounts = useMemo(() => ({
    mistakes: entries.filter(e => ((e.mistakes_list as string[] | null)?.length ?? 0) > 0 || (e.mistakes?.trim() ?? '') !== '').length,
    lessons:  entries.filter(e => (e.lesson?.trim() ?? '') !== '').length,
    emotions: entries.filter(e => (((e as any).emotional_trigger as string | null | undefined)?.trim() ?? '') !== '' || (e.mood != null && e.mood !== '')).length,
  }), [entries]);

  const openEdit = (e: JournalEntry) => { setEditEntry(e); setModalOpen(true); };
  const topMoodObj = MOODS.find(m => m.value === stats?.topMood);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-foreground">Mind Journal</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track emotions, mistakes, and lessons every session.</p>
        </div>
        <motion.button onClick={() => { setEditEntry(null); setModalOpen(true); }}
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/20 transition-all flex-shrink-0">
          <Plus className="h-4 w-4"/> New Entry
        </motion.button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total Entries"    value={`${stats.count}`}                        icon={Calendar}   i={0}/>
          <StatCard label="Avg Confidence"   value={`${stats.avgConf}/10`}                   icon={TrendingUp}  color={stats.avgConf >= 7 ? 'text-emerald-500 dark:text-emerald-400' : ''} i={1}/>
          <StatCard label="Avg Rule Adherence" value={`${stats.avgRule}%`}                   icon={Check}       color={stats.avgRule >= 80 ? 'text-emerald-500 dark:text-emerald-400' : stats.avgRule < 50 ? 'text-red-500 dark:text-red-400' : ''} i={2}/>
          <StatCard label="Most Common Mood" value={topMoodObj ? `${topMoodObj.emoji} ${topMoodObj.label}` : '—'} icon={Brain}    color={topMoodObj?.positive === true ? 'text-emerald-500 dark:text-emerald-400' : topMoodObj?.positive === false ? 'text-red-500 dark:text-red-400' : ''} i={3}/>
          <StatCard label="Biggest Mistake"  value={stats.topMistake?.[0] ?? '—'}            icon={AlertCircle} color={stats.topMistake ? 'text-red-500 dark:text-red-400' : ''} sub={stats.topMistake ? `${stats.topMistake[1]} times` : ''} i={4}/>
          <StatCard label="Best Mental State" value={stats.bestMood ? `${stats.bestMood.emoji} ${stats.bestMood.label}` : '—'} icon={TrendingUp} color="text-emerald-500 dark:text-emerald-400" i={5}/>
        </div>
      )}

      {/* Main layout: timeline + sidebar */}
      <div className="flex gap-5 items-start">

        {/* Left: timeline */}
        <div className="flex-1 min-w-0 space-y-4">

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none"/>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search journal..."
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40"/>
            </div>
            <select value={filterMood} onChange={e => setFilterMood(e.target.value)}
              className="text-xs text-muted-foreground bg-background border border-border rounded-xl px-3 py-2 focus:outline-none cursor-pointer">
              <option value="">All Moods</option>
              {MOODS.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
            </select>
            {(search || filterMood || filterDate) && (
              <button onClick={() => { setSearch(''); setFilterMood(''); setFilterDate(''); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground text-xs font-semibold hover:bg-muted transition-colors">
                <RotateCcw className="h-3.5 w-3.5"/> Reset
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border">
            {['All Entries', 'Mistakes', 'Lessons', 'Emotions'].map(t => (
              <button key={t} className="flex-1 py-2 rounded-lg text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-background transition-all first:text-foreground first:bg-background">
                {t}
              </button>
            ))}
          </div>

          {/* Entry list */}
          {loading ? (
            <div className="space-y-3">{[1,2,3].map(i=><div key={i} className="h-24 bg-muted/30 rounded-2xl animate-pulse"/>)}</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-4">
                <Brain className="h-7 w-7 text-muted-foreground/30"/>
              </div>
              <p className="text-base font-black text-foreground mb-2">No journal entries yet</p>
              <p className="text-sm text-muted-foreground mb-6 max-w-xs">Log your first session to start tracking your trading psychology.</p>
              <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-500/20">
                <Plus className="h-4 w-4"/> Log First Entry
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(entry => (
                <EntryCard key={entry.id} entry={entry} onEdit={openEdit}
                  onDelete={handleDelete} onAIReview={handleAIReview} reviewing={reviewing}/>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar: AI + analytics */}
        {entries.length > 0 && (
          <div className="w-72 flex-shrink-0 space-y-4 hidden lg:block">

            {/* AI Psychology Review */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
                <div>
                  <p className="text-xs font-black text-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-violet-500"/> AI Psychology Review
                  </p>
                  <span className="text-[9px] font-bold bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-500/20 ml-5">Beta</span>
                </div>
                <button onClick={handleGlobalAI} disabled={aiLoading}
                  className="flex items-center gap-1 text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:opacity-70 transition-opacity disabled:opacity-40">
                  <RefreshCw className={`h-3 w-3 ${aiLoading ? 'animate-spin' : ''}`}/>
                  {aiLoading ? 'Analyzing...' : globalAI?.summary ? 'Refresh' : 'Analyze'}
                </button>
              </div>

              {globalAI?.discipline_score != null ? (
                <div className="p-4 space-y-4">
                  {/* Score circle */}
                  <div className="flex items-center gap-4">
                    <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
                      {(() => {
                        const r = 28; const circ = 2*Math.PI*r; const pct = (globalAI.discipline_score??0)/100;
                        const color = pct >= 0.7 ? '#10b981' : pct >= 0.4 ? '#7c3aed' : '#ef4444';
                        return (
                          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
                            <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/40"/>
                            <motion.circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="4"
                              strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
                              animate={{ strokeDashoffset: circ*(1-pct) }} transition={{ duration:1, ease }}
                              strokeLinecap="round"/>
                          </svg>
                        );
                      })()}
                      <span className="text-sm font-black text-foreground">{globalAI.discipline_score}</span>
                    </div>
                    <div>
                      <p className="text-xs font-black text-foreground">Discipline Score</p>
                      <p className={`text-xs font-semibold ${globalAI.discipline_score >= 70 ? 'text-emerald-500 dark:text-emerald-400' : globalAI.discipline_score >= 40 ? 'text-muted-foreground' : 'text-red-500 dark:text-red-400'}`}>
                        {globalAI.discipline_score >= 70 ? 'Good progress!' : globalAI.discipline_score >= 40 ? 'Needs work' : 'Struggling'}
                      </p>
                      {globalAI.summary && <p className="text-[10px] text-muted-foreground mt-1 leading-snug">{globalAI.summary.slice(0, 60)}...</p>}
                    </div>
                  </div>

                  {/* Suggestions */}
                  {(globalAI.suggestions ?? []).length > 0 && (
                    <div className="space-y-2">
                      {(globalAI.suggestions ?? []).map((s: string, i: number) => (
                        <div key={i} className={`flex items-start gap-2 text-[11px] ${i === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                          <span className="flex-shrink-0">{i === 0 ? '●' : '◆'}</span>
                          {s}
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={handleGlobalAI} disabled={aiLoading}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-all shadow-md shadow-violet-500/20 disabled:opacity-50">
                    View Full Review
                  </button>
                </div>
              ) : (
                <div className="p-4 text-center py-8">
                  <Brain className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3"/>
                  <p className="text-xs text-muted-foreground mb-4">Analyze your journal entries to get a psychology report</p>
                  <button onClick={handleGlobalAI} disabled={aiLoading || entries.length === 0}
                    className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-all shadow-md shadow-violet-500/20 disabled:opacity-50">
                    {aiLoading ? 'Analyzing...' : 'Run AI Review'}
                  </button>
                </div>
              )}
            </div>

            {/* Emotional Trends */}
            {chartData.length > 1 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-black text-foreground mb-3">Emotional Trends</p>
                <ResponsiveContainer width="100%" height={100}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3}/>
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false}/>
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} className="text-muted-foreground" interval="preserveStartEnd"/>
                    <YAxis domain={[0,10]} tick={{ fontSize: 9 }} axisLine={false} tickLine={false} width={20} className="text-muted-foreground"/>
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10 }}/>
                    <Area type="monotone" dataKey="confidence" stroke="#7c3aed" strokeWidth={2} fill="url(#cg)" dot={false} activeDot={{ r: 3, fill: '#7c3aed', strokeWidth: 0 }}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Mistakes */}
            {topMistakes.length > 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-black text-foreground mb-3">Top Mistakes</p>
                <div className="space-y-2">
                  {topMistakes.map(([mistake, count]) => {
                    const pct = Math.round((count / entries.length) * 100);
                    return (
                      <div key={mistake} className="flex items-center justify-between">
                        <p className={`text-xs font-semibold truncate flex-1 ${count >= 3 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>{mistake}</p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${count >= 3 ? 'bg-red-500' : 'bg-muted-foreground/40'}`} style={{ width: `${Math.min(100, pct * 3)}%` }}/>
                          </div>
                          <span className="text-[10px] text-muted-foreground w-10 text-right">{count} ({pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {modalOpen && (
          <NewEntryModal onClose={() => { setModalOpen(false); setEditEntry(null); }} onSaved={load} editEntry={editEntry}/>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
