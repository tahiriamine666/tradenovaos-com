// src/pages/LandingPage.tsx
// Premium TradeNova landing page — TradeZella-quality, original branding
// Framer Motion animations, realistic dashboard mockup, dark fintech SaaS

import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, BookOpen, Brain, Target, PlayCircle, Sparkles,
  ArrowRight, Check, TrendingUp, Shield, Zap,
  Star, Menu, X, Activity, Calendar, Upload,
  Award, LineChart,
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from 'recharts';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import BrokersStrip from '@/components/marketing/BrokersStrip';

const EQUITY_DATA = [
  { day: 'Jan', value: 0 }, { day: 'Feb', value: 1240 }, { day: 'Mar', value: 890 },
  { day: 'Apr', value: 2800 }, { day: 'May', value: 2200 }, { day: 'Jun', value: 4100 },
  { day: 'Jul', value: 3800 }, { day: 'Aug', value: 6200 }, { day: 'Sep', value: 7800 },
  { day: 'Oct', value: 9400 }, { day: 'Nov', value: 11200 }, { day: 'Dec', value: 12480 },
];

const RECENT_TRADES = [
  { pair: 'NQ / NASDAQ', side: 'Long',  result: +480,  win: true,  date: 'Today' },
  { pair: 'XAUUSD',      side: 'Short', result: -120,  win: false, date: 'Today' },
  { pair: 'EURUSD',      side: 'Long',  result: +280,  win: true,  date: 'Yesterday' },
  { pair: 'BTC/USD',     side: 'Long',  result: +920,  win: true,  date: 'May 11' },
  { pair: 'ES / S&P500', side: 'Short', result: -200,  win: false, date: 'May 10' },
];

const SETUP_DATA = [
  { name: 'Pullback', value: 4200, pct: 85 },
  { name: 'ORB',      value: 2800, pct: 68 },
  { name: 'LQ Sweep', value: 1900, pct: 72 },
  { name: 'FVG',      value: 1400, pct: 60 },
];

const SCORE_ITEMS = [
  { label: 'Win %',       value: 82, color: '#10b981' },
  { label: 'R:R',         value: 76, color: '#7c3aed' },
  { label: 'Discipline',  value: 88, color: '#10b981' },
  { label: 'Execution',   value: 79, color: '#7c3aed' },
  { label: 'Consistency', value: 85, color: '#10b981' },
];

const ease: any = [0.22, 1, 0.36, 1];

function useReveal() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' as any });
  return { ref, inView };
}

function CountUp({ to, prefix = '', suffix = '', duration = 1.8 }: {
  to: number; prefix?: string; suffix?: string; duration?: number;
}) {
  const [val, setVal] = useState(0);
  const { ref, inView } = useReveal();
  const started = useRef(false);
  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const s = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - s) / (duration * 1000), 1);
      setVal((1 - Math.pow(1 - p, 3)) * to);
      if (p < 1) requestAnimationFrame(tick); else setVal(to);
    };
    requestAnimationFrame(tick);
  }, [inView, to, duration]);
  return <span ref={ref}>{prefix}{Math.round(val).toLocaleString()}{suffix}</span>;
}

function Navbar({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#06060f]/95 backdrop-blur-xl border-b border-white/[0.06]' : ''}`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <BarChart3 className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="font-black text-white text-lg tracking-tight">TradeNova</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-white/45">
          {['Features', 'How it Works', 'Pricing'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-white transition-colors">{l}</a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <button onClick={onLogin} className="text-sm text-white/55 hover:text-white px-4 py-2 transition-colors">Log in</button>
          <button onClick={onSignup} className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-px">Start Free</button>
        </div>
        <button className="md:hidden text-white/50 hover:text-white p-2" onClick={() => setOpen(v => !v)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-[#0a0a14] border-b border-white/[0.06] px-5 py-4 space-y-3">
            {['Features', 'How it Works', 'Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/\s+/g,'-')}`} className="block text-sm text-white/45 hover:text-white py-1" onClick={() => setOpen(false)}>{l}</a>
            ))}
            <div className="flex gap-3 pt-2 border-t border-white/[0.06]">
              <button onClick={onLogin} className="flex-1 text-sm border border-white/10 text-white/55 py-2.5 rounded-xl hover:bg-white/5">Log in</button>
              <button onClick={onSignup} className="flex-1 text-sm bg-violet-600 text-white py-2.5 rounded-xl font-bold hover:bg-violet-500">Start Free</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

function Hero({ onSignup }: { onSignup: () => void }) {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center pt-20 pb-16 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-violet-600/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[400px] bg-indigo-700/6 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: `linear-gradient(rgba(139,92,246,1) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,1) 1px,transparent 1px)`, backgroundSize: '72px 72px' }} />
      </div>
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs font-semibold text-violet-300">AI-powered trading journal · Now in beta</span>
          </div>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08, ease }}
          className="text-center text-5xl sm:text-6xl lg:text-[76px] font-black text-white leading-[1.02] tracking-[-0.03em] mb-6">
          The Trading OS<br />
          <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">Built For Serious Traders</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
          className="text-center text-lg sm:text-xl text-white/45 max-w-2xl mx-auto mb-10 leading-relaxed">
          Plan your trades, journal your execution, analyze your edge,<br className="hidden sm:block" />
          and improve with data — all in one place.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-7">
          <button onClick={onSignup} className="group flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all hover:shadow-2xl hover:shadow-violet-500/30 hover:-translate-y-0.5 w-full sm:w-auto justify-center">
            Start Free — No credit card <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="flex items-center gap-2.5 text-white/50 hover:text-white border border-white/10 hover:border-white/20 hover:bg-white/[0.04] px-7 py-4 rounded-2xl font-semibold text-sm transition-all w-full sm:w-auto justify-center">
            <PlayCircle className="h-4 w-4" /> Watch Demo
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-white/25 mb-16">
          {['Free forever plan', 'No credit card required', 'Setup in 2 minutes', '143 traders trust TradeNova'].map(t => (
            <span key={t} className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" />{t}</span>
          ))}
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div initial={{ opacity: 0, y: 60, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.3, ease }} className="relative max-w-5xl mx-auto">
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-violet-600/12 blur-3xl rounded-full" />
          <div className="relative rounded-3xl border border-white/[0.09] bg-[#0a0a14] overflow-hidden shadow-2xl shadow-black/60">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.05] bg-white/[0.01]">
              <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/50" /><div className="w-3 h-3 rounded-full bg-yellow-500/50" /><div className="w-3 h-3 rounded-full bg-green-500/50" /></div>
              <div className="flex-1 flex justify-center"><div className="bg-white/[0.04] border border-white/[0.05] rounded-lg px-8 py-1 text-[11px] text-white/20">app.tradenova.io/dashboard</div></div>
            </div>
            <div className="flex min-h-[380px]">
              <div className="hidden sm:flex w-48 flex-col border-r border-white/[0.05] p-4 gap-0.5 flex-shrink-0">
                <div className="flex items-center gap-2 mb-5 px-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center"><BarChart3 className="h-3.5 w-3.5 text-white" /></div>
                  <span className="text-sm font-black text-white">TradeNova</span>
                </div>
                {[{l:'Command Center',a:true},{l:'Trade Vault',a:false},{l:'Mind Journal',a:false},{l:'Edge Analytics',a:false},{l:'Playbook Lab',a:false},{l:'AI Insights',a:false}].map(item => (
                  <div key={item.l} className={`text-[11px] px-3 py-2 rounded-xl font-medium ${item.a ? 'bg-violet-600 text-white' : 'text-white/20'}`}>{item.l}</div>
                ))}
              </div>
              <div className="flex-1 p-4 sm:p-5 space-y-3">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {[{l:'Total P&L',v:'+$12,480',c:'text-emerald-400',bg:'bg-emerald-500/8'},{l:'Win Rate',v:'68%',c:'text-white',bg:''},{l:'Avg R:R',v:'1:3.2',c:'text-blue-400',bg:''},{l:'Trades',v:'143',c:'text-violet-400',bg:''}].map((m,i) => (
                    <motion.div key={m.l} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.6+i*0.08}}
                      className={`rounded-xl border border-white/[0.06] ${m.bg} p-3`}>
                      <p className="text-[9px] text-white/30 uppercase tracking-wider mb-1">{m.l}</p>
                      <p className={`text-lg font-black font-mono ${m.c}`}>{m.v}</p>
                    </motion.div>
                  ))}
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.8}} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-white">Equity Curve</p>
                      <span className="text-[10px] text-emerald-400 font-bold">+$12,480</span>
                    </div>
                    <ResponsiveContainer width="100%" height={70}>
                      <AreaChart data={EQUITY_DATA}>
                        <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3}/><stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient></defs>
                        <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={1.5} fill="url(#hg)" dot={false}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                  <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.9}} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold text-white">Trader Score</p>
                      <span className="text-lg font-black text-violet-400 font-mono">82</span>
                    </div>
                    <div className="space-y-1.5">
                      {SCORE_ITEMS.map((s,i) => (
                        <div key={s.label} className="flex items-center gap-2">
                          <span className="text-[9px] text-white/20 w-14">{s.label}</span>
                          <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                            <motion.div initial={{width:0}} animate={{width:`${s.value}%`}} transition={{duration:0.7,delay:1+i*0.08}} className="h-full rounded-full" style={{background:s.color}}/>
                          </div>
                          <span className="text-[9px] font-bold w-5 text-right" style={{color:s.color}}>{s.value}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </div>
                <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1}} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <p className="text-[11px] font-bold text-white mb-2">Recent Trades</p>
                  <div className="flex gap-3">
                    {RECENT_TRADES.slice(0,4).map((t,i) => (
                      <motion.div key={i} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:1.1+i*0.06}}
                        className={`flex-1 rounded-lg p-2 ${t.win ? 'bg-emerald-500/8 border border-emerald-500/15' : 'bg-red-500/8 border border-red-500/15'}`}>
                        <p className="text-[9px] text-white/30 truncate">{t.pair}</p>
                        <p className={`text-xs font-bold font-mono ${t.win ? 'text-emerald-400' : 'text-red-400'}`}>{t.result>0?'+':''}${Math.abs(t.result)}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function StatsBar() {
  const { ref, inView } = useReveal();
  return (
    <section ref={ref} className="py-12 border-y border-white/[0.05] bg-white/[0.01]">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[{l:'Avg P&L improvement',to:34,suf:'%',pre:'+'},{l:'Trades analyzed',to:48000,suf:'+'},{l:'Win rate increase',to:18,suf:'%',pre:'+'},{l:'Active traders',to:143,suf:'+'}].map((s,i) => (
          <motion.div key={s.l} initial={{opacity:0,y:12}} animate={inView?{opacity:1,y:0}:{}} transition={{delay:i*0.08}} className="text-center">
            <p className="text-3xl sm:text-4xl font-black text-white mb-1 font-mono">{inView && <CountUp to={s.to} prefix={s.pre??''} suffix={s.suf} duration={1.6}/>}</p>
            <p className="text-xs text-white/30">{s.l}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

const FEATURES = [
  {icon:BookOpen,  title:'Trade Journal',    desc:'Log every trade with emotion, execution score, and outcome. Build habits that compound.',tag:'Core',    c:'violet'},
  {icon:BarChart3, title:'Edge Analytics',   desc:'Win rate, profit factor, expectancy — know exactly where your edge lives and breaks.',  tag:'Analytics',c:'blue'},
  {icon:Brain,     title:'Mind Journal',     desc:'Track emotions and biases. Identify revenge trading, over-trading, and patterns.',        tag:'Psychology',c:'pink'},
  {icon:Target,    title:'Playbook Lab',     desc:'Define setups, entry rules, and checklists. Operate with a system, not a feeling.',      tag:'Planning',c:'emerald'},
  {icon:PlayCircle,title:'Replay Studio',   desc:'Replay sessions bar by bar. Practice without risk. Score your simulated executions.',    tag:'Practice', c:'amber'},
  {icon:Sparkles,  title:'AI Insights',      desc:'Claude analyzes your trades and surfaces patterns you\'d never catch manually.',         tag:'AI',       c:'purple'},
  {icon:Calendar,  title:'Trading Calendar', desc:'See P&L heatmap across the month. Identify your best and worst trading days.',           tag:'Visual',   c:'cyan'},
  {icon:Upload,    title:'CSV Import',       desc:'Import from any broker — MT4, MT5, cTrader, IBKR. Smart column mapping.',               tag:'Import',   c:'green'},
];

const CM: Record<string,any> = {
  violet: {bg:'bg-violet-500/8',  b:'border-violet-500/20',  t:'text-violet-400',  bd:'bg-violet-500/15 text-violet-300'},
  blue:   {bg:'bg-blue-500/8',    b:'border-blue-500/20',    t:'text-blue-400',    bd:'bg-blue-500/15 text-blue-300'},
  pink:   {bg:'bg-pink-500/8',    b:'border-pink-500/20',    t:'text-pink-400',    bd:'bg-pink-500/15 text-pink-300'},
  emerald:{bg:'bg-emerald-500/8', b:'border-emerald-500/20', t:'text-emerald-400', bd:'bg-emerald-500/15 text-emerald-300'},
  amber:  {bg:'bg-amber-500/8',   b:'border-amber-500/20',   t:'text-amber-400',   bd:'bg-amber-500/15 text-amber-300'},
  purple: {bg:'bg-purple-500/8',  b:'border-purple-500/20',  t:'text-purple-400',  bd:'bg-purple-500/15 text-purple-300'},
  cyan:   {bg:'bg-cyan-500/8',    b:'border-cyan-500/20',    t:'text-cyan-400',    bd:'bg-cyan-500/15 text-cyan-300'},
  green:  {bg:'bg-green-500/8',   b:'border-green-500/20',   t:'text-green-400',   bd:'bg-green-500/15 text-green-300'},
};

function Features() {
  const { ref, inView } = useReveal();
  return (
    <section id="features" className="py-24 sm:py-32" ref={ref}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div initial={{opacity:0,y:24}} animate={inView?{opacity:1,y:0}:{}} transition={{duration:0.5}} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-5">
            <Activity className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-violet-300">Complete trading stack</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">Everything you need to improve</h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Eight tools that work together to turn trading data into consistent edge.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f,i) => {
            const Icon = f.icon; const c = CM[f.c];
            return (
              <motion.div key={f.title}
                initial={{opacity:0,y:20}} animate={inView?{opacity:1,y:0}:{}} transition={{duration:0.5,delay:i*0.06,ease}}
                whileHover={{y:-4,transition:{duration:0.2}}}
                className="group rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 hover:border-white/[0.15] hover:bg-white/[0.04] transition-all duration-300 cursor-default"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${c.bg} border ${c.b} mb-3`}>
                  <Icon className={`h-5 w-5 ${c.t}`} />
                </div>
                <div className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${c.bd} mb-2 ml-2`}>{f.tag}</div>
                <h3 className="font-bold text-white mb-1.5 text-sm">{f.title}</h3>
                <p className="text-xs text-white/35 leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const { ref, inView } = useReveal();
  const steps = [
    {n:'01',title:'Plan',     icon:Target,      c:'violet', desc:'Set market bias, define setups, mark key levels, and set daily max loss before the session starts.'},
    {n:'02',title:'Execute',  icon:Zap,         c:'blue',   desc:'Follow your playbook. Log each trade with direction, result, emotion, and execution score in real time.'},
    {n:'03',title:'Review',   icon:BarChart3,   c:'emerald',desc:'Analyze your session. Win rate, profit factor, setup performance, and where you deviated from plan.'},
    {n:'04',title:'Improve',  icon:TrendingUp,  c:'purple', desc:'AI surfaces your blind spots. Get weekly improvement actions based on 100% of your real trading data.'},
  ];
  return (
    <section id="how-it-works" className="py-24 sm:py-32 relative" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/5 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div initial={{opacity:0,y:24}} animate={inView?{opacity:1,y:0}:{}} transition={{duration:0.5}} className="text-center mb-14">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">Plan → Execute → Review → Improve</h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">A closed-loop operating system for your trading career.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s,i) => {
            const Icon = s.icon; const c = CM[s.c];
            return (
              <motion.div key={s.title}
                initial={{opacity:0,y:20}} animate={inView?{opacity:1,y:0}:{}} transition={{duration:0.5,delay:i*0.1,ease}}>
                <div className={`w-16 h-16 rounded-2xl ${c.bg} border ${c.b} flex items-center justify-center mb-5`}>
                  <Icon className={`h-7 w-7 ${c.t}`} />
                </div>
                <div className="text-[11px] font-mono text-white/20 mb-1">{s.n}</div>
                <h3 className="text-xl font-black text-white mb-2">{s.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function DashboardShowcase({ onSignup }: { onSignup: () => void }) {
  const { ref, inView } = useReveal();
  return (
    <section id="dashboard" className="py-24 sm:py-32" ref={ref}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div initial={{opacity:0,y:24}} animate={inView?{opacity:1,y:0}:{}} transition={{duration:0.5}} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-5">
            <BarChart3 className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-semibold text-violet-300">Live dashboard preview</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">Your edge, visualized</h2>
          <p className="text-white/40 text-lg max-w-xl mx-auto">Real-time metrics, charts, and insights — all in one command center.</p>
        </motion.div>

        <motion.div initial={{opacity:0,y:40}} animate={inView?{opacity:1,y:0}:{}} transition={{duration:0.8,ease}}
          className="rounded-3xl border border-white/[0.08] bg-[#08080f] overflow-hidden shadow-2xl shadow-violet-900/15">
          <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-white/[0.05]">
            {[
              {l:'Total P&L', v:'+$12,480.75', c:'text-emerald-400'},
              {l:'Win Rate',  v:'68%',          c:'text-white'},
              {l:'Avg R:R',   v:'1:3.2',        c:'text-blue-400'},
              {l:'Trades',    v:'143',           c:'text-violet-400'},
            ].map((m,i) => (
              <motion.div key={m.l} initial={{opacity:0}} animate={inView?{opacity:1}:{}} transition={{delay:0.1+i*0.07}}
                className="p-5 sm:p-6 border-r border-white/[0.05] last:border-0">
                <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">{m.l}</p>
                <p className={`text-2xl sm:text-3xl font-black font-mono ${m.c}`}>{m.v}</p>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 border-b border-white/[0.05]">
            <div className="lg:col-span-2 p-5 sm:p-6 border-r border-white/[0.05]">
              <div className="flex items-center justify-between mb-4">
                <div><p className="text-sm font-bold text-white">Equity Curve</p><p className="text-[11px] text-white/30">Jan – Dec 2025</p></div>
                <span className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">+$12,480.75</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={EQUITY_DATA}>
                  <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c3aed" stopOpacity={0.3}/><stop offset="100%" stopColor="#7c3aed" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                  <XAxis dataKey="day" tick={{fontSize:11,fill:'rgba(255,255,255,0.2)'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fontSize:11,fill:'rgba(255,255,255,0.2)'}} axisLine={false} tickLine={false} width={50} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
                  <Tooltip contentStyle={{background:'#0d0d18',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',fontSize:12}} labelStyle={{color:'rgba(255,255,255,0.4)'}} itemStyle={{color:'#7c3aed',fontWeight:700}} formatter={(v:any)=>[`$${Number(v).toLocaleString()}`,'P&L']}/>
                  <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2.5} fill="url(#sg)" dot={false} activeDot={{r:5,fill:'#7c3aed',strokeWidth:0}}/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-sm font-bold text-white">Trader Score</p>
                <div className="flex items-baseline gap-0.5"><span className="text-3xl font-black text-violet-400 font-mono">82</span><span className="text-white/20 text-sm">/100</span></div>
              </div>
              <div className="space-y-3">
                {SCORE_ITEMS.map((s,i) => (
                  <div key={s.label}>
                    <div className="flex justify-between mb-1.5"><span className="text-xs text-white/35">{s.label}</span><span className="text-xs font-bold" style={{color:s.color}}>{s.value}</span></div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div initial={{width:0}} animate={inView?{width:`${s.value}%`}:{}} transition={{duration:0.9,delay:0.3+i*0.1,ease}} className="h-full rounded-full" style={{background:s.color}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-5 sm:p-6 border-r border-white/[0.05]">
              <p className="text-sm font-bold text-white mb-4">Recent Trades</p>
              <div className="space-y-1">
                {RECENT_TRADES.map((t,i) => (
                  <motion.div key={i} initial={{opacity:0,x:-6}} animate={inView?{opacity:1,x:0}:{}} transition={{delay:0.15+i*0.07}}
                    className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-6 rounded-full ${t.win?'bg-emerald-500':'bg-red-500'}`}/>
                      <div><p className="text-sm font-semibold text-white">{t.pair}</p><p className="text-[10px] text-white/25">{t.side} · {t.date}</p></div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold font-mono ${t.win?'text-emerald-400':'text-red-400'}`}>{t.result>0?'+':''}${Math.abs(t.result).toFixed(2)}</p>
                      <p className={`text-[10px] ${t.win?'text-emerald-400/50':'text-red-400/50'}`}>{t.win?'Win':'Loss'}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <p className="text-sm font-bold text-white mb-4">Best Performing Setups</p>
              <div className="space-y-4">
                {SETUP_DATA.map((s,i) => (
                  <motion.div key={s.name} initial={{opacity:0,x:6}} animate={inView?{opacity:1,x:0}:{}} transition={{delay:0.15+i*0.08}}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-semibold text-white">{s.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] text-white/25">{s.pct}% WR</span>
                        <span className="text-sm font-bold text-emerald-400">+${s.value.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div initial={{width:0}} animate={inView?{width:`${s.pct}%`}:{}} transition={{duration:0.8,delay:0.3+i*0.1}} className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"/>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{opacity:0,y:16}} animate={inView?{opacity:1,y:0}:{}} transition={{delay:0.5}} className="text-center mt-10">
          <button onClick={onSignup} className="group inline-flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all hover:shadow-2xl hover:shadow-violet-500/25 hover:-translate-y-0.5">
            Get this dashboard for free <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform"/>
          </button>
          <p className="text-xs text-white/20 mt-3">No credit card · Free forever plan available</p>
        </motion.div>
      </div>
    </section>
  );
}

function Testimonials() {
  const { ref, inView } = useReveal();
  const tms = [
    {name:'Alex M.',  role:'Forex Trader · 4 years',  av:'AM', text:'TradeNova showed me I was 40% less profitable after 2pm. Changed session hours — drawdown dropped in half.'},
    {name:'Sarah K.', role:'Futures Trader · Funded',  av:'SK', text:'AI insights caught that I was over-trading on news days. Win rate went from 48% to 67% in 6 weeks.'},
    {name:'Omar B.',  role:'Crypto Trader',            av:'OB', text:'Finally a journal I actually use. The playbook system keeps me accountable to my own rules every day.'},
    {name:'Nadia R.', role:'Prop Firm Trader',         av:'NR', text:'Passed my first funded challenge using TradeNova\'s risk rules and daily planning. Calendar heatmap is brilliant.'},
  ];
  return (
    <section className="py-24 sm:py-32" ref={ref}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div initial={{opacity:0,y:24}} animate={inView?{opacity:1,y:0}:{}} transition={{duration:0.5}} className="text-center mb-14">
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-3 tracking-tight">Traders love TradeNova</h2>
          <p className="text-white/35">Join traders who turned data into consistent edge.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tms.map((t,i) => (
            <motion.div key={t.name} initial={{opacity:0,y:16}} animate={inView?{opacity:1,y:0}:{}} transition={{delay:i*0.09,duration:0.5}} whileHover={{y:-4,transition:{duration:0.2}}}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5 hover:border-white/[0.14] hover:bg-white/[0.04] transition-all">
              <div className="flex gap-0.5 mb-4">{[1,2,3,4,5].map(j=><Star key={j} className="h-3.5 w-3.5 text-amber-400 fill-amber-400"/>)}</div>
              <p className="text-sm text-white/55 leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-600/25 border border-violet-500/25 flex items-center justify-center text-[11px] font-bold text-violet-300">{t.av}</div>
                <div><p className="text-sm font-bold text-white">{t.name}</p><p className="text-[11px] text-white/25">{t.role}</p></div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing({ onSignup }: { onSignup: () => void }) {
  const { ref, inView } = useReveal();
  const plans = [
    {name:'Free',  price:'$0',  desc:'Start tracking',          features:['50 trades/month','Basic analytics','Trade journal','Calendar','Dark/light mode'],cta:'Start Free',hi:false},
    {name:'Pro',   price:'$29', per:'/mo',desc:'Serious traders',badge:'Most Popular',features:['Unlimited trades','Full analytics','CSV import','AI insights','Playbook lab','Trade plan'],cta:'Start 14-day Trial',hi:true},
    {name:'Elite', price:'$59', per:'/mo',desc:'Funded traders', features:['Everything in Pro','Replay studio','API access','Unlimited AI','Priority support'],cta:'Start 14-day Trial',hi:false},
  ];
  return (
    <section id="pricing" className="py-24 sm:py-32 relative" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/6 to-transparent pointer-events-none"/>
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <motion.div initial={{opacity:0,y:24}} animate={inView?{opacity:1,y:0}:{}} transition={{duration:0.5}} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-5">
            <span className="text-xs font-semibold text-amber-300">🔄 Stripe coming soon · Manual activation via Payoneer</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight">Simple, honest pricing</h2>
          <p className="text-white/35">Start free. Upgrade when you're ready.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p,i) => (
            <motion.div key={p.name} initial={{opacity:0,y:20}} animate={inView?{opacity:1,y:0}:{}} transition={{delay:i*0.09,duration:0.5}}
              className={`relative rounded-2xl p-6 border ${p.hi?'border-violet-500/40 bg-violet-600/5 shadow-xl shadow-violet-500/10':'border-white/[0.07] bg-white/[0.02]'}`}>
              {p.badge&&<div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[11px] font-bold px-4 py-1 rounded-full">{p.badge}</div>}
              <div className="mb-5">
                <p className="text-sm font-bold text-white/45 mb-1.5">{p.name}</p>
                <div className="flex items-end gap-1"><span className="text-4xl font-black text-white">{p.price}</span>{(p as any).per&&<span className="text-white/30 text-sm mb-1">{(p as any).per}</span>}</div>
                <p className="text-xs text-white/30 mt-1">{p.desc}</p>
              </div>
              <ul className="space-y-2.5 mb-6">{p.features.map(f=><li key={f} className="flex items-center gap-2 text-sm text-white/50"><Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0"/>{f}</li>)}</ul>
              <button onClick={onSignup} className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${p.hi?'bg-violet-600 hover:bg-violet-500 text-white hover:shadow-lg hover:shadow-violet-500/20':'border border-white/10 text-white/55 hover:bg-white/[0.05] hover:text-white'}`}>{p.cta}</button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ onSignup }: { onSignup: () => void }) {
  const { ref, inView } = useReveal();
  return (
    <section className="py-24 sm:py-32" ref={ref}>
      <div className="max-w-4xl mx-auto px-5 sm:px-8">
        <motion.div initial={{opacity:0,y:24}} animate={inView?{opacity:1,y:0}:{}} transition={{duration:0.7,ease}}
          className="relative rounded-3xl border border-white/[0.09] bg-gradient-to-br from-violet-600/10 via-white/[0.01] to-indigo-600/5 p-12 sm:p-16 text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"/>
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-violet-600/8 rounded-full blur-3xl"/>
          <div className="relative z-10">
            <Award className="h-10 w-10 text-violet-400 mx-auto mb-6 opacity-70"/>
            <h2 className="text-4xl sm:text-5xl font-black text-white mb-5 tracking-tight leading-tight">
              Start building your<br/><span className="bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">trading edge today</span>
            </h2>
            <p className="text-white/40 text-lg mb-10 max-w-lg mx-auto">Stop trading on gut feeling. Start trading on data. Free forever — upgrade when you're ready.</p>
            <button onClick={onSignup} className="group inline-flex items-center gap-3 bg-violet-600 hover:bg-violet-500 text-white px-10 py-4 rounded-2xl font-black text-sm transition-all hover:shadow-2xl hover:shadow-violet-500/25 hover:-translate-y-0.5">
              Start Free Now <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform"/>
            </button>
            <p className="text-[11px] text-white/15 mt-5">No credit card required · Free forever plan available</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/[0.05] py-10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center"><BarChart3 className="h-3.5 w-3.5 text-white"/></div>
          <span className="text-sm font-black text-white/50">TradeNova</span>
          <span className="text-white/15 text-xs">· The Trading Operating System</span>
        </div>
        <p className="text-xs text-white/15">© 2026 TradeNova. All rights reserved.</p>
        <div className="flex gap-5 text-xs text-white/20">
          <a href="#" className="hover:text-white/45 transition-colors">Privacy</a>
          <a href="#" className="hover:text-white/45 transition-colors">Terms</a>
          <a href="#" className="hover:text-white/45 transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  return (
    <div className="min-h-screen bg-[#06060f] text-white overflow-x-hidden">
      <Navbar onLogin={() => go('/login')} onSignup={() => go('/signup')} />
      <Hero onSignup={() => go('/signup')} />
      <StatsBar />
      <Features />
      <HowItWorks />
      <DashboardShowcase onSignup={() => go('/signup')} />
      <Testimonials />
      <Pricing onSignup={() => go('/signup')} />
      <FinalCTA onSignup={() => go('/signup')} />
      <Footer />
    </div>
  );
}
