// ─── AnalyticsMetrics.tsx ─────────────────────────────────────────────────────
// Drop-in replacement for the metrics section in EdgeAnalytics.
// Fetches from get_my_analytics() DB function — includes profit factor + expectancy.

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp, Target, CheckCircle2, Clock3,
  BarChart3, LineChart, ShieldCheck, Zap, DollarSign, Activity,
} from 'lucide-react';

interface Analytics {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  gross_profit: number;
  gross_loss: number;
  net_pnl: number;
  profit_factor: number | null;
  expectancy: number;
  avg_win: number;
  avg_loss: number;
  best_trade: number;
  worst_trade: number;
  avg_rr: number | null;
  result_stddev: number;
}

function fmt(val: number | null, prefix = '$'): string {
  if (val === null || val === undefined) return '—';
  const sign = val >= 0 ? '+' : '';
  return `${sign}${prefix}${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function MetricCard({
  title, value, hint, icon: Icon, positive,
}: {
  title: string; value: string; hint: string;
  icon: React.ElementType; positive?: boolean;
}) {
  const valueColor =
    positive === true ? 'text-emerald-500' :
    positive === false ? 'text-red-500' :
    'text-foreground';

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
      <Card className="border-0 shadow-sm bg-card">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <Icon className="h-4 w-4 text-muted-foreground/40" strokeWidth={1.5} />
          </div>
          <p className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
          <p className="text-xs text-muted-foreground mt-1">{hint}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AnalyticsMetrics() {
  const { user } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      {
        const { data: trades } = await supabase
          .from('trades')
          .select('result, rr')
          .eq('user_id', user.id);

        if (trades && trades.length > 0) {
          const wins = trades.filter(t => t.result > 0);
          const losses = trades.filter(t => t.result < 0);
          const gross_profit = wins.reduce((s, t) => s + t.result, 0);
          const gross_loss = Math.abs(losses.reduce((s, t) => s + t.result, 0));
          const net_pnl = trades.reduce((s, t) => s + t.result, 0);
          const win_rate = (wins.length / trades.length) * 100;
          const avg_win = wins.length ? gross_profit / wins.length : 0;
          const avg_loss = losses.length ? gross_loss / losses.length : 0;
          const profit_factor = gross_loss > 0 ? gross_profit / gross_loss : null;
          const expectancy = (win_rate / 100 * avg_win) - ((1 - win_rate / 100) * avg_loss);
          const tradesWithRR = trades.filter(t => t.rr);
          const avg_rr = tradesWithRR.length ? tradesWithRR.reduce((s, t) => s + t.rr, 0) / tradesWithRR.length : null;
          const mean = net_pnl / trades.length;
          const variance = trades.reduce((s, t) => s + Math.pow(t.result - mean, 2), 0) / trades.length;

          setData({
            total_trades: trades.length,
            wins: wins.length,
            losses: losses.length,
            win_rate: Math.round(win_rate * 10) / 10,
            gross_profit, gross_loss, net_pnl,
            profit_factor, expectancy,
            avg_win, avg_loss,
            best_trade: Math.max(...trades.map(t => t.result)),
            worst_trade: Math.min(...trades.map(t => t.result)),
            avg_rr,
            result_stddev: Math.sqrt(variance),
          });
        } else {
          setError('No trade data available.');
        }
      }
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-12 text-center">
          <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No trades yet. Add trades to see analytics.</p>
        </CardContent>
      </Card>
    );
  }

  const metrics = [
    { title: 'Net P&L',       value: fmt(data.net_pnl),          hint: `From ${data.total_trades} trades`,         icon: TrendingUp,  highlight: data.net_pnl >= 0 ? 'green' : 'red' },
    { title: 'Win Rate',      value: `${data.win_rate}%`,         hint: `${data.wins} wins · ${data.losses} losses`, icon: Target,      highlight: data.win_rate >= 50 ? 'green' : 'red' },
    { title: 'Profit Factor', value: data.profit_factor != null ? `${data.profit_factor}x` : '—', hint: 'Gross profit / gross loss', icon: Activity, highlight: (data.profit_factor ?? 0) >= 1.5 ? 'green' : (data.profit_factor ?? 0) >= 1 ? 'neutral' : 'red' },
    { title: 'Expectancy',    value: fmt(data.expectancy),        hint: 'Avg $ per trade',                           icon: DollarSign,  highlight: data.expectancy >= 0 ? 'green' : 'red' },
    { title: 'Avg Win',       value: fmt(data.avg_win),           hint: `${data.wins} winning trades`,               icon: CheckCircle2, highlight: 'green' },
    { title: 'Avg Loss',      value: fmt(data.avg_loss ? -data.avg_loss : 0), hint: `${data.losses} losing trades`, icon: Clock3,      highlight: 'red' },
    { title: 'Avg R:R',       value: data.avg_rr != null ? `1:${data.avg_rr}` : '—', hint: 'Average risk/reward',  icon: LineChart,   highlight: 'neutral' },
    { title: 'Gross Profit',  value: fmt(data.gross_profit),      hint: 'Total from winners',                        icon: TrendingUp,  highlight: 'green' },
    { title: 'Gross Loss',    value: fmt(-data.gross_loss),       hint: 'Total from losers',                         icon: ShieldCheck, highlight: 'red' },
    { title: 'Best Trade',    value: fmt(data.best_trade),        hint: 'Highest single result',                     icon: Zap,         highlight: 'green' },
    { title: 'Worst Trade',   value: fmt(data.worst_trade),       hint: 'Lowest single result',                      icon: LineChart,   highlight: 'red' },
    { title: 'Std Deviation', value: fmt(data.result_stddev),     hint: 'Result consistency',                        icon: BarChart3,   highlight: 'neutral' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => (
          <MetricCard key={m.title} {...m as any} />
        ))}
      </div>

      {/* Profit Factor explanation */}
      {data.profit_factor !== null && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Profit Factor</p>
                <p className={`text-3xl font-bold font-heading ${data.profit_factor >= 1.5 ? 'text-emerald-500' : data.profit_factor >= 1 ? 'text-amber-500' : 'text-red-500'}`}>
                  {data.profit_factor}x
                </p>
              </div>
              <div className="flex-1 text-sm text-muted-foreground">
                {data.profit_factor >= 2
                  ? '🟢 Excellent — for every $1 lost, you make $' + data.profit_factor
                  : data.profit_factor >= 1.5
                  ? '🟡 Good — consistent edge. Keep it above 1.5x.'
                  : data.profit_factor >= 1
                  ? '🟠 Marginal — profitable but thin edge. Focus on cutting losses.'
                  : '🔴 Below 1 — losing more than winning. Review your setups.'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
