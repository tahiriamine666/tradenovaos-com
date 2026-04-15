import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus } from 'lucide-react';

type Trade = {
  id: string;
  pair: string;
  side: string | null;
  result: number | null;
  trade_date: string;
  notes: string | null;
  entry_price: number | null;
  exit_price: number | null;
  quantity: number | null;
  setup: string | null;
  created_at: string | null;
  user_id: string;
};

const emptyForm = { pair: '', side: 'long', result: '', trade_date: new Date().toISOString().split('T')[0], notes: '', setup: '' };

export default function TradeVault() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [playbooks, setPlaybooks] = useState<{ title: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('playbooks').select('title').eq('user_id', user.id).then(({ data }) => {
      setPlaybooks(data ?? []);
    });
  }, [user]);

  const fetchTrades = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('trade_date', { ascending: false });
    if (error) {
      toast.error('Failed to load trades');
    } else {
      setTrades(data || []);
    }
    setLoading(false);
  };

  useEffect(() => { fetchTrades(); }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.pair.trim()) return;

    const payload = {
      pair: form.pair.trim(),
      side: form.side,
      result: form.result ? parseFloat(form.result) : null,
      trade_date: form.trade_date,
      notes: form.notes || null,
      setup: form.setup || null,
      user_id: user.id,
    };

    if (editingId) {
      const { error } = await supabase.from('trades').update(payload).eq('id', editingId);
      if (error) { toast.error('Failed to update trade'); return; }
      toast.success('Trade updated');
    } else {
      const { error } = await supabase.from('trades').insert(payload);
      if (error) { toast.error('Failed to add trade'); return; }
      toast.success('Trade added');
    }

    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(false);
    fetchTrades();
  };

  const handleEdit = (trade: Trade) => {
    setForm({
      pair: trade.pair,
      side: trade.side || 'long',
      result: trade.result?.toString() || '',
      trade_date: trade.trade_date,
      notes: trade.notes || '',
      setup: trade.setup || '',
    });
    setEditingId(trade.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (error) { toast.error('Failed to delete trade'); return; }
    toast.success('Trade deleted');
    fetchTrades();
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Trade Vault</h2>
          <p className="text-sm text-muted-foreground">Log, review, and manage all your trades</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> New Trade
            </Button>
          </DialogTrigger>
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
              <Button type="submit" className="w-full rounded-xl">{editingId ? 'Update Trade' : 'Add Trade'}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">All Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading trades...</p>
          ) : trades.length === 0 ? (
            <p className="text-sm text-muted-foreground">No trades yet. Add your first trade above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Pair</TableHead>
                  <TableHead>Side</TableHead>
                  <TableHead>Setup</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => {
                  const positive = (trade.result ?? 0) > 0;
                  const negative = (trade.result ?? 0) < 0;
                  return (
                    <TableRow key={trade.id}>
                      <TableCell className="text-sm">{trade.trade_date}</TableCell>
                      <TableCell className="font-medium">{trade.pair}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={trade.side === 'long' ? 'text-emerald-500 border-emerald-500/30' : 'text-red-500 border-red-500/30'}>
                          {trade.side || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{trade.setup || '—'}</TableCell>
                      <TableCell className={positive ? 'text-emerald-500 font-semibold' : negative ? 'text-red-500 font-semibold' : ''}>
                        {trade.result != null ? `${trade.result > 0 ? '+' : ''}$${trade.result}` : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(trade)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(trade.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
