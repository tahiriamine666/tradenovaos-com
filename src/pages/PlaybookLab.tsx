import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Target } from 'lucide-react';

interface Playbook {
  id: string;
  title: string;
  description: string | null;
  rules: string | null;
  created_at: string | null;
  user_id: string;
}

const emptyForm = { title: '', description: '', rules: '' };

export default function PlaybookLab() {
  const { user } = useAuth();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPlaybooks = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('playbooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPlaybooks(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchPlaybooks(); }, [user]);

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: Playbook) => {
    setEditingId(p.id);
    setForm({ title: p.title, description: p.description ?? '', rules: p.rules ?? '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !form.title.trim()) return;
    setSaving(true);
    if (editingId) {
      const { error } = await supabase
        .from('playbooks')
        .update({ title: form.title, description: form.description || null, rules: form.rules || null })
        .eq('id', editingId);
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Playbook updated' });
    } else {
      const { error } = await supabase
        .from('playbooks')
        .insert({ title: form.title, description: form.description || null, rules: form.rules || null, user_id: user.id });
      if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
      else toast({ title: 'Playbook created' });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchPlaybooks();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('playbooks').delete().eq('id', id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
    else { toast({ title: 'Playbook deleted' }); fetchPlaybooks(); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Playbook Lab</h2>
          <p className="text-muted-foreground text-sm">Your refined trading setups</p>
        </div>
        <Button onClick={openNew} className="rounded-xl gap-2"><Plus className="h-4 w-4" /> New Playbook</Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : playbooks.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 text-center py-12">
            <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No playbooks yet — create your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {playbooks.map(p => (
            <Card key={p.id} className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-3">
                <p className="font-heading font-bold text-foreground">{p.title}</p>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                {p.rules && (
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{p.rules}</p>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="rounded-xl gap-1" onClick={() => openEdit(p)}>
                    <Pencil className="h-3 w-3" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-xl gap-1 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                    <Trash2 className="h-3 w-3" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Playbook' : 'New Playbook'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Title</label>
              <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Momentum Pulse" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Describe the setup..." rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Rules</label>
              <Textarea value={form.rules} onChange={e => setForm({ ...form, rules: e.target.value })} placeholder="Entry rules, exit rules, conditions..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !form.title.trim()}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
