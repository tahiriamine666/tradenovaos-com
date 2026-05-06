// ─── ReplayStudio.tsx ─────────────────────────────────────────────────────────
// MVP Replay Studio — manual session log
// Traders log simulated trades during replay practice sessions

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  PlayCircle, Plus, Trash2, Target, TrendingUp, TrendingDown,
  Minus, Clock, BarChart3, StopCircle, CheckCircle2, X,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ReplayTrade {
  id: string;
  pair: string;
  side: 'long' | 'short';
  outcome: 'win' | 'loss' | 'breakeven';
  result: number;
  rr: number | null;
  notes: string;
  created_at: string;
}

interface ReplaySession {
  id: string;
  user_id: string;
  title: string;
  instrument: string;
  status: 'active' | 'completed';
  trades: ReplayTrade[];
  notes: string;
  created_at: string;
  updated_at: string;
}

// ─── Session summary ──────────────────────────────────────────────────────────
function SessionSummary({ trades }: { trades: ReplayTrade[] }) {
  if (trades.length === 0) return null;
  const wins = trades.filter(t => t.outcome === 'win').length;
  const totalPnl = trades.reduce((s, t) => s + t.result, 0);
  const winRate = Math.round((wins / trades.length) * 100);
  const avgRR = trades.filter(t => t.rr).length > 0
    ? (trades.filter(t => t.rr).reduce((s, t) => s + (t.rr ?? 0), 0) / trades.filter(t => t.rr).length).toFixed(1)
    : null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Trades', value: trades.length, color: 'text-foreground' },
        { label: 'Win Rate', value: `${winRate}%`, color: winRate >= 50 ? 'text-emerald-500' : 'text-red-500' },
        { label: 'Net P&L', value: `${totalPnl >= 0 ? '+' : ''}$${totalPnl.toFixed(0)}`, color: totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500' },
        { label: 'Avg R:R', value: avgRR ? `1:${avgRR}` : '—', color: 'text-foreground' },
      ].map(s => (
        <div key={s.label} className="bg-muted/30 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
          <p className={`text-lg font-bold font-heading ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Add replay trade form ────────────────────────────────────────────────────
function AddReplayTrade({ onAdd }: { onAdd: (t: Omit<ReplayTrade, 'id' | 'created_at'>) => void }) {
  const [form, setForm] = useState({ pair: '', side: 'long' as 'long' | 'short', outcome: 'win' as 'win' | 'loss' | 'breakeven', result: '', rr: '', notes: '' });

  const handleAdd = () => {
    if (!form.pair.trim()) { toast({ title: 'Enter a pair', variant: 'destructive' }); return; }
    const result = form.outcome === 'breakeven' ? 0 :
      form.outcome === 'loss' ? -Math.abs(Number(form.result) || 0) :
      Math.abs(Number(form.result) || 0);
    onAdd({ pair: form.pair.trim().toUpperCase(), side: form.side, outcome: form.outcome, result, rr: form.rr ? Number(form.rr) : null, notes: form.notes });
    setForm({ pair: '', side: 'long', outcome: 'win', result: '', rr: '', notes: '' });
  };

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-primary">
      <CardContent className="pt-4 pb-4 space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Input value={form.pair} onChange={e => setForm(f => ({...f, pair: e.target.value.toUpperCase()}))} placeholder="Pair" className="rounded-lg text-sm" />
          <select value={form.side} onChange={e => setForm(f => ({...f, side: e.target.value as any}))}
            className="text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none">
            <option value="long">↑ Long</option>
            <option value="short">↓ Short</option>
          </select>
          <select value={form.outcome} onChange={e => setForm(f => ({...f, outcome: e.target.value as any, result: e.target.value === 'breakeven' ? '0' : f.result}))}
            className="text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none">
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="breakeven">Breakeven</option>
          </select>
          <Input type="number" value={form.result} onChange={e => setForm(f => ({...f, result: e.target.value}))}
            placeholder="P&L ($)" className="rounded-lg text-sm" disabled={form.outcome === 'breakeven'} />
        </div>
        <div className="flex gap-2">
          <Input type="number" value={form.rr} onChange={e => setForm(f => ({...f, rr: e.target.value}))} placeholder="R:R" className="rounded-lg text-sm w-24" />
          <Input value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Notes..." className="rounded-lg text-sm flex-1" />
          <Button onClick={handleAdd} size="sm" className="rounded-lg flex-shrink-0 gap-1.5">
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ReplayStudio() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ReplaySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<ReplaySession | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newInstrument, setNewInstrument] = useState('');
  const [showNewForm, setShowNewForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchSessions = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('replay_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setSessions((data ?? []) as unknown as ReplaySession[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchSessions(); }, [fetchSessions]);

  const createSession = async () => {
    if (!user || !newTitle.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('replay_sessions')
      .insert({ user_id: user.id, title: newTitle.trim(), instrument: newInstrument.trim() || null, status: 'active', trades: [], notes: '', pair: newInstrument.trim() || newTitle.trim() } as any)
      .select().single();
    if (error) {
      toast({ title: 'Error', description: 'Could not create session.', variant: 'destructive' });
    } else {
      setActiveSession(data as unknown as ReplaySession);
      setShowNewForm(false);
      setNewTitle(''); setNewInstrument('');
      fetchSessions();
      toast({ title: 'Session started!' });
    }
    setSaving(false);
  };

  const addTradeToSession = async (trade: Omit<ReplayTrade, 'id' | 'created_at'>) => {
    if (!activeSession) return;
    const newTrade: ReplayTrade = { ...trade, id: crypto.randomUUID(), created_at: new Date().toISOString() };
    const updatedTrades = [...(activeSession.trades ?? []), newTrade];
    await supabase.from('replay_sessions').update({ trades: updatedTrades as any, updated_at: new Date().toISOString() }).eq('id', activeSession.id);
    setActiveSession(s => s ? { ...s, trades: updatedTrades } : s);
    setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, trades: updatedTrades } : s));
  };

  const removeTradeFromSession = async (tradeId: string) => {
    if (!activeSession) return;
    const updatedTrades = activeSession.trades.filter(t => t.id !== tradeId);
    await supabase.from('replay_sessions').update({ trades: updatedTrades as any, updated_at: new Date().toISOString() }).eq('id', activeSession.id);
    setActiveSession(s => s ? { ...s, trades: updatedTrades } : s);
  };

  const completeSession = async () => {
    if (!activeSession) return;
    await supabase.from('replay_sessions').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', activeSession.id);
    toast({ title: 'Session completed!', description: `${activeSession.trades.length} trades logged.` });
    setActiveSession(null);
    fetchSessions();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Replay Studio</h2>
          <p className="text-muted-foreground text-sm">Practice and simulate trading sessions</p>
        </div>
        <Button onClick={() => setShowNewForm(v => !v)} className="rounded-xl gap-2">
          <Plus className="h-4 w-4" /> New Session
        </Button>
      </div>

      {/* New session form */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
            <Card className="border-0 shadow-sm border-l-4 border-l-primary">
              <CardContent className="pt-5 pb-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Session Title</label>
                    <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. NASDAQ Pullback Drill" className="rounded-lg" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Instrument</label>
                    <Input value={newInstrument} onChange={e => setNewInstrument(e.target.value)} placeholder="e.g. NQ, EURUSD" className="rounded-lg" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={createSession} disabled={saving || !newTitle.trim()} className="rounded-xl gap-2">
                    <PlayCircle className="h-4 w-4" />{saving ? 'Starting...' : 'Start Session'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewForm(false)} className="rounded-xl">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active session */}
      {activeSession && (
        <Card className="border-0 shadow-sm border-2 border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <CardTitle className="font-heading text-base">{activeSession.title}</CardTitle>
                {activeSession.instrument && <Badge variant="outline" className="text-xs rounded-full">{activeSession.instrument}</Badge>}
              </div>
              <Button onClick={completeSession} size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs">
                <StopCircle className="h-3.5 w-3.5" /> Complete
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <SessionSummary trades={activeSession.trades} />
            <AddReplayTrade onAdd={addTradeToSession} />
            {activeSession.trades.length > 0 && (
              <div className="space-y-2">
                {[...activeSession.trades].reverse().map(t => (
                  <div key={t.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-foreground">{t.pair}</span>
                      <Badge variant="outline" className="text-[10px] capitalize rounded-full">{t.side}</Badge>
                      <span className={t.outcome === 'win' ? 'text-emerald-500' : t.outcome === 'loss' ? 'text-red-500' : 'text-amber-500'}>
                        {t.result >= 0 ? '+' : ''}${t.result}
                      </span>
                      {t.rr && <span className="text-xs text-muted-foreground">1:{t.rr}R</span>}
                    </div>
                    <button onClick={() => removeTradeFromSession(t.id)} className="text-muted-foreground hover:text-red-500 transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Past sessions */}
      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : sessions.filter(s => s.status === 'completed').length === 0 && !activeSession ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-14 text-center">
            <PlayCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">No replay sessions yet</p>
            <p className="text-sm text-muted-foreground mb-4">Start a session to practice your setups bar by bar.</p>
            <Button onClick={() => setShowNewForm(true)} className="rounded-xl gap-2">
              <Plus className="h-4 w-4" /> Start First Session
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Past Sessions</p>
          {sessions.filter(s => s.status === 'completed').map(s => {
            const wins = (s.trades ?? []).filter(t => t.outcome === 'win').length;
            const totalPnl = (s.trades ?? []).reduce((sum, t) => sum + t.result, 0);
            const wr = s.trades?.length > 0 ? Math.round((wins / s.trades.length) * 100) : 0;
            return (
              <Card key={s.id} className="border-0 shadow-sm">
                <CardContent className="py-3.5 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleDateString()} · {s.trades?.length ?? 0} trades</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={`font-semibold ${wr >= 50 ? 'text-emerald-500' : 'text-red-500'}`}>{wr}% WR</span>
                    <span className={`font-semibold ${totalPnl >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(0)}
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg" onClick={() => setActiveSession(s)}>
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
