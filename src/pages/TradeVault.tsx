import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Pencil, Trash2, Plus, Upload } from 'lucide-react';
import CSVImport from '@/components/CSVImport';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTradeDialog, useTradesChanged, emitTradesChanged } from '@/contexts/TradeDialogContext';

type Trade = {
  id: string;
  pair: string;
  side: string | null;
  result: number | null;
  trade_date: string;
  notes: string | null;
  setup: string | null;
};

export default function TradeVault() {
  const { user } = useAuth();
  const { openNew, openEdit } = useTradeDialog();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvOpen, setCsvOpen] = useState(false);

  const fetchTrades = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('trades')
      .select('id, pair, side, result, trade_date, notes, setup')
      .eq('user_id', user.id)
      .order('trade_date', { ascending: false });
    if (error) toast.error('Failed to load trades');
    else setTrades(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);
  useTradesChanged(fetchTrades);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (error) { toast.error('Failed to delete trade'); return; }
    toast.success('Trade deleted');
    emitTradesChanged();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Trade Vault</h2>
          <p className="text-sm text-muted-foreground">Log, review, and manage all your trades</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => setCsvOpen(true)}>
            <Upload className="h-4 w-4 mr-1" /> Import CSV
          </Button>
          <Button className="rounded-xl" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" /> New Trade
          </Button>
        </div>
        {user && (
          <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Import Trades</DialogTitle></DialogHeader>
              <CSVImport onImportComplete={() => { fetchTrades(); emitTradesChanged(); setCsvOpen(false); }} />
            </DialogContent>
          </Dialog>
        )}
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
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(trade)}>
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
