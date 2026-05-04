// ─── TradePlan.tsx ────────────────────────────────────────────────────────────
// Replaces the hardcoded Trade Plan page.
// Connected to Supabase trade_plans table — one plan per day, full CRUD.

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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CalendarDays, Plus, Save, Trash2, X, CheckCircle2,
  ChevronLeft, ChevronRight, AlertCircle, TrendingUp,
  TrendingDown, Minus, Activity,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TradePlan {
  id: string;
  user_id: string;
  plan_date: string;
  market_bias: 'bullish' | 'bearish' | 'neutral' | 'ranging';
  focus: string | null;
  max_daily_loss: number | null;
  max_risk_per_trade: number | null;
  setups_to_trade: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

type PlanForm = Omit<TradePlan, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

const BIAS_OPTIONS = [
  { value: 'bullish',  label: 'Bullish',  icon: TrendingUp,   color: 'text-emerald-500 border-emerald-500/30 bg-emerald-500/10' },
  { value: 'bearish',  label: 'Bearish',  icon: TrendingDown, color: 'text-red-500 border-red-500/30 bg-red-500/10' },
  { value: 'neutral',  label: 'Neutral',  icon: Minus,        color: 'text-amber-500 border-amber-500/30 bg-amber-500/10' },
  { value: 'ranging',  label: 'Ranging',  icon: Activity,     color: 'text-blue-500 border-blue-500/30 bg-blue-500/10' },
] as const;

const COMMON_SETUPS = [
  'Pullback', 'Breakout', 'Opening Range', 'Liquidity Sweep',
  'Order Block', 'FVG', 'VWAP Bounce', 'EMA Cross',
];

function toDBDate(d: Date) {
  return d.toISOString().split('T')[0];
}

function displayDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── Empty form for a given date ─────────────────────────────────────────────
function emptyForm(date: string): PlanForm {
  return {
    plan_date: date,
    market_bias: 'neutral',
    focus: '',
    max_daily_loss: null,
    max_risk_per_trade: null,
    setups_to_trade: [],
    notes: '',
  };
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TradePlan() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(toDBDate(new Date()));
  const [plan, setPlan] = useState<TradePlan | null>(null);
  const [form, setForm] = useState<PlanForm>(emptyForm(selectedDate));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSetup, setNewSetup] = useState('');

  // Fetch plan for selected date
  const fetchPlan = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data, error: err } = await supabase
      .from('trade_plans')
      .select('*')
      .eq('user_id', user.id)
      .eq('plan_date', selectedDate)
      .maybeSingle();

    if (err) {
      setError('Could not load plan. Please try again.');
      console.error(err);
    } else if (data) {
      setPlan(data as TradePlan);
      setForm(data as PlanForm);
      setEditing(false);
    } else {
      setPlan(null);
      setForm(emptyForm(selectedDate));
      setEditing(false);
    }
    setLoading(false);
  }, [user, selectedDate]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  // Navigate dates
  const prevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(toDBDate(d));
  };
  const nextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    const today = toDBDate(new Date());
    if (toDBDate(d) > today) return; // can't go into future
    setSelectedDate(toDBDate(d));
  };
  const isToday = selectedDate === toDBDate(new Date());

  // Form helpers
  const set = (k: keyof PlanForm, v: any) => setForm(f => ({ ...f, [k]: v }));

  const addSetup = (s: string) => {
    const trimmed = s.trim();
    if (!trimmed || form.setups_to_trade.includes(trimmed)) return;
    set('setups_to_trade', [...form.setups_to_trade, trimmed]);
    setNewSetup('');
  };

  const removeSetup = (s: string) =>
    set('setups_to_trade', form.setups_to_trade.filter(x => x !== s));

  // Save (upsert)
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const payload = {
      ...form,
      plan_date: selectedDate,
      user_id: user.id,
      updated_at: new Date().toISOString(),
    };

    const { data, error: err } = await supabase
      .from('trade_plans')
      .upsert(payload, { onConflict: 'user_id,plan_date' })
      .select()
      .single();

    if (err) {
      toast({ title: 'Error', description: 'Could not save plan.', variant: 'destructive' });
      console.error(err);
    } else {
      setPlan(data as TradePlan);
      setEditing(false);
      toast({ title: 'Plan saved!', description: `Trade plan for ${displayDate(selectedDate)} saved.` });
    }
    setSaving(false);
  };

  // Delete
  const handleDelete = async () => {
    if (!plan || !user) return;
    const { error: err } = await supabase
      .from('trade_plans')
      .delete()
      .eq('id', plan.id)
      .eq('user_id', user.id);

    if (err) {
      toast({ title: 'Error', description: 'Could not delete plan.', variant: 'destructive' });
    } else {
      setPlan(null);
      setForm(emptyForm(selectedDate));
      toast({ title: 'Plan deleted' });
    }
  };

  const currentBias = BIAS_OPTIONS.find(b => b.value === form.market_bias) ?? BIAS_OPTIONS[2];

  // ─── Loading ──
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Header + date navigator */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Trade Plan</h2>
          <p className="text-muted-foreground text-sm">Pre-market structure before execution</p>
        </div>

        {/* Date nav */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={prevDay} className="rounded-xl h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground min-w-[160px] text-center">
              {displayDate(selectedDate)}
            </p>
            {isToday && <p className="text-xs text-primary font-medium">Today</p>}
          </div>
          <Button
            variant="ghost" size="icon"
            onClick={nextDay}
            disabled={isToday}
            className="rounded-xl h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <Card className="border-0 border-l-4 border-l-red-500 shadow-sm">
          <CardContent className="py-3 px-4 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <p className="text-sm text-red-500">{error}</p>
            <Button variant="ghost" size="sm" onClick={fetchPlan} className="ml-auto">Retry</Button>
          </CardContent>
        </Card>
      )}

      {/* View mode — plan exists + not editing */}
      {plan && !editing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Bias + actions */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium capitalize ${currentBias.color}`}>
                    <currentBias.icon className="h-4 w-4" />
                    {plan.market_bias}
                  </div>
                  <Badge variant="outline" className="text-xs rounded-full">
                    <CalendarDays className="h-3 w-3 mr-1" />
                    {plan.setups_to_trade.length} setups
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="rounded-xl gap-1.5">
                    Edit
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    onClick={handleDelete}
                    className="h-8 w-8 rounded-xl text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan tabs */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5">
              <Tabs defaultValue="focus">
                <TabsList className="mb-4">
                  <TabsTrigger value="focus">Focus</TabsTrigger>
                  <TabsTrigger value="risk">Risk</TabsTrigger>
                  <TabsTrigger value="notes">Notes</TabsTrigger>
                </TabsList>

                <TabsContent value="focus" className="space-y-4">
                  {plan.focus && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Market Focus</p>
                      <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3">{plan.focus}</p>
                    </div>
                  )}
                  {plan.setups_to_trade.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Setups to Trade</p>
                      <div className="flex flex-wrap gap-2">
                        {plan.setups_to_trade.map(s => (
                          <Badge key={s} variant="outline" className="rounded-full">{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {!plan.focus && plan.setups_to_trade.length === 0 && (
                    <p className="text-sm text-muted-foreground">No focus defined. Edit to add your market focus.</p>
                  )}
                </TabsContent>

                <TabsContent value="risk" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Max Daily Loss</p>
                      <p className="text-xl font-bold font-heading text-red-500 mt-1">
                        {plan.max_daily_loss != null ? `-$${plan.max_daily_loss}` : '—'}
                      </p>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground">Risk Per Trade</p>
                      <p className="text-xl font-bold font-heading text-foreground mt-1">
                        {plan.max_risk_per_trade != null ? `${plan.max_risk_per_trade}%` : '—'}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="notes">
                  {plan.notes
                    ? <p className="text-sm text-foreground bg-muted/30 rounded-lg p-3 leading-relaxed">{plan.notes}</p>
                    : <p className="text-sm text-muted-foreground">No notes for this session.</p>
                  }
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Edit / Create form */}
      {(editing || !plan) && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

          {/* Bias selector */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm">Market Bias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {BIAS_OPTIONS.map(b => {
                  const selected = form.market_bias === b.value;
                  return (
                    <button
                      key={b.value}
                      onClick={() => set('market_bias', b.value)}
                      className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium capitalize ${
                        selected ? b.color + ' border-current' : 'border-border text-muted-foreground hover:border-primary/40'
                      }`}
                    >
                      <b.icon className="h-4 w-4" />
                      {b.label}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Focus + Setups */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm">Focus & Setups</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Market Focus</label>
                <Textarea
                  value={form.focus ?? ''}
                  onChange={e => set('focus', e.target.value)}
                  placeholder="e.g. Bullish continuation on NQ, watching XAUUSD for pullback..."
                  rows={2}
                  className="text-sm resize-none rounded-lg"
                />
              </div>

              {/* Setups */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Setups to Trade</label>
                {/* Quick select */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {COMMON_SETUPS.map(s => {
                    const selected = form.setups_to_trade.includes(s);
                    return (
                      <button
                        key={s}
                        onClick={() => selected ? removeSetup(s) : addSetup(s)}
                        className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                          selected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {selected && '✓ '}{s}
                      </button>
                    );
                  })}
                </div>
                {/* Custom setup input */}
                <div className="flex gap-2">
                  <Input
                    value={newSetup}
                    onChange={e => setNewSetup(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSetup(newSetup); } }}
                    placeholder="Custom setup..."
                    className="rounded-lg text-sm"
                  />
                  <Button variant="outline" size="sm" onClick={() => addSetup(newSetup)} className="rounded-lg">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm">Risk Parameters</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Max Daily Loss ($)</label>
                <Input
                  type="number" min={0} step={10}
                  value={form.max_daily_loss ?? ''}
                  onChange={e => set('max_daily_loss', e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 250"
                  className="rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Risk Per Trade (%)</label>
                <Input
                  type="number" min={0} max={100} step={0.1}
                  value={form.max_risk_per_trade ?? ''}
                  onChange={e => set('max_risk_per_trade', e.target.value ? Number(e.target.value) : null)}
                  placeholder="e.g. 0.5"
                  className="rounded-lg text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-sm">Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={form.notes ?? ''}
                onChange={e => set('notes', e.target.value)}
                placeholder="Key levels, news events, reminders for today..."
                rows={3}
                className="text-sm resize-none rounded-lg"
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="rounded-xl flex-1">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : plan ? 'Update Plan' : 'Save Plan'}
            </Button>
            {editing && (
              <Button variant="outline" onClick={() => setEditing(false)} className="rounded-xl">
                <X className="h-4 w-4 mr-1" /> Cancel
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* No plan — empty state */}
      {!plan && !loading && !editing && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-14 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-foreground mb-1">No plan for {isToday ? 'today' : 'this day'}</p>
            <p className="text-sm text-muted-foreground mb-4">Build your pre-market structure before executing.</p>
            <Button onClick={() => setEditing(true)} className="rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Create Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
