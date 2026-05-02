import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, PlayCircle, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

type Replay = {
  id: string;
  replay_date: string;
  pair: string;
  setup: string | null;
  notes: string | null;
  execution_score: number | null;
  result: number | null;
};

const empty = {
  replay_date: new Date().toISOString().split('T')[0],
  pair: '',
  setup: '',
  notes: '',
  execution_score: '8',
  result: '',
};

export default function ReplayStudio() {
  const { user } = useAuth();
  const [list, setList] = useState<Replay[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('replay_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('replay_date', { ascending: false });
    if (error) toast.error('Failed to load replays');
    setList(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchList(); }, [fetchList]);

  const openNew = () => { setEditingId(null); setForm(empty); setOpen(true); };
  const openEdit = (r: Replay) => {
    setEditingId(r.id);
    setForm({
      replay_date: r.replay_date,
      pair: r.pair,
      setup: r.setup ?? '',
      notes: r.notes ?? '',
      execution_score: r.execution_score?.toString() ?? '8',
      result: r.result?.toString() ?? '',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.pair.trim()) return;
    setSaving(true);
    const payload = {
      replay_date: form.replay_date,
      pair: form.pair.trim(),
      setup: form.setup || null,
      notes: form.notes || null,
      execution_score: form.execution_score ? parseInt(form.execution_score) : null,
      result: form.result ? parseFloat(form.result) : null,
      user_id: user.id,
    };
    const { error } = editingId
      ? await supabase.from('replay_sessions').update(payload).eq('id', editingId)
      : await supabase.from('replay_sessions').insert(payload);
    setSaving(false);
    if (error) { toast.error('Failed to save replay'); return; }
    toast.success(editingId ? 'Replay updated' : 'Replay logged');
    setOpen(false);
    fetchList();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('replay_sessions').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Replay deleted');
    fetchList();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Replay Studio</h2>
          <p className="text-muted-foreground text-sm">Log practice replays and rate execution</p>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-2"><Plus className="h-4 w-4" /> New Replay</Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}</div>
      ) : list.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-16 text-center">
            <PlayCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">No replays yet</p>
            <p className="text-sm text-muted-foreground mb-4">Log your first practice replay to track execution.</p>
            <Button onClick={openNew} className="rounded-xl"><Plus className="h-4 w-4 mr-2" /> Log First Replay</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map(r => {
            const positive = (r.result ?? 0) > 0;
            const negative = (r.result ?? 0) < 0;
            return (
              <Card key={r.id} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-heading font-semibold text-foreground">{r.pair}</p>
                      {r.setup && <Badge variant="outline" className="text-xs rounded-full">{r.setup}</Badge>}
                      <span className="text-xs text-muted-foreground">{r.replay_date}</span>
                    </div>
                    {r.notes && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{r.notes}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    {r.execution_score != null && <p className="text-xs text-muted-foreground">Exec {r.execution_score}/10</p>}
                    {r.result != null && (
                      <p className={`text-sm font-semibold ${positive ? 'text-emerald-500' : negative ? 'text-red-500' : ''}`}>
                        {r.result > 0 ? '+' : ''}${r.result}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(r.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">{editingId ? 'Edit Replay' : 'Log Replay'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pair</Label>
                <Input value={form.pair} onChange={e => setForm({ ...form, pair: e.target.value })} placeholder="e.g. NQ" />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.replay_date} onChange={e => setForm({ ...form, replay_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Setup</Label>
                <Input value={form.setup} onChange={e => setForm({ ...form, setup: e.target.value })} placeholder="e.g. Opening Range" />
              </div>
              <div className="space-y-2">
                <Label>Result ($)</Label>
                <Input type="number" step="any" value={form.result} onChange={e => setForm({ ...form, result: e.target.value })} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Execution Score (1-10)</Label>
                <Input type="number" min={1} max={10} value={form.execution_score} onChange={e => setForm({ ...form, execution_score: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="What did you learn from this replay?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.pair.trim()}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
