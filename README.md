# Trade Nova

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FileBarChart,
  LayoutDashboard,
  LineChart,
  Moon,
  PlayCircle,
  Settings,
  ShieldCheck,
  Sun,
  Target,
  TrendingUp,
  Upload,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { AreaChart, Area, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';

const equityData = [
  { day: 'Mon', value: 120 },
  { day: 'Tue', value: 180 },
  { day: 'Wed', value: 160 },
  { day: 'Thu', value: 260 },
  { day: 'Fri', value: 320 },
  { day: 'Sat', value: 300 },
  { day: 'Sun', value: 380 },
];

const setupData = [
  { name: 'Breakout', value: 8 },
  { name: 'Pullback', value: 14 },
  { name: 'Reversal', value: 5 },
  { name: 'Scalp', value: 7 },
];

const trades = [
  { pair: 'NASDAQ', setup: 'Pullback', result: '+$320', grade: 'A', status: 'Followed plan' },
  { pair: 'EURUSD', setup: 'Breakout', result: '-$90', grade: 'C', status: 'Early entry' },
  { pair: 'XAUUSD', setup: 'Reversal', result: '+$180', grade: 'B', status: 'Good execution' },
  { pair: 'BTCUSD', setup: 'Scalp', result: '+$75', grade: 'B', status: 'Fast session' },
];

const playbooks = [
  {
    title: 'Momentum Pulse',
    description: 'Breakout continuation after clean range expansion.',
    accuracy: 74,
    risk: '1R max',
    tag: 'Momentum',
  },
  {
    title: 'Trend Pullback',
    description: 'Enter on retracement inside higher timeframe trend.',
    accuracy: 81,
    risk: '0.75R',
    tag: 'A+ setup',
  },
  {
    title: 'Liquidity Reclaim',
    description: 'Fade failed breakout near strong liquidity zone.',
    accuracy: 67,
    risk: '1R max',
    tag: 'Advanced',
  },
];

const resources = [
  'How to build a daily trading plan',
  'Top 7 mistakes killing your consistency',
  'Replay drills for breakout traders',
  'Risk model for funded account challenges',
];

const calendarDays = [
  { date: 1, pnl: -217, trades: 2 },
  { date: 4, pnl: 552, trades: 5 },
  { date: 5, pnl: -122, trades: 5 },
  { date: 6, pnl: 400, trades: 1 },
  { date: 7, pnl: 288, trades: 4 },
  { date: 8, pnl: 589, trades: 3 },
  { date: 11, pnl: -313, trades: 4 },
  { date: 12, pnl: 348, trades: 1 },
  { date: 13, pnl: 168, trades: 5 },
  { date: 14, pnl: 432, trades: 3 },
  { date: 15, pnl: -116, trades: 2 },
  { date: 18, pnl: 104, trades: 4 },
  { date: 19, pnl: 362, trades: 4 },
  { date: 20, pnl: -203, trades: 2 },
  { date: 21, pnl: 282, trades: 4 },
  { date: 22, pnl: 739, trades: 3 },
  { date: 25, pnl: -376, trades: 1 },
  { date: 26, pnl: 552, trades: 2 },
  { date: 27, pnl: 185, trades: 4 },
  { date: 28, pnl: -280, trades: 1 },
  { date: 29, pnl: -114, trades: 1 },
];

const sidebar = [
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

type ThemeMode = 'dark' | 'light';

function cx(...values: Array) {
  return values.filter(Boolean).join(' ');
}

function MetricCard({
  title,
  value,
  hint,
  icon: Icon,
  theme,
}: {
  title: string;
  value: string;
  hint: string;
  icon: React.ElementType;
  theme: ThemeMode;
}) {
  const dark = theme === 'dark';
  return (
    
      
        


          


            

{title}


            

{value}


            

{hint}


          


          


            
          


        


      
    
  );
}

function SectionTitle({ title, subtitle, theme }: { title: string; subtitle: string; theme: ThemeMode }) {
  const dark = theme === 'dark';
  return (
    


      


        

{title}


        

{subtitle}


      


    


  );
}

function TradingCalendar({ theme }: { theme: ThemeMode }) {
  const dark = theme === 'dark';
  const cells = Array.from({ length: 35 }, (_, i) => {
    const dayNumber = i - 3;
    const entry = calendarDays.find((d) => d.date === dayNumber);
    return { dayNumber, entry };
  });

  return (
    
      
        


          


            Trading Calendar
            Monthly P&L and trade activity
          


          


            
              
            
            March 2024
            
              
            
          


        


      
      
        


          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            


              {day}
            


          ))}
        



        


          {cells.map(({ dayNumber, entry }, index) => {
            const inMonth = dayNumber >= 1 && dayNumber <= 31;
            const positive = (entry?.pnl ?? 0) > 0;
            const negative = (entry?.pnl ?? 0) < 0;
            return (
              


                

{inMonth ? dayNumber : dayNumber <= 0 ? 31 + dayNumber : dayNumber - 31}


                {entry ? (
                  


                    


                      {entry.pnl > 0 ? '+' : ''}${entry.pnl}
                    


                    

{entry.trades} trades


                  


                ) : null}
              


            );
          })}
        



        


          

 Profit Day


          

 Loss Day


          

 Highlighted Theme


        


      
    
  );
}

export default function TradingSaaSFrontConcept() {
  const [active, setActive] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState('dark');
  const dark = theme === 'dark';

  const filteredResources = useMemo(
    () => resources.filter((r) => r.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  return (
    


      


        


          


            


              
            


            


              

TradeNova


              

Focused trading workspace


            


          



          


            {sidebar.map((item) => {
              const Icon = item.icon;
              const selected = active === item.id;
              return (
                 setActive(item.id)}
                  className={cx(
                    'flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition',
                    selected && dark && 'bg-violet-500 text-white shadow-lg shadow-violet-500/20',
                    selected && !dark && 'bg-violet-600 text-white shadow-lg shadow-violet-200',
                    !selected && dark && 'text-white/75 hover:bg-white/5',
                    !selected && !dark && 'text-slate-700 hover:bg-slate-100'
                  )}
                >
                  
                    
                    {item.label}
                  
                  
                
              );
            })}
          



          
            
              

Upgrade to Pro


              

Unlock replay, AI insights, and imports


              Start 14-day trial
            
          
        



        
          
            


              


                Premium Front Preview
                


                  TradeNova Command Center
                


                


                  A polished purple, black, and white interface with a stronger dashboard, trading calendar, and clean light or dark mode.
                


              


              


                Preview onboarding
                 setTheme(dark ? 'light' : 'dark')}
                  className={cx('rounded-2xl', dark ? 'border-white/15 bg-transparent text-white hover:bg-white/5' : 'border-black/10 bg-white text-slate-900 hover:bg-slate-50')}
                >
                  {dark ?  : }
                  {dark ? 'Light Mode' : 'Dark Mode'}
                
              


            



            {/* Top Navbar */}
            


              


                

Dashboard


                Pro
              



              


                


                  Mar 1 - Mar 31
                


                


                  Main Account
                


                
                  + New Trade
                
              


            



            {active === 'dashboard' && (
              


                


                  
                  
                  
                  
                



                


                  
                    
                      Equity Curve
                      Weekly growth snapshot
                    
                    
                      
                        
                          
                            
                              
                              
                            
                          
                          
                          
                          
                          
                          
                        
                      
                    
                  

                  
                    
                      Today Focus
                      Plan vs execution guidance
                    
                    
                      


                        

Bias


                        

Bullish on Nasdaq pullbacks


                      


                      


                        


                          

Rule adherence


                          

84%


                        


                        
                      


                      


                        

AI hint


                        


                          You perform best when you wait for confirmed pullbacks after 10:00 AM. Avoid first candle entries.
                        


                      


                    
                  
                



                {/* Zella Score */}
                
                  
                    Trader Score
                    Overall performance
                  
                  
                    


                      {[
                        { label: 'Win %', value: 62 },
                        { label: 'RR', value: 78 },
                        { label: 'Discipline', value: 85 },
                        { label: 'Execution', value: 72 },
                        { label: 'Consistency', value: 68 },
                      ].map((item) => (
                        


                          

{item.label}


                          

{item.value}


                        


                      ))}
                    


                  
                

                

                


                  
                    
                      Recent Trades
                      Execution log preview
                    
                    
                      {trades.map((trade) => (
                        


                          


                            

{trade.pair}


                            

{trade.setup} · {trade.status}


                          


                          


                            

{trade.result}


                            Grade {trade.grade}
                          


                        


                      ))}
                    
                  

                  
                    
                      Best Performing Setups
                      By frequency this month
                    
                    
                      
                        
                          
                          
                          
                          
                          
                        
                      
                    
                  
                


              


            )}

            {active === 'plan' && (
              


                
                  
                    Trade Plan
                    Pre-market structure before execution
                  
                  
                    
                      
                        Focus
                        Risk
                        Review
                      
                      
                        


                          

Market Bias


                          

Bullish continuation on tech indices


                        


                        


                          

Watchlist


                          

NASDAQ, EURUSD, XAUUSD


                        


                        


                          

Setups to Trade


                          


                            Pullback
                            Opening Range
                            Liquidity Sweep
                          


                        


                      
                      
                        


                          


                            

Daily max loss


                            

-$250


                          


                          


                            

Risk per trade


                            

0.5%


                          


                        


                        


                          

Execution Rules


                          


                            

Only take A and B setups


                            

No trades in first 5 minutes


                            

Stop after 2 consecutive losses


                          


                        


                      
                      
                        


                          

Plan vs Actual


                          

3 of 4 trades matched your predefined setups.


                        


                        


                          

Next Improvement


                          

Wait for retest confirmation before breakouts.


                        


                      
                    
                  
                

                
                  
                    Session Checklist
                    Keep discipline visible
                  
                  
                    {['Define bias', 'Set max loss', 'Mark key levels', 'Choose top 2 setups', 'Review yesterday mistakes'].map((item) => (
                      


                        
                        {item}
                      


                    ))}
                  
                
              


            )}

            {active === 'trades' && (
              


                
                


                  
                    
                      
                      

CSV Import


                      

Upload broker exports and normalize trades.


                      Import trades
                    
                  
                  
                    
                      
                      

Broker Sync


                      

Connect platforms in future SaaS phase.


                      Coming soon
                    
                  
                  
                    
                      
                      

Review Queue


                      

7 trades pending notes and grading.


                      Open queue
                    
                  
                


                
                  
                    Trade Log
                    Designed for later database connection
                  
                  
                    {trades.map((trade) => (
                      


                        


                          

{trade.pair}


                          

Setup: {trade.setup}


                        


                        

{trade.status}


                        {trade.grade}
                        

{trade.result}


                      


                    ))}
                  
                
              


            )}

            {active === 'journal' && (
              


                
                  
                    Mind Journal
                    Capture emotions, mistakes, and lessons.
                  
                  
                    


                      

Mood


                      

Focused before session, slightly impatient after first loss.


                    


                    


                      

Mistakes


                      

Entered one breakout before candle close confirmation.


                    


                    


                      

Lesson


                      

Wait for retest on momentum setups when volatility is high.


                    


                  
                

                
                  
                    AI Review Summary
                    Future premium workflow
                  
                  
                    


                      Your best trade came when you respected your pullback playbook and sized correctly. Your weakest trade came from rushing the breakout.
                    


                    


                      

Suggested action


                      

Reduce breakout frequency by 30% this week and focus on pullbacks only.


                    


                  
                
              


            )}

            {active === 'analytics' && (
              


                
                


                  
                  
                  
                  
                


                


                  
                    
                      What works
                    
                    
                      {['Pullback setups have highest win rate', 'NASDAQ outperforms FX pairs', 'Trades after 10:00 AM are more consistent'].map((item) => (
                        

{item}


                      ))}
                    
                  
                  
                    
                      What hurts
                    
                    
                      {['Impulsive breakouts reduce consistency', 'Overtrading after first loss damages P&L', 'Low-quality C-grade setups drag results'].map((item) => (
                        

{item}


                      ))}
                    
                  
                


              


            )}

            {active === 'playbooks' && (
              


                
                


                  {playbooks.map((item) => (
                    
                      
                        {item.tag}
                        

{item.title}


                        

{item.description}


                        
                        


                          Accuracy
                          {item.accuracy}%
                        


                        
                        


                          Risk
                          {item.risk}
                        


                        Open playbook
                      
                    
                  ))}
                


              


            )}

            {active === 'replay' && (
              


                
                  
                    Replay Studio
                    Manual simulation concept before advanced backtesting.
                  
                  
                    


                      


                        
                        

Chart playback module


                        


                          Future phase: candle-by-candle replay, simulated entries, notes, and scorecard exports.
                        


                      


                    


                  
                
                
                  
                    Session Goals
                  
                  
                    {['Practice only opening range breakouts', 'Record each simulated trade', 'Score execution after each session'].map((item) => (
                      

{item}


                    ))}
                  
                
              


            )}

            {active === 'resources' && (
              


                
                
                  
                     setSearch(e.target.value)}
                      placeholder="Search lessons, drills, and guides..."
                      className={cx('rounded-2xl', dark ? 'border-white/10 bg-white/5 text-white placeholder:text-white/35' : 'border-black/10 bg-slate-50 text-slate-950 placeholder:text-slate-400')}
                    />
                  
                
                


                  {filteredResources.map((item) => (
                    
                      
                        


                          


                            

{item}


                            

Structured learning content for traders who want better process and discipline.


                          


                          
                        


                      
                    
                  ))}
                


              


            )}

            {active === 'settings' && (
              


                
                  
                    Studio Profile
                  
                  
                    


                      
                        AT
                      
                      


                        

Amine Trader


                        

Pro plan preview

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://tradenovaos-com.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0ee4a120-abbf-401b-9623-1114b47e7fda).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
