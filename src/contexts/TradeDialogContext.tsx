import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export type TradeRecord = {
  id: string;
  pair: string;
  side: string | null;
  result: number | null;
  trade_date: string;
  notes: string | null;
  setup: string | null;
};

type Ctx = {
  openNew: () => void;
  openEdit: (t: TradeRecord) => void;
};

const TradeDialogContext = createContext<Ctx | null>(null);

const TRADES_CHANGED = 'tradenova:trades-changed';
export function emitTradesChanged() {
  window.dispatchEvent(new CustomEvent(TRADES_CHANGED));
}
export function useTradesChanged(cb: () => void) {
  useEffect(() => {
    const handler = () => cb();
    window.addEventListener(TRADES_CHANGED, handler);
    return () => window.removeEventListener(TRADES_CHANGED, handler);
  }, [cb]);
}

const empty = { pair: '', side: 'long', result: '', trade_date: new Date().toISOString().split('T')[0], notes: '', setup: '' };

export function TradeDialogProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [playbooks, setPlaybooks] = useState<{ title: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('playbooks').select('title').eq('user_id', user.id).then(({ data }) => {
      setPlaybooks(data ?? []);
    });
  }, [user, open]);

  const openNew = useCallback(() => {
    setEditingId(null);
    setForm(empty);
    setOpen(true);
  }, []);

  const openEdit = useCallback((t: TradeRecord) => {
    setEditingId(t.id);
    setForm({
      pair: t.pair,
      side: t.side || 'long',
      result: t.result?.toString() || '',
      trade_date: t.trade_date,
      notes: t.notes || '',
      setup: t.setup || '',
    });
    setOpen(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.pair.trim()) return;
    setSaving(true);
    const payload = {
      pair: form.pair.trim(),
      side: form.side,
      result: form.result ? parseFloat(form.result) : null,
      trade_date: form.trade_date,
      notes: form.notes || null,
      setup: form.setup || null,
      user_id: user.id,
    };
    const { error } = editingId
      ? await supabase.from('trades').update(payload).eq('id', editingId)
      : await supabase.from('trades').insert(payload);
    setSaving(false);
    if (error) {
      toast.error(editingId ? 'Failed to update trade' : 'Failed to add trade');
      return;
    }
    toast.success(editingId ? 'Trade updated' : 'Trade added');
    setOpen(false);
    emitTradesChanged();
  };

  return (
    <TradeDialogContext.Provider value={{ openNew, openEdit }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">{editingId ? 'Edit Trade' : 'Add Trade'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pair</Label>
                <Input placeholder="e.g. EURUSD" value={form.pair} onChange={(e) => setForm({ ...form, pair: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Side</Label>
                <Select value={form.side} onValueChange={(v) => setForm({ ...form, side: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="long">Long</SelectItem>
                    <SelectItem value="short">Short</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Result ($)</Label>
                <Input type="number" step="any" placeholder="e.g. 150" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={form.trade_date} onChange={(e) => setForm({ ...form, trade_date: e.target.value })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Setup</Label>
              {playbooks.length === 0 ? (
                <p className="text-xs text-muted-foreground">No playbooks yet. Create one in Playbook Lab first.</p>
              ) : (
                <Select value={form.setup} onValueChange={(v) => setForm({ ...form, setup: v === '__none__' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Select setup..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {playbooks.map((p) => (
                      <SelectItem key={p.title} value={p.title}>{p.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Trade notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
            <Button type="submit" disabled={saving} className="w-full rounded-xl">
              {saving ? 'Saving...' : editingId ? 'Update Trade' : 'Add Trade'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </TradeDialogContext.Provider>
  );
}

export function useTradeDialog() {
  const ctx = useContext(TradeDialogContext);
  if (!ctx) throw new Error('useTradeDialog must be used within TradeDialogProvider');
  return ctx;
}
