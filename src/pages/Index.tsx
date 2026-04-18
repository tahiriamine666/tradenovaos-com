import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import TradeVault from '@/pages/TradeVault';
import PlaybookLab from '@/pages/PlaybookLab';
import {
  BarChart3, BookOpen, Brain, CalendarDays, CheckCircle2,
  ChevronLeft, ChevronRight, CircleDollarSign, Clock3,
  FileBarChart, LayoutDashboard, LineChart, LogOut, Moon, PlayCircle,
  Settings, ShieldCheck, Sun, Target, TrendingUp, Upload, Zap,
} from 'lucide-react';
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

const resources = [
  'How to build a daily trading plan',
  'Top 7 mistakes killing your consistency',
  'Replay drills for breakout traders',
  'Risk model for funded account challenges',
];

function formatMoney(val: number): string {
  const prefix = val >= 0 ? '+' : '';
  return `${prefix}$${Math.abs(val).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function EdgeAnalytics({ dark, user }: { dark: boolean; user: any }) {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', user.id);
      setTrades(data ?? []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const metrics = useMemo(() => {
    const wins = trades.filter(t => (t.result ?? 0) > 0);
    const losses = trades.filter(t => (t.result ?? 0) < 0);
    const totalPnl = trades.reduce((s, t) => s + (t.result ?? 0), 0);
    const winRate = trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0;
    const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + (t.result ?? 0), 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + (t.result ?? 0), 0) / losses.length : 0;
    const best = trades.length > 0 ? Math.max(...trades.map(t => t.result ?? 0)) : 0;
    const worst = trades.length > 0 ? Math.min(...trades.map(t => t.result ?? 0)) : 0;

    const bySide: Record<string, { count: number; pnl: number }> = {};
    const bySetup: Record<string, { count: number; pnl: number; wins: number }> = {};
    trades.forEach(t => {
      const side = (t.side || 'Unknown').toLowerCase();
      if (!bySide[side]) bySide[side] = { count: 0, pnl: 0 };
      bySide[side].count++;
      bySide[side].pnl += t.result ?? 0;

      const setup = t.setup?.trim();
      if (setup) {
        if (!bySetup[setup]) bySetup[setup] = { count: 0, pnl: 0, wins: 0 };
        bySetup[setup].count++;
        bySetup[setup].pnl += t.result ?? 0;
        if ((t.result ?? 0) > 0) bySetup[setup].wins++;
      }
    });

    return { totalPnl, winRate, avgWin, avgLoss, best, worst, winsCount: wins.length, lossesCount: losses.length, bySide, bySetup };
  }, [trades]);

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <SectionTitle title="Edge Analytics" subtitle="Discover what's working and what's not" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      </motion.div>
    );
  }

  if (trades.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <SectionTitle title="Edge Analytics" subtitle="Discover what's working and what's not" />
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6 text-center py-12">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No trades yet. Add trades in Trade Vault to see analytics.</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <SectionTitle title="Edge Analytics" subtitle="Discover what's working and what's not" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total P&L" value={formatMoney(metrics.totalPnl)} hint={`From ${trades.length} trades`} icon={TrendingUp} dark={dark} />
        <MetricCard title="Win Rate" value={`${metrics.winRate}%`} hint={`${metrics.winsCount} winning trades`} icon={Target} dark={dark} />
        <MetricCard title="Average Win" value={formatMoney(metrics.avgWin)} hint={`${metrics.winsCount} trades`} icon={CheckCircle2} dark={dark} />
        <MetricCard title="Average Loss" value={formatMoney(metrics.avgLoss)} hint={`${metrics.lossesCount} trades`} icon={Clock3} dark={dark} />
        <MetricCard title="Best Trade" value={formatMoney(metrics.best)} hint="Highest result" icon={TrendingUp} dark={dark} />
        <MetricCard title="Worst Trade" value={formatMoney(metrics.worst)} hint="Lowest result" icon={LineChart} dark={dark} />
        <MetricCard title="Winning Trades" value={`${metrics.winsCount}`} hint={`of ${trades.length} total`} icon={CheckCircle2} dark={dark} />
        <MetricCard title="Losing Trades" value={`${metrics.lossesCount}`} hint={`of ${trades.length} total`} icon={ShieldCheck} dark={dark} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="font-heading">Performance by Side</CardTitle><CardDescription>Long vs Short breakdown</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(metrics.bySide).map(([side, data]) => (
              <div key={side} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">{side}</p>
                  <p className="text-xs text-muted-foreground">{data.count} trades</p>
                </div>
                <p className={cx('text-sm font-semibold', data.pnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                  {formatMoney(data.pnl)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="font-heading">Performance by Setup</CardTitle><CardDescription>P&L grouped by setup type</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(metrics.bySetup).length === 0 ? (
              <p className="text-sm text-muted-foreground">No setup data available. Tag your trades with setups to see this breakdown.</p>
            ) : (
              Object.entries(metrics.bySetup).map(([setup, data]) => (
                <div key={setup} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">{setup}</p>
                    <p className="text-xs text-muted-foreground">{data.count} trades · {Math.round((data.wins / data.count) * 100)}% win rate</p>
                  </div>
                  <p className={cx('text-sm font-semibold', data.pnl >= 0 ? 'text-emerald-500' : 'text-red-500')}>
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


const sidebarItems = [
  { id: 'dashboard', label: 'Command Center', icon: LayoutDashboard },
  { id: 'plan', label: 'Trade Plan', icon: CalendarDays },
  { id: 'trades', label: 'Trade Vault', icon: CircleDollarSign },
  { id: 'journal', label: 'Mind Journal', icon: BookOpen },
  { id: 'analytics', label: 'Edge Analytics', icon: BarChart3 },
  { id: 'playbooks', label: 'Playbook Lab', icon: Target },
  { id: 'replay', label: 'Replay Studio', icon: PlayCircle },
  { id: 'resources', label: 'Learning Hub', icon: Brain },
  { id: 'settings', label: 'Studio Settings', icon: Settings },
];

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
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayMap, setDayMap] = useState<Record<number, { pnl: number; trades: number }>>({});
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthLabel = new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  useEffect(() => {
    if (!user) return;
    const fetchCalendarData = async () => {
      setLoading(true);
      const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
      const { data } = await supabase
        .from('trades')
        .select('trade_date, result')
        .eq('user_id', user.id)
        .gte('trade_date', monthStart)
        .lte('trade_date', monthEnd);

      const grouped: Record<number, { pnl: number; trades: number }> = {};
      (data ?? []).forEach((t) => {
        const day = new Date(t.trade_date).getDate();
        if (!grouped[day]) grouped[day] = { pnl: 0, trades: 0 };
        grouped[day].pnl += t.result ?? 0;
        grouped[day].trades += 1;
      });
      setDayMap(grouped);
      setLoading(false);
    };
    fetchCalendarData();
  }, [user, year, month, daysInMonth]);

  const totalCells = Math.ceil((firstDayOfWeek + daysInMonth) / 7) * 7;

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading">Trading Calendar</CardTitle>
            <CardDescription>Monthly P&L and trade activity</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium text-foreground">{monthLabel}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
          ))}
        </div>
        {loading ? (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 35 }).map((_, i) => <Skeleton key={i} className="h-[70px] rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: totalCells }, (_, i) => {
              const dayNumber = i - firstDayOfWeek + 1;
              const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
              const entry = inMonth ? dayMap[dayNumber] : undefined;
              const positive = (entry?.pnl ?? 0) > 0;
              const negative = (entry?.pnl ?? 0) < 0;
              return (
                <div key={i} className={cx(
                  'rounded-lg p-2 min-h-[70px] text-xs transition-colors',
                  !inMonth && 'opacity-0',
                  entry && positive && (dark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'),
                  entry && negative && (dark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'),
                  inMonth && !entry && 'bg-muted/30',
                )}>
                  {inMonth && (
                    <>
                      <p className="font-medium text-muted-foreground">{dayNumber}</p>
                      {entry && (
                        <div className="mt-1">
                          <p className={cx('font-semibold text-[11px]', positive ? 'text-emerald-500' : 'text-red-500')}>
                            {entry.pnl > 0 ? '+' : ''}${entry.pnl}
                          </p>
                          <p className="text-muted-foreground text-[10px]">{entry.trades} trades</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" /> Profit Day</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" /> Loss Day</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TradingDashboard() {
  const [active, setActive] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const dark = theme === 'dark';
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const [dashLoading, setDashLoading] = useState(true);
  const [allTrades, setAllTrades] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setDashLoading(true);
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', user.id)
      .order('trade_date', { ascending: false });

    if (!error && data) setAllTrades(data);
    setDashLoading(false);
  }, [user]);

  const { totalPnl, tradesCount, winRate, recentTrades, equityData, setupData } = useMemo(() => {
    const pnl = allTrades.reduce((sum, t) => sum + (t.result ?? 0), 0);
    const wins = allTrades.filter((t) => (t.result ?? 0) > 0).length;
    const wr = allTrades.length > 0 ? Math.round((wins / allTrades.length) * 100) : 0;

    // Equity curve: ascending by trade_date, cumulative result
    const ascending = [...allTrades].sort((a, b) => {
      const da = new Date(a.trade_date).getTime();
      const db = new Date(b.trade_date).getTime();
      return da - db;
    });
    let cum = 0;
    const equity = ascending.map((t) => {
      cum += t.result ?? 0;
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
      setupMap[name] = (setupMap[name] ?? 0) + (t.result ?? 0);
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
  }, [dark]);

  const filteredResources = useMemo(
    () => resources.filter((r) => r.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const chartPrimary = '#7c3aed';
  const chartSuccess = '#22c55e';

  return (
    <div className={cx('flex h-screen overflow-hidden font-body', dark ? 'dark' : '')}>
      {/* Sidebar */}
      <aside className={cx(
        'w-72 flex-shrink-0 flex flex-col border-r overflow-y-auto',
        dark ? 'bg-sidebar border-border' : 'bg-sidebar border-border'
      )}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-heading font-bold text-foreground">TradeNova</p>
              <p className="text-xs text-muted-foreground">Focused trading workspace</p>
            </div>
          </div>

          <nav className="space-y-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const selected = active === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all',
                    selected && 'bg-primary text-primary-foreground shadow-lg shadow-primary/20',
                    !selected && 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6">
          <div className="rounded-xl bg-primary/10 p-4">
            <p className="font-heading font-semibold text-sm text-foreground">Upgrade to Pro</p>
            <p className="text-xs text-muted-foreground mt-1">Unlock replay, AI insights, and imports</p>
            <Button size="sm" className="mt-3 w-full rounded-xl">Start 14-day trial</Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-8 py-4 border-b">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-heading font-bold text-foreground">Dashboard</h1>
            <Badge className="bg-primary/10 text-primary border-0">Pro</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="rounded-lg font-normal">
              <Clock3 className="h-3 w-3 mr-1" /> Mar 1 - Mar 31
            </Badge>
            <Badge variant="outline" className="rounded-lg font-normal">
              <ShieldCheck className="h-3 w-3 mr-1" /> Main Account
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(dark ? 'light' : 'dark')}
              className="rounded-xl"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button className="rounded-xl">+ New Trade</Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="rounded-xl" title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {active === 'dashboard' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {dashLoading ? (
                  <>
                    {[1,2,3,4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
                  </>
                ) : (
                  <>
                    <MetricCard title="Total P&L" value={`${totalPnl >= 0 ? '+' : ''}$${totalPnl.toLocaleString()}`} hint={`From ${tradesCount} trades`} icon={TrendingUp} dark={dark} />
                    <MetricCard title="Win Rate" value={`${winRate}%`} hint={`${Math.round(tradesCount * winRate / 100)} of ${tradesCount} trades`} icon={Target} dark={dark} />
                    <MetricCard title="Avg RR" value="—" hint="No RR field yet" icon={LineChart} dark={dark} />
                    <MetricCard title="Trades" value={`${tradesCount}`} hint="Total trades" icon={FileBarChart} dark={dark} />
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-heading">Equity Curve</CardTitle>
                    <CardDescription>Weekly growth snapshot</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <AreaChart data={equityData}>
                        <defs>
                          <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={chartPrimary} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={chartPrimary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#ffffff10' : '#00000010'} />
                        <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke={dark ? '#ffffff30' : '#00000030'} />
                        <YAxis tick={{ fontSize: 12 }} stroke={dark ? '#ffffff30' : '#00000030'} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke={chartPrimary} fill="url(#eqGrad)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-heading">Today Focus</CardTitle>
                    <CardDescription>Plan vs execution guidance</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Bias</p>
                      <p className="text-sm text-foreground">Bullish on Nasdaq pullbacks</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Rule adherence</span>
                        <span className="font-medium text-foreground">84%</span>
                      </div>
                      <Progress value={84} className="h-2" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">AI hint</p>
                      <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mt-1">
                        You perform best when you wait for confirmed pullbacks after 10:00 AM. Avoid first candle entries.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading">Trader Score</CardTitle>
                  <CardDescription>Overall performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-4">
                    {[
                      { label: 'Win %', value: 62 },
                      { label: 'RR', value: 78 },
                      { label: 'Discipline', value: 85 },
                      { label: 'Execution', value: 72 },
                      { label: 'Consistency', value: 68 },
                    ].map((item) => (
                      <div key={item.label} className="text-center">
                        <p className="text-xs text-muted-foreground mb-2">{item.label}</p>
                        <p className="text-2xl font-bold font-heading text-primary">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <TradingCalendar dark={dark} />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-heading">Recent Trades</CardTitle>
                    <CardDescription>Execution log preview</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {dashLoading ? (
                      <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-10 rounded" />)}</div>
                    ) : recentTrades.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No trades yet. Add your first trade in Trade Vault.</p>
                    ) : (
                      recentTrades.map((trade) => {
                        const res = trade.result ?? 0;
                        return (
                          <div key={trade.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                            <div>
                              <p className="font-medium text-sm text-foreground">{trade.pair}</p>
                              <p className="text-xs text-muted-foreground">{trade.side ?? '—'} · {trade.trade_date}</p>
                            </div>
                            <p className={cx('text-sm font-semibold', res >= 0 ? 'text-emerald-500' : 'text-red-500')}>
                              {res >= 0 ? '+' : ''}${res}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                  <CardHeader>
                    <CardTitle className="font-heading">Best Performing Setups</CardTitle>
                    <CardDescription>By frequency this month</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={setupData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={dark ? '#ffffff10' : '#00000010'} />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke={dark ? '#ffffff30' : '#00000030'} />
                        <YAxis tick={{ fontSize: 12 }} stroke={dark ? '#ffffff30' : '#00000030'} />
                        <Tooltip />
                        <Bar dataKey="value" fill={chartPrimary} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {active === 'plan' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <SectionTitle title="Trade Plan" subtitle="Pre-market structure before execution" />
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <Tabs defaultValue="focus">
                    <TabsList className="mb-4">
                      <TabsTrigger value="focus">Focus</TabsTrigger>
                      <TabsTrigger value="risk">Risk</TabsTrigger>
                      <TabsTrigger value="review">Review</TabsTrigger>
                    </TabsList>
                    <TabsContent value="focus" className="space-y-4">
                      <div><p className="text-xs font-medium text-muted-foreground">Market Bias</p><p className="text-sm text-foreground">Bullish continuation on tech indices</p></div>
                      <div><p className="text-xs font-medium text-muted-foreground">Watchlist</p><p className="text-sm text-foreground">NASDAQ, EURUSD, XAUUSD</p></div>
                      <div><p className="text-xs font-medium text-muted-foreground">Setups to Trade</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline">Pullback</Badge>
                          <Badge variant="outline">Opening Range</Badge>
                          <Badge variant="outline">Liquidity Sweep</Badge>
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="risk" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div><p className="text-xs text-muted-foreground">Daily max loss</p><p className="font-semibold text-foreground">-$250</p></div>
                        <div><p className="text-xs text-muted-foreground">Risk per trade</p><p className="font-semibold text-foreground">0.5%</p></div>
                      </div>
                      <div><p className="text-xs font-medium text-muted-foreground">Execution Rules</p>
                        <ul className="text-sm text-foreground mt-1 space-y-1 list-disc list-inside">
                          <li>Only take A and B setups</li>
                          <li>No trades in first 5 minutes</li>
                          <li>Stop after 2 consecutive losses</li>
                        </ul>
                      </div>
                    </TabsContent>
                    <TabsContent value="review" className="space-y-4">
                      <div><p className="text-xs font-medium text-muted-foreground">Plan vs Actual</p><p className="text-sm text-foreground">3 of 4 trades matched your predefined setups.</p></div>
                      <div><p className="text-xs font-medium text-muted-foreground">Next Improvement</p><p className="text-sm text-foreground">Wait for retest confirmation before breakouts.</p></div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading">Session Checklist</CardTitle>
                  <CardDescription>Keep discipline visible</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {['Define bias', 'Set max loss', 'Mark key levels', 'Choose top 2 setups', 'Review yesterday mistakes'].map((item) => (
                    <div key={item} className="flex items-center gap-3">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      <span className="text-sm text-foreground">{item}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {active === 'trades' && <TradeVault />}

          {active === 'journal' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <SectionTitle title="Mind Journal" subtitle="Capture emotions, mistakes, and lessons" />
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-6 space-y-4">
                  <div><p className="text-xs font-medium text-muted-foreground">Mood</p><p className="text-sm text-foreground">Focused before session, slightly impatient after first loss.</p></div>
                  <div><p className="text-xs font-medium text-muted-foreground">Mistakes</p><p className="text-sm text-foreground">Entered one breakout before candle close confirmation.</p></div>
                  <div><p className="text-xs font-medium text-muted-foreground">Lesson</p><p className="text-sm text-foreground">Wait for retest on momentum setups when volatility is high.</p></div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="font-heading">AI Review Summary</CardTitle>
                  <CardDescription>Future premium workflow</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
                    Your best trade came when you respected your pullback playbook and sized correctly. Your weakest trade came from rushing the breakout.
                  </p>
                  <div><p className="text-xs font-medium text-muted-foreground">Suggested action</p><p className="text-sm text-foreground">Reduce breakout frequency by 30% this week and focus on pullbacks only.</p></div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {active === 'analytics' && <EdgeAnalytics dark={dark} user={user} />}

          {active === 'playbooks' && <PlaybookLab />}

          {active === 'replay' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <SectionTitle title="Replay Studio" subtitle="Manual simulation concept" />
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4 p-6 rounded-xl bg-muted/50">
                    <PlayCircle className="h-10 w-10 text-primary" />
                    <div>
                      <p className="font-heading font-semibold text-foreground">Chart playback module</p>
                      <p className="text-sm text-muted-foreground">Future phase: candle-by-candle replay, simulated entries, notes, and scorecard exports.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardHeader><CardTitle className="font-heading">Session Goals</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {['Practice only opening range breakouts', 'Record each simulated trade', 'Score execution after each session'].map((item) => (
                    <p key={item} className="text-sm text-foreground flex items-center gap-2"><Target className="h-4 w-4 text-primary" />{item}</p>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {active === 'resources' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <SectionTitle title="Learning Hub" subtitle="Guides, drills, and educational content" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search lessons, drills, and guides..."
                className="rounded-xl max-w-md"
              />
              <div className="space-y-3">
                {filteredResources.map((item) => (
                  <Card key={item} className="border-0 shadow-sm">
                    <CardContent className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm text-foreground">{item}</p>
                        <p className="text-xs text-muted-foreground">Structured learning content for traders who want better process and discipline.</p>
                      </div>
                      <Button variant="ghost" size="sm"><ChevronRight className="h-4 w-4" /></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

          {active === 'settings' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <SectionTitle title="Studio Settings" subtitle="Your workspace profile" />
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary text-primary-foreground font-heading text-xl">AT</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-heading font-bold text-foreground text-lg">Amine Trader</p>
                      <p className="text-sm text-muted-foreground">Pro plan preview</p>
                    </div>
                  </div>
                  <Separator className="my-6" />
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-muted-foreground text-xs">Timezone</p><p className="text-foreground">UTC+1</p></div>
                    <div><p className="text-muted-foreground text-xs">Default Risk</p><p className="text-foreground">0.5% per trade</p></div>
                    <div><p className="text-muted-foreground text-xs">Preferred Market</p><p className="text-foreground">NASDAQ, XAUUSD</p></div>
                    <div><p className="text-muted-foreground text-xs">Account Type</p><p className="text-foreground">Funded Challenge</p></div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
