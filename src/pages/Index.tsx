import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { supabase } from '@/integrations/supabase/client';
import TradeVault from '@/pages/TradeVault';
import TradeJournal from '@/pages/TradeJournal';
import StudioSettings from '@/pages/StudioSettings';
import TradePlanWorkspace from '@/components/tradeplan/TradePlanV2';
import NovaAI from '@/pages/NovaAI';
import { TradeDialogProvider, useTradeDialog, useTradesChanged, useNavigationEvent } from '@/contexts/TradeDialogContext';
import EconomicCalendar from '@/pages/EconomicCalendar';
import TraderScore from '@/components/TraderScore';

import AppLayout, { BASE_ITEMS, ADMIN_ITEM } from '@/components/AppLayout';
import WelcomeSplash from '@/components/WelcomeSplash';
import AdminPanel from '@/pages/AdminPanel';
const sidebarItems = [...BASE_ITEMS, ADMIN_ITEM];
import TopBar from '@/components/TopBar';
import { GlobalFiltersProvider } from '@/contexts/GlobalFiltersContext';
import AnalyticsMetrics from '@/components/AnalyticsMetrics';
import DashboardOverview from '@/components/DashboardOverview';
import { getTradeDateDay } from '@/lib/dateUtils';
import DayDetailsDialog from '@/components/calendar/DayDetailsDialog';
import TradingReportDialog, { type ReportPeriod } from '@/components/calendar/TradingReportDialog';
import {
  BarChart3, BookOpen, Brain, CalendarDays, CheckCircle2,
  ChevronLeft, ChevronRight, CircleDollarSign, Clock3,
  FileBarChart, LayoutDashboard, LineChart, LogOut, Moon, PlayCircle,
  Settings, ShieldCheck, Sun, Target, TrendingUp, Upload, Zap,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  AreaChart, Area, CartesianGrid, ResponsiveContainer,
  XAxis, YAxis, Tooltip, BarChart, Bar,
} from 'recharts';

import { formatMoney } from '@/lib/formatMoney';
import { loadTrades } from '@/lib/tradeData';
import { toast } from 'sonner';

function AnalyticsView({ dark, user }: { dark: boolean; user: any }) {
  const { activeAccountId, version } = useActiveAccount();
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      try { setTrades(await loadTrades(user.id, { accountId: activeAccountId, ascending: true })); }
      catch { setTrades([]); toast.error('Could not load all trades. Please reload to try again.'); }
      finally { setLoading(false); }
    };
    fetch();
  }, [user, activeAccountId, version]);

  const metrics = useMemo(() => {
    const pnlOf = (t: any) => Number(t.result ?? t.pnl ?? 0);
    const wins = trades.filter(t => pnlOf(t) > 0);
    const losses = trades.filter(t => pnlOf(t) < 0);
    const totalPnl = trades.reduce((s, t) => s + pnlOf(t), 0);
    const winRate = trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + pnlOf(t), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + pnlOf(t), 0) / losses.length : 0;
    const best = trades.length > 0 ? Math.max(...trades.map(pnlOf)) : 0;
    const worst = trades.length > 0 ? Math.min(...trades.map(pnlOf)) : 0;

    const bySide: Record<string, { count: number; pnl: number }> = {};
    const bySetup: Record<string, { count: number; pnl: number; wins: number }> = {};
    trades.forEach(t => {
      const p = pnlOf(t);
      const side = (t.side || 'Unknown').toLowerCase();
      if (!bySide[side]) bySide[side] = { count: 0, pnl: 0 };
      bySide[side].count++;
      bySide[side].pnl += p;

      const setup = t.setup?.trim();
      if (setup) {
        if (!bySetup[setup]) bySetup[setup] = { count: 0, pnl: 0, wins: 0 };
        bySetup[setup].count++;
        bySetup[setup].pnl += p;
        if (p > 0) bySetup[setup].wins++;
      }
    });

    let cumulative = 0;
    let rollingWins = 0;
    const trend = trades.map((trade, index) => {
      const pnl = pnlOf(trade);
      cumulative += pnl;
      if (pnl > 0) rollingWins += 1;
      return { label: new Date(`${trade.trade_date}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), pnl: cumulative, winRate: Math.round((rollingWins / (index + 1)) * 100) };
    });
    const grossProfit = wins.reduce((sum, trade) => sum + pnlOf(trade), 0);
    const grossLoss = Math.abs(losses.reduce((sum, trade) => sum + pnlOf(trade), 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    const avgRR = trades.filter((trade) => trade.rr).reduce((sum, trade) => sum + Number(trade.rr), 0) / Math.max(1, trades.filter((trade) => trade.rr).length);
    return { totalPnl, winRate, avgWin, avgLoss, best, worst, winsCount: wins.length, lossesCount: losses.length, bySide, bySetup, trend, profitFactor, avgRR };
  }, [trades]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <SectionTitle title="Analytics" subtitle="Discover what's working and what's not" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </motion.div>
    );
  }

  if (trades.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <SectionTitle title="Analytics" subtitle="Discover what's working and what's not" />
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 text-center py-12">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No trades yet. Add trades in your Journal to see analytics.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <SectionTitle title="Analytics" subtitle="Performance trends from your selected trading account" />
      <AnalyticsMetrics />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {[
          { title: 'Cumulative P&L', key: 'pnl', suffix: '$' },
          { title: 'Win Rate Trend', key: 'winRate', suffix: '%' },
        ].map((chart) => (
          <Card key={chart.key} className="border-border bg-card shadow-none">
            <CardHeader><CardTitle className="text-base">{chart.title}</CardTitle></CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.trend} margin={{ left: 0, right: 10, top: 8, bottom: 0 }}>
                  <defs><linearGradient id={`fill-${chart.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={24} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} axisLine={false} tickLine={false} width={46} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 6 }} formatter={(value: number) => [`${chart.suffix === '$' ? '$' : ''}${Number(value).toFixed(chart.key === 'pnl' ? 2 : 0)}${chart.suffix === '%' ? '%' : ''}`, chart.title]} />
                  <Area type="monotone" dataKey={chart.key} stroke="hsl(var(--primary))" fill={`url(#fill-${chart.key})`} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="font-heading">Performance by Side</CardTitle><CardDescription>Long vs Short breakdown</CardDescription></CardHeader>
          <CardContent>
            {Object.entries(metrics.bySide).map(([side, data]) => (
              <div key={side} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">{side}</p>
                  <p className="text-xs text-muted-foreground">{data.count} trades</p>
                </div>
                <p className={cx('text-sm font-bold tabular-nums', data.pnl >= 0 ? 'text-success' : 'text-danger')}>
                  {formatMoney(data.pnl)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="font-heading">Performance by Setup</CardTitle><CardDescription>P&L grouped by setup type</CardDescription></CardHeader>
          <CardContent>
            {Object.keys(metrics.bySetup).length === 0 ? (
              <p className="text-sm text-muted-foreground">No setup data available. Tag your trades with setups to see this breakdown.</p>
            ) : (
              Object.entries(metrics.bySetup).map(([setup, data]) => (
                <div key={setup} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{setup}</p>
                    <p className="text-xs text-muted-foreground">{data.count} trades · {Math.round((data.wins / data.count) * 100)}% win rate</p>
                  </div>
                  <p className={cx('text-sm font-bold tabular-nums', data.pnl >= 0 ? 'text-success' : 'text-danger')}>
                    {formatMoney(data.pnl)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
}


// sidebarItems now provided by AppLayout

function cx(...values: (string | boolean | undefined | null)[]) {
  return values.filter(Boolean).join(' ');
}

function MetricCard({ title, value, hint, icon: Icon, dark }: {
  title: string; value: string; hint: string; icon: React.ElementType; dark: boolean;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className={cx('border-0 shadow-sm', dark ? 'bg-card' : 'bg-card')}>
        <CardContent className="flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold font-heading text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{hint}</p>
          </div>
          <div className="rounded-xl bg-primary/10 p-3">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <h2 className="text-2xl font-bold font-heading text-foreground">{title}</h2>
        <p className="text-muted-foreground text-sm">{subtitle}</p>
      </motion.div>
    </div>
  );
}

function TradingCalendar({ dark }: { dark: boolean }) {
  const { user } = useAuth();
  const { activeAccountId, version } = useActiveAccount();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mode, setMode] = useState<'pnl' | 'psychology'>('pnl');
  const [dayMap, setDayMap] = useState<Record<number, { pnl: number; trades: number; discipline: number; wins: number }>>({});
  const [loading, setLoading] = useState(true);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [detailDate, setDetailDate] = useState<Date | null>(null);
  const [journalDays, setJournalDays] = useState<Set<number>>(new Set());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthLabel = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const [monthDir, setMonthDir] = useState<'next' | 'prev'>('next');
  const prevMonth = () => { setMonthDir('prev'); setCurrentDate(new Date(year, month - 1, 1)); };
  const nextMonth = () => { setMonthDir('next'); setCurrentDate(new Date(year, month + 1, 1)); };

  useEffect(() => {
    if (!user) return;
    const fetchCalendarData = async () => {
      setLoading(true);
      const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      try {
      const [data, { data: jd }] = await Promise.all([loadTrades(user.id, { accountId: activeAccountId, from: monthStart, to: monthEnd }), supabase.from('journal_entries').select('entry_date').eq('user_id', user.id).gte('entry_date', monthStart).lte('entry_date', monthEnd)]);
      setJournalDays(new Set((jd ?? []).map((r: any) => Number(String(r.entry_date).slice(8, 10)))));

      const grouped: Record<number, { pnl: number; trades: number; discipline: number; wins: number }> = {};
      (data ?? []).forEach((t) => {
        const day = getTradeDateDay(t.trade_date);
        if (!grouped[day]) grouped[day] = { pnl: 0, trades: 0, discipline: 0, wins: 0 };
        const r = (t as any).result ?? (t as any).pnl ?? 0;
        grouped[day].pnl += r;
        grouped[day].trades += 1;
        if (r > 0) grouped[day].wins += 1;
        grouped[day].discipline += Number((t as any).discipline_score ?? 0);
      });
      setDayMap(grouped);
      } catch { setDayMap({}); toast.error('Could not load the trading calendar. Please reload to try again.'); }
      finally { setLoading(false); }
    };
    fetchCalendarData();
  }, [user, year, month, daysInMonth, activeAccountId, version]);

  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;
  const monthSummary = Object.values(dayMap).reduce((summary, day) => ({
    pnl: summary.pnl + day.pnl,
    trades: summary.trades + day.trades,
    wins: summary.wins + (day.pnl > 0 ? 1 : 0),
    losses: summary.losses + (day.pnl < 0 ? 1 : 0),
    activeDays: summary.activeDays + 1,
  }), { pnl: 0, trades: 0, wins: 0, losses: 0, activeDays: 0 });

  const compactMoney = (v: number) => `${v > 0 ? '+' : v < 0 ? '-' : ''}$${Math.abs(Math.round(v)).toLocaleString()}`;
  const monthShort = new Date(year, month).toLocaleString('default', { month: 'short' });

  const weeks: { days: (number | null)[]; start: number; end: number; pnl: number; trades: number; wins: number }[] = [];
  for (let w = 0; w < totalCells / 7; w++) {
    const days: (number | null)[] = [];
    let pnl = 0, trades = 0, wins = 0, start = 0, end = 0;
    for (let d = 0; d < 7; d++) {
      const dayNumber = w * 7 + d - firstDayOfWeek + 1;
      const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
      days.push(inMonth ? dayNumber : null);
      if (inMonth) {
        if (!start) start = dayNumber;
        end = dayNumber;
        const e = dayMap[dayNumber];
        if (e) { pnl += e.pnl; trades += e.trades; wins += e.wins; }
      }
    }
    weeks.push({ days, start, end, pnl, trades, wins });
  }

  return (
    <div className="space-y-5">
      <SectionTitle title="Trading Calendar" subtitle="Track your daily performance and psychology" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
      <Card className="border-border bg-card shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="min-w-32 text-center text-sm font-semibold text-foreground">{monthLabel}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setCurrentDate(new Date())}>Today</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { setSelectedDay(new Date().getDate()); setReportPeriod('daily'); }}>Daily</Button>
            <Button size="sm" variant="outline" onClick={() => setReportPeriod('weekly')}>Weekly</Button>
            <Button size="sm" variant="outline" onClick={() => setReportPeriod('monthly')}>Monthly</Button>
            <Tabs value={mode} onValueChange={(value) => setMode(value as 'pnl' | 'psychology')}><TabsList><TabsTrigger value="pnl">$ P&L</TabsTrigger><TabsTrigger value="psychology">Psych</TabsTrigger></TabsList></Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_130px] gap-1.5 mb-1.5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Week'].map((day) => (
            <div key={day} className="text-center text-[11px] font-medium text-muted-foreground py-1.5">{day}</div>
          ))}
        </div>
        {loading ? (
          <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_130px] gap-1.5">
            {Array.from({ length: 40 }).map((_, i) => <Skeleton key={i} className="h-[86px] rounded-lg" />)}
          </div>
        ) : (
          <div key={`${year}-${month}`} className={cx('space-y-1.5', monthDir === 'next' ? 'month-slide-next' : 'month-slide-prev')}>
            {weeks.map((week, wi) => {
              const winRate = week.trades ? Math.round((week.wins / week.trades) * 100) : 0;
              return (
                <div key={wi} className="grid grid-cols-[repeat(7,minmax(0,1fr))_130px] gap-1.5">
                  {week.days.map((dayNumber, di) => {
                    const entry = dayNumber != null ? dayMap[dayNumber] : undefined;
                    const positive = (entry?.pnl ?? 0) > 0;
                    const negative = (entry?.pnl ?? 0) < 0;
                    return (
                      <div key={di}
                        onClick={() => { if (dayNumber != null) { setSelectedDay(dayNumber); setDetailDate(new Date(year, month, dayNumber)); } }}
                        className={cx(
                          'rounded-lg border border-border p-2 min-h-[86px] text-xs transition-colors flex flex-col',
                          dayNumber != null && 'cursor-pointer tn-lift',
                          dayNumber == null && 'opacity-0',
                          entry && positive && 'bg-primary/15 border-primary/30',
                          entry && negative && 'bg-danger/10 border-danger/25',
                          dayNumber != null && !entry && 'bg-muted/10',
                        )}>
                        {dayNumber != null && (
                          <>
                            <p className="font-medium text-muted-foreground flex items-center justify-between">{dayNumber}{journalDays.has(dayNumber) && <span title="Journal entry" className="text-[10px]">📝</span>}</p>
                            {entry && (
                              <div className="mt-auto space-y-0.5">
                                <p className="text-[10px] text-muted-foreground">{entry.trades}t</p>
                                <p className={cx('font-bold text-[11px] font-mono', mode === 'psychology' ? 'text-primary' : positive ? 'text-primary' : 'text-danger')}>
                                  {mode === 'pnl' ? compactMoney(entry.pnl) : `${entry.discipline ? Math.round(entry.discipline / entry.trades) : '—'}/10`}
                                </p>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                  <div className={cx(
                    'rounded-lg border p-2 min-h-[86px] text-[10px] flex flex-col justify-center gap-0.5',
                    week.trades ? 'border-primary/30 bg-primary/10' : 'border-border bg-muted/10',
                  )}>
                    <p className="font-semibold text-foreground text-[11px]">{monthShort} {week.start}-{week.end}</p>
                    {week.trades ? (
                      <>
                        <p className="text-muted-foreground">P&L <span className={cx('float-right font-mono font-bold', week.pnl >= 0 ? 'text-primary' : 'text-danger')}>{compactMoney(week.pnl)}</span></p>
                        <p className="text-muted-foreground">Win Rate <span className="float-right font-semibold text-foreground">{winRate}%</span></p>
                        <p className="text-muted-foreground">Trades <span className="float-right font-semibold text-foreground">{week.trades}</span></p>
                      </>
                    ) : (
                      <p className="text-muted-foreground/60">No trades</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">Day Results</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/20 border border-primary/30" /> Profit</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-danger/20 border border-danger/30" /> Loss</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-muted/20 border border-border" /> No activity</span>
        </div>
      </CardContent>
    </Card>
      <div className="space-y-3">
        <Card className="border-primary/30 bg-card shadow-[0_0_24px_hsl(var(--primary)/0.08)]"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Monthly P&L</p><p className={cx('mt-2 text-2xl font-bold font-mono', monthSummary.pnl >= 0 ? 'text-primary' : 'text-danger')}>{formatMoney(monthSummary.pnl)}</p></CardContent></Card>
        <Card className="border-border bg-card shadow-none"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Total Trades</p><p className="mt-2 text-2xl font-bold text-foreground">{monthSummary.trades}</p></CardContent></Card>
        <Card className="border-border bg-card shadow-none"><CardContent className="p-5"><p className="text-xs text-muted-foreground">Win/Loss Days</p><p className="mt-2 text-2xl font-bold text-foreground"><span className="text-primary">{monthSummary.wins}</span><span className="text-muted-foreground text-base"> / </span><span className="text-danger">{monthSummary.losses}</span></p><p className="mt-1 text-[10px] text-muted-foreground">Wins&nbsp;&nbsp;&nbsp;Loss</p></CardContent></Card>
        <Card className="border-border bg-card shadow-none"><CardContent className="space-y-3 p-5">{[
          ['Active Days', monthSummary.activeDays],
          ['Average Daily', monthSummary.activeDays ? formatMoney(monthSummary.pnl / monthSummary.activeDays) : '$0.00'],
        ].map(([label, value]) => <div key={label} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"><span className="text-xs text-muted-foreground">{label}</span><span className="text-sm font-semibold text-foreground">{value}</span></div>)}</CardContent></Card>
      </div>
      </div>
      <DayDetailsDialog date={detailDate} onClose={() => setDetailDate(null)} onDateChange={d => { setDetailDate(d); if (d.getMonth() !== month || d.getFullYear() !== year) setCurrentDate(new Date(d.getFullYear(), d.getMonth(), 1)); }} />
      <TradingReportDialog
        period={reportPeriod}
        anchor={reportPeriod === 'daily' ? new Date(year, month, selectedDay ?? 1) : new Date(year, month, Math.min(new Date().getDate(), daysInMonth))}
        onClose={() => setReportPeriod(null)}
      />
    </div>
  );
}

function TradingDashboardInner() {
  const reduceMotion = useReducedMotion();
  const [searchParams] = useSearchParams();
  const [activeRaw, setActiveRaw] = useState(() => searchParams.get('tab') === 'settings' ? 'settings' : 'dashboard');
  useEffect(() => { if (searchParams.get('tab') === 'settings') setActiveRaw('settings'); }, [searchParams]);
  const setActive = useCallback((v: string) => {
    if (v === 'pricing') { window.location.assign('/pricing'); return; }
    setActiveRaw(v);
  }, []);
  const active = activeRaw;
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const dark = theme === 'dark';
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const [dashLoading, setDashLoading] = useState(true);
  const [allTrades, setAllTrades] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setDashLoading(true);
    try { setAllTrades(await loadTrades(user.id)); }
    catch { setAllTrades([]); toast.error('Could not load all dashboard trades. Please reload to try again.'); }
    finally { setDashLoading(false); }
  }, [user]);

  const { totalPnl, tradesCount, winRate, recentTrades, equityData, setupData } = useMemo(() => {
    const pnlOf = (t: any) => Number(t.result ?? t.pnl ?? 0);
    const pnl = allTrades.reduce((sum, t) => sum + pnlOf(t), 0);
    const wins = allTrades.filter((t) => pnlOf(t) > 0).length;
    const wr = allTrades.length > 0 ? Math.round((wins / allTrades.length) * 100) : 0;

    // Equity curve: ascending by trade_date, cumulative result
    const ascending = [...allTrades].sort((a, b) => {
      const da = new Date(a.trade_date).getTime();
      const db = new Date(b.trade_date).getTime();
      return da - db;
    });
    let cum = 0;
    const equity = ascending.map((t) => {
      cum += pnlOf(t);
      const d = new Date(t.trade_date);
      const day = isNaN(d.getTime())
        ? String(t.trade_date)
        : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return { day, value: Number(cum.toFixed(2)) };
    });

    // Setup aggregation: total result per setup
    const setupMap: Record<string, number> = {};
    allTrades.forEach((t) => {
      const name = (t.setup && String(t.setup).trim()) || 'Unknown';
      setupMap[name] = (setupMap[name] ?? 0) + pnlOf(t);
    });
    const setups = Object.entries(setupMap)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);

    return {
      totalPnl: pnl,
      tradesCount: allTrades.length,
      winRate: wr,
      recentTrades: allTrades.slice(0, 5),
      equityData: equity,
      setupData: setups,
    };
  }, [allTrades]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { window.localStorage.setItem('tn-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);

  const { openNew: openNewTrade } = useTradeDialog();
  useTradesChanged(fetchDashboardData);
  useNavigationEvent(setActive);

  const chartPrimary = 'hsl(var(--primary))';
  const chartSuccess = 'hsl(var(--success))';

  return (
    <>
      <WelcomeSplash />
      <AppLayout
      active={active}
      onNavigate={setActive}
      dark={dark}
      onToggleTheme={() => setTheme(dark ? 'light' : 'dark')}
      onLogout={handleLogout}
      topBar={
        <TopBar
          dark={dark}
          onToggleTheme={() => setTheme(dark ? 'light' : 'dark')}
          onLogout={handleLogout}
          activePageLabel={sidebarItems.find(i => i.id === active)?.label ?? 'Dashboard'}
          onNavigate={setActive}
        />
      }
    >
      <motion.div
        key={active}
        initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.995 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-8"
      >
          {active === 'dashboard' && (
            <>
              <DashboardOverview onNavigate={setActive} onAddTrade={openNewTrade} />
              <TradingCalendar dark={dark} />
            </>
          )}

          {active === 'plan' && <TradePlanWorkspace />}

          {active === 'trades' && <TradeVault />}

          {active === 'journal' && <TradeJournal />}

          {active === 'analytics' && <AnalyticsView dark={dark} user={user} />}

          {active === 'ai' && <NovaAI />}

          {active === 'economic' && <EconomicCalendar />}


          {active === 'settings' && <StudioSettings />}

          {active === 'admin' && <AdminPanel />}




      </motion.div>
    </AppLayout>
    </>
  );
}

export default function TradingDashboard() {
  return (
    <TradeDialogProvider>
      <GlobalFiltersProvider>
        <TradingDashboardInner />
      </GlobalFiltersProvider>
    </TradeDialogProvider>
  );
}
