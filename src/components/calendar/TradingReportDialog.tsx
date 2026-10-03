import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Lightbulb, Activity, TrendingUp, Target, Layers } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { cn } from '@/lib/utils';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';

interface Props {
  period: ReportPeriod | null;
  anchor: Date;
  onClose: () => void;
}

function money(v: number): string {
  const sign = v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function rangeFor(period: ReportPeriod, anchor: Date): { start: Date; end: Date; label: string } {
  const y = anchor.getFullYear();
  const m = anchor.getMonth();
  if (period === 'daily') {
    const d = new Date(y, m, anchor.getDate());
    return { start: d, end: d, label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) };
  }
  if (period === 'weekly') {
    const start = new Date(y, m, anchor.getDate() - anchor.getDay());
    const end = new Date(y, m, start.getDate() + 6);
    return {
      start,
      end,
      label: `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`,
    };
  }
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return { start, end, label: start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) };
}

const TITLES: Record<ReportPeriod, string> = {
  daily: 'Daily Trading Report',
  weekly: 'Weekly Trading Report',
  monthly: 'Monthly Trading Report',
};

export default function TradingReportDialog({ period, anchor, onClose }: Props) {
  const { user } = useAuth();
  const { activeAccountId, version } = useActiveAccount();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => (period ? rangeFor(period, anchor) : null), [period, anchor]);

  useEffect(() => {
    if (!user || !period || !range) return;
    let alive = true;
    (async () => {
      setLoading(true);
      let q = supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id)
        .gte('trade_date', toKey(range.start))
        .lte('trade_date', toKey(range.end));
      if (activeAccountId) q = q.eq('trading_account_id', activeAccountId);
      const { data } = await q;
      if (!alive) return;
      setTrades(data ?? []);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [user, period, range, activeAccountId, version]);

  const stats = useMemo(() => {
    const pnlOf = (t: any) => Number(t.result ?? 0);
    const total = trades.reduce((s, t) => s + pnlOf(t), 0);
    const wins = trades.filter((t) => pnlOf(t) > 0);
    const losses = trades.filter((t) => pnlOf(t) < 0);
    const winRate = trades.length ? (wins.length / trades.length) * 100 : 0;
    const avgWin = wins.length ? wins.reduce((s, t) => s + pnlOf(t), 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, t) => s + pnlOf(t), 0) / losses.length : 0;
    const rr = avgLoss !== 0 ? Math.abs(avgWin / avgLoss) : 0;
    const best = trades.reduce((b, t) => (pnlOf(t) > pnlOf(b ?? t) ? t : b), trades[0]);
    const worst = trades.reduce((b, t) => (pnlOf(t) < pnlOf(b ?? t) ? t : b), trades[0]);

    const byDay = new Map<string, number>();
    trades.forEach((t) => byDay.set(t.trade_date, (byDay.get(t.trade_date) ?? 0) + pnlOf(t)));
    let bestDay = '—', worstDay = '—', bestDayVal = -Infinity, worstDayVal = Infinity;
    byDay.forEach((v, k) => {
      if (v > bestDayVal) { bestDayVal = v; bestDay = k; }
      if (v < worstDayVal) { worstDayVal = v; worstDay = k; }
    });

    const byPair = new Map<string, { count: number; pnl: number }>();
    trades.forEach((t) => {
      const cur = byPair.get(t.pair) ?? { count: 0, pnl: 0 };
      cur.count += 1; cur.pnl += pnlOf(t);
      byPair.set(t.pair, cur);
    });
    const pairs = [...byPair.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);

    const disciplineScores = trades.map((t) => Number(t.discipline_score ?? 0)).filter((n) => n > 0);
    const avgDiscipline = disciplineScores.length
      ? disciplineScores.reduce((s, n) => s + n, 0) / disciplineScores.length
      : 0;
    const ruleBreaks = trades.reduce((s, t) => s + ((t.mistakes ?? []).length ? 1 : 0), 0);

    const insights: string[] = [];
    if (trades.length === 0) insights.push('No trades logged in this period — log your trades to unlock insights.');
    else {
      insights.push(`${winRate >= 50 ? 'Strong' : 'Low'} win rate at ${winRate.toFixed(1)}% across ${trades.length} trade${trades.length > 1 ? 's' : ''}.`);
      insights.push(`${total >= 0 ? 'Profitable' : 'Negative'} period with ${money(total)} net result.`);
      if (rr) insights.push(`Average risk/reward of ${rr.toFixed(2)}:1 between wins and losses.`);
      if (pairs[0]) insights.push(`Heaviest concentration on ${pairs[0][0]} (${pairs[0][1].count} trades).`);
      if (avgDiscipline) insights.push(`${avgDiscipline >= 7 ? 'Strong' : 'Weak'} psychological discipline with avg score ${avgDiscipline.toFixed(1)}/10.`);
      if (ruleBreaks) insights.push(`${ruleBreaks} trade${ruleBreaks > 1 ? 's' : ''} logged with mistakes — review your rules.`);
    }

    return {
      total, winRate, rr, count: trades.length, avgWin, avgLoss,
      best: best ? pnlOf(best) : 0, worst: worst ? pnlOf(worst) : 0,
      bestDay, worstDay, pairs, avgDiscipline, ruleBreaks, insights,
    };
  }, [trades]);

  if (!period || !range) return null;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            {TITLES[period]}
          </DialogTitle>
          <DialogDescription>{range.label}</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile icon={TrendingUp} label="Total P&L" value={money(stats.total)} tone={stats.total >= 0 ? 'success' : 'danger'} />
              <StatTile icon={Target} label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} hint={`${trades.filter((t) => Number(t.result ?? 0) > 0).length} W / ${trades.filter((t) => Number(t.result ?? 0) < 0).length} L`} />
              <StatTile icon={Activity} label="Risk / Reward" value={`${stats.rr.toFixed(2)}:1`} />
              <StatTile icon={Layers} label="Total Trades" value={String(stats.count)} hint={`${new Set(trades.map((t) => t.trade_date)).size} active day(s)`} />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="border-border bg-card shadow-none">
                <CardContent className="p-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Lightbulb className="h-4 w-4 text-primary" /> Key Insights
                  </p>
                  <div className="space-y-2">
                    {stats.insights.map((ins) => (
                      <div key={ins} className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-foreground">
                        {ins}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-none">
                <CardContent className="p-5">
                  <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Activity className="h-4 w-4 text-primary" /> Performance Metrics
                  </p>
                  <div className="space-y-3">
                    {[
                      ['Average Win', money(stats.avgWin), stats.avgWin >= 0],
                      ['Average Loss', money(stats.avgLoss), false],
                      ['Best Trade', money(stats.best), stats.best >= 0],
                      ['Worst Trade', money(stats.worst), stats.worst >= 0],
                      ['Best Day', stats.bestDay, true],
                      ['Worst Day', stats.worstDay, true],
                    ].map(([label, value, positive]) => (
                      <div key={String(label)} className="flex items-center justify-between border-b border-border pb-2 text-xs last:border-0 last:pb-0">
                        <span className="text-muted-foreground">{label}</span>
                        <span className={cn('font-mono font-semibold', typeof value === 'string' && value.startsWith('$') || typeof value === 'string' && value.startsWith('-$') ? (positive ? 'text-success' : 'text-danger') : 'text-foreground')}>
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-none">
                <CardContent className="p-5">
                  <p className="mb-3 text-sm font-semibold text-foreground">Most Traded Pairs</p>
                  {stats.pairs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No trades in this period.</p>
                  ) : (
                    <div className="space-y-3">
                      {stats.pairs.map(([pair, v]) => (
                        <div key={pair} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{pair}</span>
                          <span className="text-muted-foreground">{v.count} trades</span>
                          <span className={cn('font-mono font-semibold', v.pnl >= 0 ? 'text-success' : 'text-danger')}>{money(v.pnl)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border bg-card shadow-none">
                <CardContent className="p-5">
                  <p className="mb-3 text-sm font-semibold text-foreground">Trading Discipline</p>
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">Average Discipline Score</span>
                      <span className="font-mono font-semibold text-foreground">{stats.avgDiscipline ? `${stats.avgDiscipline.toFixed(1)}/10` : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <span className="text-muted-foreground">Trades With Mistakes</span>
                      <span className="font-mono font-semibold text-foreground">{stats.ruleBreaks}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Rule Compliance</span>
                      <span className="font-mono font-semibold text-foreground">
                        {stats.count ? `${Math.round(((stats.count - stats.ruleBreaks) / stats.count) * 100)}%` : '—'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StatTile({ icon: Icon, label, value, hint, tone }: {
  icon: typeof Activity; label: string; value: string; hint?: string; tone?: 'success' | 'danger';
}) {
  return (
    <Card className="border-border bg-card shadow-none">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <p className="text-[11px] text-muted-foreground">{label}</p>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <p className={cn('mt-2 font-mono text-xl font-bold',
          tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-primary')}>
          {value}
        </p>
        {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
