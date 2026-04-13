import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import TradeVault from '@/pages/TradeVault';
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

const equityData = [
  { day: 'Mon', value: 120 }, { day: 'Tue', value: 180 },
  { day: 'Wed', value: 160 }, { day: 'Thu', value: 260 },
  { day: 'Fri', value: 320 }, { day: 'Sat', value: 300 },
  { day: 'Sun', value: 380 },
];

const setupData = [
  { name: 'Breakout', value: 8 }, { name: 'Pullback', value: 14 },
  { name: 'Reversal', value: 5 }, { name: 'Scalp', value: 7 },
];

const trades = [
  { pair: 'NASDAQ', setup: 'Pullback', result: '+$320', grade: 'A', status: 'Followed plan' },
  { pair: 'EURUSD', setup: 'Breakout', result: '-$90', grade: 'C', status: 'Early entry' },
  { pair: 'XAUUSD', setup: 'Reversal', result: '+$180', grade: 'B', status: 'Good execution' },
  { pair: 'BTCUSD', setup: 'Scalp', result: '+$75', grade: 'B', status: 'Fast session' },
];

const playbooks = [
  { title: 'Momentum Pulse', description: 'Breakout continuation after clean range expansion.', accuracy: 74, risk: '1R max', tag: 'Momentum' },
  { title: 'Trend Pullback', description: 'Enter on retracement inside higher timeframe trend.', accuracy: 81, risk: '0.75R', tag: 'A+ setup' },
  { title: 'Liquidity Reclaim', description: 'Fade failed breakout near strong liquidity zone.', accuracy: 67, risk: '1R max', tag: 'Advanced' },
];

const resources = [
  'How to build a daily trading plan',
  'Top 7 mistakes killing your consistency',
  'Replay drills for breakout traders',
  'Risk model for funded account challenges',
];

const calendarDays = [
  { date: 1, pnl: -217, trades: 2 }, { date: 4, pnl: 552, trades: 5 },
  { date: 5, pnl: -122, trades: 5 }, { date: 6, pnl: 400, trades: 1 },
  { date: 7, pnl: 288, trades: 4 }, { date: 8, pnl: 589, trades: 3 },
  { date: 11, pnl: -313, trades: 4 }, { date: 12, pnl: 348, trades: 1 },
  { date: 13, pnl: 168, trades: 5 }, { date: 14, pnl: 432, trades: 3 },
  { date: 15, pnl: -116, trades: 2 }, { date: 18, pnl: 104, trades: 4 },
  { date: 19, pnl: 362, trades: 4 }, { date: 20, pnl: -203, trades: 2 },
  { date: 21, pnl: 282, trades: 4 }, { date: 22, pnl: 739, trades: 3 },
  { date: 25, pnl: -376, trades: 1 }, { date: 26, pnl: 552, trades: 2 },
  { date: 27, pnl: 185, trades: 4 }, { date: 28, pnl: -280, trades: 1 },
  { date: 29, pnl: -114, trades: 1 },
];

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
  const cells = Array.from({ length: 35 }, (_, i) => {
    const dayNumber = i - 3;
    const entry = calendarDays.find((d) => d.date === dayNumber);
    return { dayNumber, entry };
  });

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-heading">Trading Calendar</CardTitle>
            <CardDescription>Monthly P&L and trade activity</CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon"><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium text-foreground">March 2024</span>
            <Button variant="ghost" size="icon"><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map(({ dayNumber, entry }, index) => {
            const inMonth = dayNumber >= 1 && dayNumber <= 31;
            const positive = (entry?.pnl ?? 0) > 0;
            const negative = (entry?.pnl ?? 0) < 0;
            return (
              <div key={index} className={cx(
                'rounded-lg p-2 min-h-[70px] text-xs transition-colors',
                !inMonth && 'opacity-30',
                entry && positive && (dark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'),
                entry && negative && (dark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'),
                !entry && 'bg-muted/30',
              )}>
                <p className="font-medium text-muted-foreground">
                  {inMonth ? dayNumber : dayNumber <= 0 ? 31 + dayNumber : dayNumber - 31}
                </p>
                {entry && (
                  <div className="mt-1">
                    <p className={cx('font-semibold text-[11px]', positive ? 'text-emerald-500' : 'text-red-500')}>
                      {entry.pnl > 0 ? '+' : ''}${entry.pnl}
                    </p>
                    <p className="text-muted-foreground text-[10px]">{entry.trades} trades</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/30" /> Profit Day</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" /> Loss Day</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-primary/20 border border-primary/30" /> Highlighted Theme</span>
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
  const { signOut } = useAuth();
  const navigate = useNavigate();

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
                <MetricCard title="Total P&L" value="+$3,246" hint="↑ 18% vs last month" icon={TrendingUp} dark={dark} />
                <MetricCard title="Win Rate" value="62%" hint="34 of 55 trades" icon={Target} dark={dark} />
                <MetricCard title="Avg RR" value="1.8:1" hint="Above target of 1.5" icon={LineChart} dark={dark} />
                <MetricCard title="Trades" value="55" hint="This month" icon={FileBarChart} dark={dark} />
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
                    {trades.map((trade) => (
                      <div key={trade.pair} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="font-medium text-sm text-foreground">{trade.pair}</p>
                          <p className="text-xs text-muted-foreground">{trade.setup} · {trade.status}</p>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <p className={cx('text-sm font-semibold', trade.result.startsWith('+') ? 'text-emerald-500' : 'text-red-500')}>{trade.result}</p>
                          <Badge variant="outline" className="text-xs">{trade.grade}</Badge>
                        </div>
                      </div>
                    ))}
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

          {active === 'analytics' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <SectionTitle title="Edge Analytics" subtitle="Discover what's working and what's not" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Total P&L" value="+$3,246" hint="This month" icon={TrendingUp} dark={dark} />
                <MetricCard title="Best Setup" value="Pullback" hint="81% win rate" icon={Target} dark={dark} />
                <MetricCard title="Worst Session" value="Monday AM" hint="-$430 avg" icon={Clock3} dark={dark} />
                <MetricCard title="Discipline" value="85%" hint="Rule adherence" icon={ShieldCheck} dark={dark} />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader><CardTitle className="font-heading text-emerald-500">What works</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {['Pullback setups have highest win rate', 'NASDAQ outperforms FX pairs', 'Trades after 10:00 AM are more consistent'].map((item) => (
                      <p key={item} className="text-sm text-foreground flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" />{item}</p>
                    ))}
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-sm">
                  <CardHeader><CardTitle className="font-heading text-red-500">What hurts</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {['Impulsive breakouts reduce consistency', 'Overtrading after first loss damages P&L', 'Low-quality C-grade setups drag results'].map((item) => (
                      <p key={item} className="text-sm text-foreground flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-red-500" />{item}</p>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {active === 'playbooks' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <SectionTitle title="Playbook Lab" subtitle="Your refined trading setups" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {playbooks.map((item) => (
                  <Card key={item.title} className="border-0 shadow-sm">
                    <CardContent className="pt-6 space-y-3">
                      <Badge className="bg-primary/10 text-primary border-0">{item.tag}</Badge>
                      <p className="font-heading font-bold text-foreground">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                      <Separator />
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Accuracy</span><span className="font-medium text-foreground">{item.accuracy}%</span></div>
                      <Progress value={item.accuracy} className="h-2" />
                      <div className="flex justify-between text-xs"><span className="text-muted-foreground">Risk</span><span className="font-medium text-foreground">{item.risk}</span></div>
                      <Button variant="outline" size="sm" className="w-full rounded-xl">Open playbook</Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </motion.div>
          )}

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
