import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BookOpen, Plus, Save, Trash2, ChevronDown, ChevronUp,
  Calendar, Smile, AlertTriangle, Lightbulb, TrendingUp, X
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  mood: string | null;
  mistakes: string | null;
  lesson: string | null;
  bias: string | null;
  notes: string | null;
  energy_level: number | null;
  confidence_level: number | null;
  rule_adherence: number | null;
  created_at: string;
  updated_at: string;
}

type NewEntry = Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

const MOODS = [
  { value: 'focused', label: '🎯 Focused' },
  { value: 'confident', label: '💪 Confident' },
  { value: 'calm', label: '😌 Calm' },
  { value: 'anxious', label: '😰 Anxious' },
  { value: 'frustrated', label: '😤 Frustrated' },
  { value: 'impatient', label: '⚡ Impatient' },
  { value: 'greedy', label: '🤑 Greedy' },
  { value: 'fearful', label: '😨 Fearful' },
];

const DEFAULT_FORM: NewEntry = {
  entry_date: new Date().toISOString().split('T')[0],
  mood: null,
  mistakes: '',
  lesson: '',
  bias: '',
  notes: '',
  energy_level: 5,
  confidence_level: 5,
  rule_adherence: 80,
};

// ─── Slider ───────────────────────────────────────────────────────────────────
function ScoreSlider({
  label, value, onChange, min = 1, max = 10, suffix = ''
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; suffix?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-semibold text-foreground">{value}{suffix}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full accent-primary cursor-pointer"
      />
    </div>
  );
}

// ─── Entry Card ───────────────────────────────────────────────────────────────
function EntryCard({ entry, onDelete }: { entry: JournalEntry; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const moodObj = MOODS.find(m => m.value === entry.mood);
  const date = new Date(entry.entry_date + 'T12:00:00');
  const dateStr = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          {/* Header row */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => setExpanded(v => !v)}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                {dateStr}
              </div>
              {moodObj && (
                <Badge variant="outline" className="text-xs rounded-full">{moodObj.label}</Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* Quick scores */}
              <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
                {entry.energy_level != null && (
                  <span>⚡ {entry.energy_level}/10</span>
                )}
                {entry.confidence_level != null && (
                  <span>💡 {entry.confidence_level}/10</span>
                )}
                {entry.rule_adherence != null && (
                  <span>📋 {entry.rule_adherence}%</span>
                )}
              </div>
              <Button
                variant="ghost" size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-red-500"
                onClick={e => { e.stopPropagation(); onDelete(entry.id); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
              {expanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </div>
          </div>

          {/* Expanded body */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  {/* Scores row */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Energy', value: entry.energy_level, max: 10, suffix: '/10' },
                      { label: 'Confidence', value: entry.confidence_level, max: 10, suffix: '/10' },
                      { label: 'Rule adherence', value: entry.rule_adherence, max: 100, suffix: '%' },
                    ].map(s => s.value != null && (
                      <div key={s.label} className="text-center bg-muted/30 rounded-lg p-3">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="text-xl font-bold font-heading text-primary mt-1">{s.value}{s.suffix}</p>
                      </div>
                    ))}
                  </div>

                  {/* Text fields */}
                  {[
                    { icon: TrendingUp, label: 'Market Bias', value: entry.bias },
                    { icon: AlertTriangle, label: 'Mistakes', value: entry.mistakes },
                    { icon: Lightbulb, label: 'Lesson', value: entry.lesson },
                    { icon: BookOpen, label: 'Notes', value: entry.notes },
                  ].filter(f => f.value).map(f => (
                    <div key={f.label}>
                      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
                        <f.icon className="h-3.5 w-3.5" />
                        {f.label}
                      </div>
                      <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3 leading-relaxed">{f.value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── New Entry Form ────────────────────────────────────────────────────────────
function NewEntryForm({ onSave, onCancel }: { onSave: (entry: NewEntry) => Promise<void>; onCancel: () => void }) {
  const [form, setForm] = useState<NewEntry>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof NewEntry, val: any) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-sm border-l-4 border-l-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="font-heading text-base">New Journal Entry</CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Entry Date</label>
            <input
              type="date"
              value={form.entry_date}
              onChange={e => set('entry_date', e.target.value)}
              className="w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Mood selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Mood</label>
            <div className="flex flex-wrap gap-2">
              {MOODS.map(m => (
                <button
                  key={m.value}
                  onClick={() => set('mood', form.mood === m.value ? null : m.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    form.mood === m.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <ScoreSlider
              label="Energy level" value={form.energy_level ?? 5}
              onChange={v => set('energy_level', v)} suffix="/10"
            />
            <ScoreSlider
              label="Confidence" value={form.confidence_level ?? 5}
              onChange={v => set('confidence_level', v)} suffix="/10"
            />
            <ScoreSlider
              label="Rule adherence" value={form.rule_adherence ?? 80}
              onChange={v => set('rule_adherence', v)} min={0} max={100} suffix="%"
            />
          </div>

          {/* Text fields */}
          {[
            { key: 'bias' as keyof NewEntry, label: 'Market Bias', placeholder: 'Bullish on NQ, bearish on DXY...' },
            { key: 'mistakes' as keyof NewEntry, label: 'Mistakes Made', placeholder: 'Entered before candle close...' },
            { key: 'lesson' as keyof NewEntry, label: 'Lesson Learned', placeholder: 'Wait for retest confirmation...' },
            { key: 'notes' as keyof NewEntry, label: 'Additional Notes', placeholder: 'Anything else worth remembering...' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">{f.label}</label>
              <Textarea
                value={(form[f.key] as string) ?? ''}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={2}
                className="text-sm resize-none rounded-lg"
              />
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button onClick={handleSave} disabled={saving} className="rounded-xl flex-1">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Entry'}
            </Button>
            <Button variant="outline" onClick={onCancel} className="rounded-xl">Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function MindJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch entries
  const fetchEntries = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('entry_date', { ascending: false });

    if (err) {
      setError('Failed to load journal entries. Please try again.');
      console.error('Journal fetch error:', err);
    } else {
      setEntries(data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Save new entry
  const handleSave = async (form: NewEntry) => {
    if (!user) return;
    const { error: err } = await supabase
      .from('journal_entries')
      .insert({ ...form, user_id: user.id });

    if (err) {
      toast({ title: 'Error', description: 'Could not save entry. Please try again.', variant: 'destructive' });
      console.error('Journal insert error:', err);
      return;
    }
    toast({ title: 'Entry saved', description: 'Your journal entry has been recorded.' });
    setShowForm(false);
    fetchEntries();
  };

  // Delete entry
  const handleDelete = async (id: string) => {
    const { error: err } = await supabase
      .from('journal_entries')
      .delete()
      .eq('id', id)
      .eq('user_id', user?.id ?? '');

    if (err) {
      toast({ title: 'Error', description: 'Could not delete entry.', variant: 'destructive' });
      return;
    }
    setEntries(prev => prev.filter(e => e.id !== id));
    toast({ title: 'Entry deleted' });
  };

  // Stats from real data
  const avgMood = entries.length > 0
    ? entries[0]?.mood ?? '—'
    : '—';
  const avgAdherence = entries.length > 0
    ? Math.round(entries.filter(e => e.rule_adherence != null).reduce((s, e) => s + (e.rule_adherence ?? 0), 0) / entries.filter(e => e.rule_adherence != null).length)
    : 0;
  const avgConfidence = entries.length > 0
    ? (entries.filter(e => e.confidence_level != null).reduce((s, e) => s + (e.confidence_level ?? 0), 0) / entries.filter(e => e.confidence_level != null).length).toFixed(1)
    : '—';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Mind Journal</h2>
          <p className="text-muted-foreground text-sm">Track emotions, mistakes, and lessons every session</p>
        </div>
        <Button
          onClick={() => setShowForm(v => !v)}
          className="rounded-xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Entry
        </Button>
      </div>

      {/* Stats cards */}
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total Entries</p>
              <p className="text-2xl font-bold font-heading text-primary">{entries.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Avg Rule Adherence</p>
              <p className="text-2xl font-bold font-heading text-primary">{avgAdherence}%</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Avg Confidence</p>
              <p className="text-2xl font-bold font-heading text-primary">{avgConfidence}/10</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* New entry form */}
      <AnimatePresence>
        {showForm && (
          <NewEntryForm onSave={handleSave} onCancel={() => setShowForm(false)} />
        )}
      </AnimatePresence>

      {/* Error state */}
      {error && (
        <Card className="border-0 shadow-sm border-l-4 border-l-red-500">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-red-500">{error}</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={fetchEntries}>Try again</Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && entries.length === 0 && !showForm && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">No journal entries yet</p>
            <p className="text-sm text-muted-foreground mb-4">Start tracking your trading mindset and lessons.</p>
            <Button onClick={() => setShowForm(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Write First Entry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Entry list */}
      {!loading && entries.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {entries.map(entry => (
              <EntryCard key={entry.id} entry={entry} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
