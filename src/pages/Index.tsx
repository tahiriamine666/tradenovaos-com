import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import TradeVault from '@/pages/TradeVault';
import PlaybookLab from '@/pages/PlaybookLab';
import MindJournal from '@/pages/MindJournal';
import StudioSettings from '@/pages/StudioSettings';
import ReplayStudio from '@/pages/ReplayStudio';
import TradePlan from '@/pages/TradePlan';
import AIInsights from '@/pages/AIInsights';
import PricingPage from '@/pages/PricingPage';
import { TradeDialogProvider, useTradeDialog, useTradesChanged, useNavigationEvent } from '@/contexts/TradeDialogContext';
import LearningHub from '@/pages/LearningHub';
import TraderScore from '@/components/TraderScore';
import CSVImport from '@/components/CSVImport';
import AppLayout, { BASE_ITEMS, ADMIN_ITEM } from '@/components/AppLayout';
import AdminPanel from '@/pages/AdminPanel';
const sidebarItems = [...BASE_ITEMS, ADMIN_ITEM];
import TopBar from '@/components/TopBar';
import { GlobalFiltersProvider } from '@/contexts/GlobalFiltersContext';
import AnalyticsMetrics from '@/components/AnalyticsMetrics';
import CommandCenter from '@/components/CommandCenter';
import { getTradeDateDay } from '@/lib/dateUtils';
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

const resources = [
  {
    title: 'How to build a daily trading plan',
    summary: 'Structured learning content for traders who want better process and discipline.',
    body: 'A solid daily plan starts the night before. Define market bias, identify 2-3 key levels, choose your top setups, and set hard risk limits. During the session, review the plan every hour. After the session, score yourself on plan adherence — not P&L.',
  },
  {
    title: 'Top 7 mistakes killing your consistency',
    summary: 'Recognize the patterns that quietly destroy edge.',
    body: '1) Trading without a plan. 2) Revenge trading after a loss. 3) Moving stops further away. 4) Risking too much per trade. 5) Skipping journaling. 6) Switching strategies weekly. 7) No defined daily max loss. Address these and your equity curve smooths out fast.',
  },
  {
    title: 'Replay drills for breakout traders',
    summary: 'Train your eyes to wait for confirmation.',
    body: 'Pick 30 historical breakouts. For each, mark the breakout candle, the retest, and the continuation move. Practice waiting for the retest before entering. Score every replay 1-10 on patience and execution. Repeat daily for two weeks.',
  },
  {
    title: 'Risk model for funded account challenges',
    summary: 'Survive first, profit second.',
    body: 'Use 0.25%-0.5% risk per trade. Cap daily loss at 1.5%. Never risk more than 30% of your distance to drawdown. Take 2 trades max per session early on. Funded accounts reward consistency, not heroics.',
  },
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
      <AnalyticsMetrics />

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
        const day = getTradeDateDay(t.trade_date);
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

function TradingDashboardInner() {
  const [active, setActive] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window === 'undefined') return 'dark';
    const saved = window.localStorage.getItem('tn-theme');
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });
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
    try { window.localStorage.setItem('tn-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);

  const filteredResources = useMemo(
    () => resources.filter((r) => r.title.toLowerCase().includes(search.toLowerCase())),
    [search]
  );
  const [activeResource, setActiveResource] = useState<typeof resources[number] | null>(null);
  const { openNew: openNewTrade } = useTradeDialog();
  useTradesChanged(fetchDashboardData);
  useNavigationEvent(setActive);

  const chartPrimary = '#7c3aed';
  const chartSuccess = '#22c55e';

  return (
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
      <div className="space-y-8">
          {active === 'dashboard' && (
            <CommandCenter onNavigate={setActive} onAddTrade={openNewTrade} />
          )}

          {active === 'plan' && <TradePlan />}

          {active === 'trades' && <TradeVault />}

          {active === 'journal' && <MindJournal />}

          {active === 'analytics' && <EdgeAnalytics dark={dark} user={user} />}

          {active === 'playbooks' && <PlaybookLab />}

          {active === 'ai' && <AIInsights />}

          {active === 'replay' && <ReplayStudio />}

          {active === 'resources' && <LearningHub />}

          {active === 'settings' && <StudioSettings />}

          {active === 'pricing' && <PricingPage />}


          {active === 'import' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <CSVImport onImportComplete={fetchDashboardData} />
            </motion.div>
          )}
      </div>
    </AppLayout>
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
