// ─── PlaybookLab.tsx ──────────────────────────────────────────────────────────
// Full CRUD — connected to Supabase playbooks table
// Fixes: no persistence, no edit, no delete

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Target, Plus, Pencil, Trash2, Save, X,
  ChevronDown, ChevronUp, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Playbook {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  entry_rules: string | null;
  exit_rules: string | null;
  risk_rules: string | null;
  best_market_conditions: string | null;
  checklist: string | null;
  status: string;
  rules_array: string[];
  created_at: string;
  updated_at: string;
}

type PlaybookForm = Omit<Playbook, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

const EMPTY_FORM: PlaybookForm = {
  title: '',
  description: '',
  entry_rules: '',
  exit_rules: '',
  risk_rules: '',
  best_market_conditions: '',
  checklist: '',
  status: 'active',
  rules_array: [],
};

// ─── Form ─────────────────────────────────────────────────────────────────────
function PlaybookForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: PlaybookForm;
  onSave: (form: PlaybookForm) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<PlaybookForm>(initial);
  const [newRule, setNewRule] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof PlaybookForm, v: any) => {
    setForm(f => ({ ...f, [k]: v }));
    setErrors(e => ({ ...e, [k]: '' }));
  };

  const addRule = () => {
    const r = newRule.trim();
    if (!r) return;
    set('rules_array', [...form.rules_array, r]);
    setNewRule('');
  };

  const removeRule = (i: number) =>
    set('rules_array', form.rules_array.filter((_, idx) => idx !== i));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.title.trim()) errs.title = 'Title is required.';
    if (form.title.trim().length > 100) errs.title = 'Title too long (max 100 chars).';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
  };

  const fields = [
    { key: 'entry_rules' as keyof PlaybookForm, label: 'Entry Rules', placeholder: 'e.g. Wait for candle close above key level...' },
    { key: 'exit_rules' as keyof PlaybookForm, label: 'Exit Rules', placeholder: 'e.g. Take profit at 2R, move SL to BE at 1R...' },
    { key: 'risk_rules' as keyof PlaybookForm, label: 'Risk Rules', placeholder: 'e.g. Max 0.5% risk, stop after 2 losses...' },
    { key: 'best_market_conditions' as keyof PlaybookForm, label: 'Best Market Conditions', placeholder: 'e.g. Trending market, high volume session...' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-sm border-l-4 border-l-primary">
        <CardContent className="pt-5 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">
              Setup Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.title}
              onChange={e => set('title', e.target.value)}
              placeholder="e.g. Pullback Entry, Opening Range Breakout..."
              className="rounded-lg"
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />{errors.title}
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description</label>
            <Textarea
              value={form.description ?? ''}
              onChange={e => set('description', e.target.value)}
              placeholder="Brief overview of this setup and when to use it..."
              rows={2}
              className="text-sm resize-none rounded-lg"
            />
          </div>

          {/* Rules fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map(f => (
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
          </div>

          {/* Rules checklist */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Checklist Rules</label>
            <div className="space-y-2 mb-2">
              <AnimatePresence>
                {form.rules_array.map((rule, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                    className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span className="text-sm flex-1 text-foreground">{rule}</span>
                    <button onClick={() => removeRule(i)} className="text-muted-foreground hover:text-red-500 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="flex gap-2">
              <Input
                value={newRule}
                onChange={e => setNewRule(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRule(); } }}
                placeholder="Add a rule and press Enter..."
                className="rounded-lg text-sm"
              />
              <Button variant="outline" size="sm" onClick={addRule} className="rounded-lg flex-shrink-0">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Status</label>
            <div className="flex gap-2">
              {['active', 'inactive', 'testing'].map(s => (
                <button
                  key={s}
                  onClick={() => set('status', s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize ${
                    form.status === s
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <Button onClick={handleSave} disabled={saving} className="rounded-xl flex-1">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Playbook'}
            </Button>
            <Button variant="outline" onClick={onCancel} className="rounded-xl">Cancel</Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Playbook card ────────────────────────────────────────────────────────────
function PlaybookCard({
  playbook,
  onEdit,
  onDelete,
}: {
  playbook: Playbook;
  onEdit: (p: Playbook) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const statusColor = {
    active: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    inactive: 'bg-muted text-muted-foreground border-border',
    testing: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  }[playbook.status] ?? 'bg-muted text-muted-foreground';

  const sections = [
    { label: 'Entry Rules', value: playbook.entry_rules },
    { label: 'Exit Rules', value: playbook.exit_rules },
    { label: 'Risk Rules', value: playbook.risk_rules },
    { label: 'Best Conditions', value: playbook.best_market_conditions },
  ].filter(s => s.value);

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="p-0">
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => setExpanded(v => !v)}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="rounded-lg bg-primary/10 p-2 flex-shrink-0">
                <Target className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{playbook.title}</p>
                {playbook.description && (
                  <p className="text-xs text-muted-foreground truncate">{playbook.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
              <Badge variant="outline" className={`text-[11px] rounded-full capitalize border ${statusColor}`}>
                {playbook.status}
              </Badge>
              {playbook.rules_array.length > 0 && (
                <Badge variant="outline" className="text-[11px] rounded-full">
                  {playbook.rules_array.length} rules
                </Badge>
              )}
              <button
                onClick={e => { e.stopPropagation(); onEdit(playbook); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); onDelete(playbook.id); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              {expanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </div>
          </div>

          {/* Expanded content */}
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
                  {/* Checklist */}
                  {playbook.rules_array.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Checklist</p>
                      <div className="space-y-1.5">
                        {playbook.rules_array.map((rule, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            {rule}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sections */}
                  {sections.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sections.map(s => (
                        <div key={s.label} className="bg-muted/30 rounded-lg p-3">
                          <p className="text-xs font-medium text-muted-foreground mb-1">{s.label}</p>
                          <p className="text-sm text-foreground leading-relaxed">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PlaybookLab() {
  const { user } = useAuth();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPlaybook, setEditingPlaybook] = useState<Playbook | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch
  const fetchPlaybooks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('playbooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (err) {
      setError('Could not load playbooks. Please try again.');
      console.error('Playbooks fetch error:', err);
    } else {
      setPlaybooks(data ?? []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPlaybooks(); }, [fetchPlaybooks]);

  // Create
  const handleCreate = async (form: PlaybookForm) => {
    if (!user) return;
    setSaving(true);
    const { error: err } = await supabase
      .from('playbooks')
      .insert({ ...form, user_id: user.id });

    if (err) {
      toast({ title: 'Error', description: 'Could not save playbook.', variant: 'destructive' });
      console.error(err);
    } else {
      toast({ title: 'Playbook created!' });
      setShowForm(false);
      fetchPlaybooks();
    }
    setSaving(false);
  };

  // Update
  const handleUpdate = async (form: PlaybookForm) => {
    if (!user || !editingPlaybook) return;
    setSaving(true);
    const { error: err } = await supabase
      .from('playbooks')
      .update({ ...form, updated_at: new Date().toISOString() })
      .eq('id', editingPlaybook.id)
      .eq('user_id', user.id);

    if (err) {
      toast({ title: 'Error', description: 'Could not update playbook.', variant: 'destructive' });
      console.error(err);
    } else {
      toast({ title: 'Playbook updated!' });
      setEditingPlaybook(null);
      fetchPlaybooks();
    }
    setSaving(false);
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!user) return;
    const { error: err } = await supabase
      .from('playbooks')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (err) {
      toast({ title: 'Error', description: 'Could not delete playbook.', variant: 'destructive' });
    } else {
      setPlaybooks(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Playbook deleted' });
    }
  };

  const startEdit = (p: Playbook) => {
    setEditingPlaybook(p);
    setShowForm(false);
  };

  const cancelEdit = () => setEditingPlaybook(null);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Playbook Lab</h2>
          <p className="text-muted-foreground text-sm">Define your trading setups and rules</p>
        </div>
        <Button onClick={() => { setShowForm(v => !v); setEditingPlaybook(null); }} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" /> New Playbook
        </Button>
      </div>

      {/* Stats */}
      {playbooks.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: playbooks.length },
            { label: 'Active', value: playbooks.filter(p => p.status === 'active').length },
            { label: 'Testing', value: playbooks.filter(p => p.status === 'testing').length },
          ].map(s => (
            <Card key={s.label} className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                <p className="text-2xl font-bold font-heading text-primary">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* New form */}
      <AnimatePresence>
        {showForm && (
          <PlaybookForm
            initial={EMPTY_FORM}
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        )}
      </AnimatePresence>

      {/* Edit form */}
      <AnimatePresence>
        {editingPlaybook && (
          <PlaybookForm
            initial={{
              title: editingPlaybook.title,
              description: editingPlaybook.description,
              entry_rules: editingPlaybook.entry_rules,
              exit_rules: editingPlaybook.exit_rules,
              risk_rules: editingPlaybook.risk_rules,
              best_market_conditions: editingPlaybook.best_market_conditions,
              checklist: editingPlaybook.checklist,
              status: editingPlaybook.status,
              rules_array: editingPlaybook.rules_array ?? [],
            }}
            onSave={handleUpdate}
            onCancel={cancelEdit}
            saving={saving}
          />
        )}
      </AnimatePresence>

      {/* Error */}
      {error && (
        <Card className="border-0 border-l-4 border-l-red-500 shadow-sm">
          <CardContent className="py-3 px-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-500">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchPlaybooks} className="ml-auto">Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && playbooks.length === 0 && !showForm && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">No playbooks yet</p>
            <p className="text-sm text-muted-foreground mb-4">Document your trading setups, rules, and conditions.</p>
            <Button onClick={() => setShowForm(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Create First Playbook
            </Button>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {!loading && playbooks.length > 0 && (
        <div className="space-y-3">
          <AnimatePresence>
            {playbooks.map(p => (
              <PlaybookCard key={p.id} playbook={p} onEdit={startEdit} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
