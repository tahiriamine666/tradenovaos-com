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
import MarketingNavbar from '@/components/MarketingNavbar';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import BrokersStrip from '@/components/marketing/BrokersStrip';
import SeoHead from '@/components/SeoHead';

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
    <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl border-b border-slate-200' : ''}`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between h-16">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <BarChart3 className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="font-black text-slate-900 text-lg tracking-tight">TradeNova</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-slate-600">
          {['Features', 'How it Works', 'Pricing'].map(l => (
            <a key={l} href={`#${l.toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-slate-900 transition-colors">{l}</a>
          ))}
        </div>
        <div className="hidden md:flex items-center gap-3">
          <button onClick={onLogin} className="text-sm text-slate-700 hover:text-slate-900 px-4 py-2 transition-colors">Log in</button>
          <button onClick={onSignup} className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl font-bold transition-all hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-px">Start Free</button>
        </div>
        <button className="md:hidden text-slate-600 hover:text-slate-900 p-2" onClick={() => setOpen(v => !v)}
          aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden bg-white border-b border-slate-200 px-5 py-4 space-y-3">
            {['Features', 'How it Works', 'Pricing'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/\s+/g,'-')}`} className="block text-sm text-slate-600 hover:text-slate-900 py-1" onClick={() => setOpen(false)}>{l}</a>
            ))}
            <div className="flex gap-3 pt-2 border-t border-slate-200">
              <button onClick={onLogin} className="flex-1 text-sm border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-50">Log in</button>
              <button onClick={onSignup} className="flex-1 text-sm bg-violet-600 text-white py-2.5 rounded-xl font-bold hover:bg-violet-500">Start Free</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// Floating particles for cinematic background
const PARTICLES = Array.from({ length: 18 }).map((_, i) => ({
  id: i,
  x: (i * 53) % 100,
  y: (i * 37) % 100,
  size: 2 + (i % 3),
  delay: (i % 7) * 0.4,
  duration: 8 + (i % 5) * 2,
}));

function HeroBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Nebula glows — slow breathing */}
      <motion.div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[680px] bg-violet-500/15 rounded-full blur-[160px]"
        animate={{ opacity: [0.55, 0.95, 0.55], scale: [1, 1.06, 1] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-120px] left-[10%] w-[560px] h-[440px] bg-indigo-500/12 rounded-full blur-[130px]"
        animate={{ opacity: [0.4, 0.75, 0.4], x: [0, 40, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-[20%] right-[5%] w-[420px] h-[420px] bg-fuchsia-500/10 rounded-full blur-[120px]"
        animate={{ opacity: [0.3, 0.6, 0.3], y: [0, -30, 0] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,1) 1px,transparent 1px),linear-gradient(90deg,rgba(139,92,246,1) 1px,transparent 1px)`,
          backgroundSize: '72px 72px',
          maskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 40%, transparent 75%)',
        }}
      />

      {/* Particles */}
      {PARTICLES.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-violet-400/60"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, filter: 'blur(0.5px)' }}
          animate={{ y: [0, -40, 0], opacity: [0, 0.8, 0] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}

      {/* Scan line shimmer */}
      <motion.div
        className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-violet-400/50 to-transparent"
        animate={{ y: ['0vh', '100vh'] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}

// Live ticker metric — gently pulses around a base value
function LiveMetric({ base, prefix = '', suffix = '', decimals = 0, drift = 0, className = '' }: {
  base: number; prefix?: string; suffix?: string; decimals?: number; drift?: number; className?: string;
}) {
  const [val, setVal] = useState(0);
  const { ref, inView } = useReveal();
  const started = useRef(false);
  useEffect(() => {
    if (!inView) return;
    if (!started.current) {
      started.current = true;
      const s = performance.now();
      const dur = 1800;
      const tick = (now: number) => {
        const p = Math.min((now - s) / dur, 1);
        setVal((1 - Math.pow(1 - p, 3)) * base);
        if (p < 1) requestAnimationFrame(tick); else setVal(base);
      };
      requestAnimationFrame(tick);
    }
    if (!drift) return;
    const id = setInterval(() => {
      setVal(base + (Math.random() - 0.5) * 2 * drift);
    }, 1600);
    return () => clearInterval(id);
  }, [inView, base, drift]);
  const formatted = decimals
    ? val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(val).toLocaleString();
  return <span ref={ref} className={className}>{prefix}{formatted}{suffix}</span>;
}

function Hero({ onSignup }: { onSignup: () => void }) {
  return (
    <section className="relative min-h-[100dvh] flex flex-col items-center justify-center pt-20 pb-16 overflow-hidden">
      <HeroBackground />
      <div className="relative z-10 max-w-7xl mx-auto px-5 sm:px-8 w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
            <span className="text-xs font-semibold text-violet-700">AI-powered trading journal · Now in beta</span>
          </div>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08, ease }}
          className="text-center text-5xl sm:text-6xl lg:text-[76px] font-black text-slate-900 leading-[1.02] tracking-[-0.03em] mb-6">
          The Trading OS<br />
          <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">Built For Serious Traders</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}
          className="text-center text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
          Plan your trades, journal your execution, analyze your edge,<br className="hidden sm:block" />
          and improve with data — all in one place.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-7">
          <button onClick={onSignup} className="group flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all hover:shadow-2xl hover:shadow-violet-500/30 hover:-translate-y-0.5 w-full sm:w-auto justify-center">
            Start Free — No credit card <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="flex items-center gap-2.5 text-slate-600 hover:text-slate-900 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 px-7 py-4 rounded-2xl font-semibold text-sm transition-all w-full sm:w-auto justify-center">
            <PlayCircle className="h-4 w-4" /> Watch Demo
          </button>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs text-slate-700 mb-16">
          {['Free forever plan', 'No credit card required', 'Setup in 2 minutes', '143 traders trust TradeNova'].map(t => (
            <span key={t} className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" />{t}</span>
          ))}
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 60, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.3, ease }}
          className="relative w-full max-w-[1180px] mx-auto pb-12 sm:pb-20"
        >
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-40 bg-violet-600/15 blur-3xl rounded-full pointer-events-none" />

          {/* Floating accent cards — cinematic depth */}
          <motion.div
            initial={{ opacity: 0, x: -40, y: 20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4, ease }}
            className="hidden md:block absolute -left-6 lg:-left-16 top-[28%] z-20"
          >
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
              className="rounded-2xl bg-white/95 backdrop-blur-xl border border-violet-100 shadow-2xl shadow-violet-500/20 p-3 w-[210px]"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase">Trade Closed</p>
                  <p className="text-[11px] font-bold text-slate-900">NQ · Long</p>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <span className="text-lg font-black font-mono text-emerald-600">+$480</span>
                <span className="text-[9px] text-slate-400">+2.4R</span>
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.8, delay: 1.6, ease }}
            className="hidden md:block absolute -right-4 lg:-right-12 top-[14%] z-20"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
              className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 border border-violet-400/40 shadow-2xl shadow-violet-700/40 p-3 w-[220px] text-white"
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-violet-200" />
                <p className="text-[9px] font-bold tracking-wider uppercase text-violet-100">AI Insight</p>
              </div>
              <p className="text-[11px] leading-snug text-white/90">
                Your <span className="font-bold">pullback setups</span> win 84% before 11AM EST.
              </p>
              <div className="mt-2 h-1 rounded-full bg-white/15 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '84%' }}
                  transition={{ duration: 1.4, delay: 2 }}
                  className="h-full bg-emerald-300"
                />
              </div>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.9, ease }}
            className="hidden lg:block absolute -right-8 bottom-[18%] z-20"
          >
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
              className="rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl shadow-slate-900/10 p-3 w-[190px]"
            >
              <p className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase mb-1">Trader Score</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-black font-mono text-violet-600">82</span>
                <span className="text-[10px] text-slate-400">/100</span>
                <span className="ml-auto text-[9px] font-bold text-emerald-600">▲ +4</span>
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 10 }).map((_, i) => (
                  <motion.span
                    key={i}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{ duration: 0.4, delay: 2.1 + i * 0.05 }}
                    className={`flex-1 h-3 rounded-sm origin-bottom ${i < 8 ? 'bg-violet-500' : 'bg-slate-200'}`}
                  />
                ))}
              </div>
            </motion.div>
          </motion.div>

          <div className="relative rounded-3xl border border-white/[0.06] bg-[#0a0a14] overflow-hidden shadow-2xl shadow-black/60">
            {/* Browser chrome */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-8 py-1 text-[11px] text-white/30">app.tradenovaos.com/dashboard</div>
              </div>
            </div>

            {/* Dashboard body — premium light theme matching real app */}
            <div className="flex bg-slate-50">
              {/* Sidebar */}
              <div className="hidden sm:flex w-44 lg:w-[210px] flex-col border-r border-slate-200 bg-white p-3 flex-shrink-0">
                <div className="flex items-center gap-2 mb-4 px-1">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-sm shadow-violet-500/30">
                    <BarChart3 className="h-[18px] w-[18px] text-white" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[12px] font-black text-slate-900 tracking-tight">TradeNova</p>
                    <p className="text-[8px] font-semibold text-slate-400 tracking-[0.12em]">TRADING OS</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-0.5">
                  {[
                    {l:'Command Center', a:true},
                    {l:'Trade Plan'},
                    {l:'Trade Vault'},
                    {l:'Mind Journal'},
                    {l:'Edge Analytics'},
                    {l:'Playbook Lab'},
                    {l:'Import CSV'},
                    {l:'Replay Studio'},
                    {l:'Learning Hub'},
                    {l:'Studio Settings'},
                  ].map(item => (
                    <div key={item.l} className={`text-[11px] px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 ${item.a ? 'bg-violet-600 text-white shadow-sm shadow-violet-500/30' : 'text-slate-500'}`}>
                      <span className="w-1 h-1 rounded-full bg-current opacity-60" />
                      {item.l}
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-2.5">
                  <p className="text-[10px] font-black text-slate-900">Upgrade to Pro</p>
                  <p className="text-[8px] text-slate-500 mt-0.5 leading-tight">Unlock AI, CSV import, playbooks</p>
                  <div className="mt-2 bg-violet-600 text-white text-[9px] font-bold py-1.5 rounded-md text-center shadow-sm shadow-violet-500/30">Start 7-day free trial</div>
                </div>
                <div className="mt-2 flex items-center gap-2 pt-2 border-t border-slate-100">
                  <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center">U</div>
                  <div className="leading-tight">
                    <p className="text-[10px] font-bold text-slate-900">Trader</p>
                    <span className="text-[7px] font-semibold text-violet-700 bg-violet-100 px-1.5 rounded">Free</span>
                  </div>
                </div>
              </div>

              {/* Main */}
              <div className="flex-1 min-w-0 flex flex-col">
                {/* Top bar */}
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 bg-white">
                  <p className="text-[11px] font-semibold text-slate-700">Command Center</p>
                  <div className="flex items-center gap-1.5">
                    {['All Time','Filters','All Accounts'].map(t => (
                      <div key={t} className="text-[9px] font-medium text-slate-600 border border-slate-200 rounded-lg px-2.5 py-1 bg-white">{t} ▾</div>
                    ))}
                    <div className="w-6 h-6 rounded-full bg-violet-600 text-white text-[9px] font-bold flex items-center justify-center ml-1">U</div>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[18px] font-black text-slate-900 leading-tight">Command Center</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Wednesday, May 13</p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 bg-violet-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm shadow-violet-500/30">+ New Trade</div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {[
                      {l:'Total P&L', v:<><LiveMetric base={12480} prefix="+$" drift={6} /></>, sub:'From 143 trades', Icon:TrendingUp},
                      {l:'Win Rate',  v:<><LiveMetric base={68} suffix="%" drift={0.4} /></>, sub:'97 wins · 46 losses', Icon:Target},
                      {l:'Avg R:R',   v:<>1:<LiveMetric base={3.2} decimals={1} drift={0.05} /></>, sub:'Across logged R:R', Icon:LineChart},
                      {l:'Trades',    v:<><LiveMetric base={143} /></>, sub:'Total logged trades', Icon:BarChart3},
                    ].map((m,i) => (
                      <motion.div key={m.l} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:0.6+i*0.08}}
                        className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1 font-semibold">{m.l}</p>
                            <p className="text-xl font-black font-mono text-violet-600">{m.v}</p>
                            <p className="text-[9px] text-slate-400 mt-0.5">{m.sub}</p>
                          </div>
                          <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center">
                            <m.Icon className="h-3.5 w-3.5 text-violet-600" />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.8}} className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[12px] font-bold text-slate-900">Equity Curve</p>
                          <p className="text-[9px] text-slate-400">Cumulative P&L over time</p>
                        </div>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">+$12,480</span>
                      </div>
                      <ResponsiveContainer width="100%" height={140}>
                        <AreaChart data={EQUITY_DATA} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                          <defs><linearGradient id="hg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.32}/><stop offset="100%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="2 4" stroke="#e2e8f0" vertical={false} />
                          <XAxis dataKey="day" tick={{fontSize:8, fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fontSize:8, fill:'#94a3b8'}} axisLine={false} tickLine={false} />
                          <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fill="url(#hg)" dot={false}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    </motion.div>

                    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.85}} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[12px] font-bold text-slate-900">Today Focus</p>
                          <p className="text-[9px] text-slate-400">Pre-market plan</p>
                        </div>
                        <span className="text-[9px] font-semibold text-violet-600">Edit ›</span>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 mb-2">
                        <p className="text-[8px] text-slate-400 font-bold tracking-wider uppercase">BIAS</p>
                        <p className="text-[10px] text-slate-700 font-medium mt-0.5">Long NQ above 18,400 · trim into 18,520</p>
                      </div>
                      <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-2 flex items-start gap-1.5">
                        <Sparkles className="h-3 w-3 text-violet-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[8px] text-violet-600 font-bold tracking-wider uppercase">AI HINT</p>
                          <p className="text-[10px] text-slate-700 leading-snug mt-0.5">Win rate climbs 14% on pullback setups before noon EST.</p>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:0.95}} className="lg:col-span-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[12px] font-bold text-slate-900">Trading Calendar</p>
                          <p className="text-[9px] text-slate-400">Monthly P&L heatmap</p>
                        </div>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-semibold">
                          <span className="px-1">‹</span>May 2026<span className="px-1">›</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-7 gap-1 mb-1">
                        {['S','M','T','W','T','F','S'].map((d,i) => (
                          <div key={i} className="text-[8px] text-slate-400 text-center font-semibold">{d}</div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {Array.from({length: 35}).map((_, i) => {
                          const day = i - 4;
                          const r = Math.sin((day+1) * 1.7);
                          const has = day >= 1 && day <= 31 && (day % 4 !== 0);
                          const win = r > -0.2;
                          return (
                            <div key={i} className={`aspect-square rounded-md flex items-center justify-center text-[8px] font-bold ${
                              day < 1 || day > 31 ? 'bg-transparent' :
                              !has ? 'bg-slate-50 text-slate-300' :
                              win ? 'bg-emerald-100 border border-emerald-200 text-emerald-700' :
                                    'bg-red-100 border border-red-200 text-red-700'
                            }`}>{day >=1 && day <= 31 ? day : ''}</div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[8px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />Profit</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-500" />Loss</span>
                      </div>
                    </motion.div>

                    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1}} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-[12px] font-bold text-slate-900">Trader Score</p>
                          <p className="text-[9px] text-slate-400">Overall performance</p>
                        </div>
                        <div className="text-right leading-none">
                          <span className="text-2xl font-black text-violet-600 font-mono">82</span>
                          <span className="text-[9px] text-slate-400">/100</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {SCORE_ITEMS.map((s,i) => (
                          <div key={s.label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-slate-700 font-medium">{s.label}</span>
                              <span className="text-[10px] font-bold font-mono text-slate-900">{s.value}</span>
                            </div>
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div initial={{width:0}} animate={{width:`${s.value}%`}} transition={{duration:0.7,delay:1+i*0.08}} className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"/>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.1}} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-[12px] font-bold text-slate-900">Recent Trades</p>
                          <p className="text-[9px] text-slate-400">Last executions</p>
                        </div>
                        <span className="text-[9px] text-violet-600 font-semibold">View all ›</span>
                      </div>
                      <div className="space-y-1.5">
                        {RECENT_TRADES.map((t,i) => (
                          <motion.div key={i} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{delay:1.2+i*0.05}}
                            className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-slate-100 bg-slate-50/60">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-1.5 h-1.5 rounded-full ${t.win ? 'bg-emerald-500' : 'bg-red-500'}`} />
                              <div className="leading-tight min-w-0">
                                <p className="text-[10px] font-bold text-slate-900 truncate">{t.pair}</p>
                                <p className="text-[8px] text-slate-500">{t.side} · {t.date}</p>
                              </div>
                            </div>
                            <p className={`text-[11px] font-bold font-mono ${t.win ? 'text-emerald-600' : 'text-red-600'}`}>{t.result>0?'+':'-'}${Math.abs(t.result)}</p>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div initial={{opacity:0}} animate={{opacity:1}} transition={{delay:1.15}} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                      <p className="text-[12px] font-bold text-slate-900 mb-0.5">Best Setups</p>
                      <p className="text-[9px] text-slate-400 mb-2">P&L by setup type</p>
                      <div className="space-y-2.5">
                        {SETUP_DATA.map((s,i) => (
                          <div key={s.name}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-slate-700 font-medium">{s.name}</span>
                              <span className="text-[10px] font-bold font-mono text-emerald-600">+${s.value.toLocaleString()}</span>
                            </div>
                            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div initial={{width:0}} animate={{width:`${s.pct}%`}} transition={{duration:0.7,delay:1.25+i*0.08}} className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"/>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  </div>
                </div>
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
    <section ref={ref} className="py-12 border-y border-slate-200 bg-slate-50">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[{l:'Avg P&L improvement',to:34,suf:'%',pre:'+'},{l:'Trades analyzed',to:48000,suf:'+'},{l:'Win rate increase',to:18,suf:'%',pre:'+'},{l:'Active traders',to:143,suf:'+'}].map((s,i) => (
          <motion.div key={s.l} initial={{opacity:0,y:12}} animate={inView?{opacity:1,y:0}:{}} transition={{delay:i*0.08}} className="text-center">
            <p className="text-3xl sm:text-4xl font-black text-slate-900 mb-1 font-mono">{inView && <CountUp to={s.to} prefix={s.pre??''} suffix={s.suf} duration={1.6}/>}</p>
            <p className="text-xs text-slate-500">{s.l}</p>
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
  violet: {bg:'bg-violet-500/8',  b:'border-violet-500/20',  t:'text-violet-600',  bd:'bg-violet-500/15 text-violet-700'},
  blue:   {bg:'bg-blue-500/8',    b:'border-blue-500/20',    t:'text-blue-600',    bd:'bg-blue-500/15 text-blue-700'},
  pink:   {bg:'bg-pink-500/8',    b:'border-pink-500/20',    t:'text-pink-600',    bd:'bg-pink-500/15 text-pink-700'},
  emerald:{bg:'bg-emerald-500/8', b:'border-emerald-500/20', t:'text-emerald-600', bd:'bg-emerald-500/15 text-emerald-700'},
  amber:  {bg:'bg-amber-500/8',   b:'border-amber-500/20',   t:'text-amber-600',   bd:'bg-amber-500/15 text-amber-700'},
  purple: {bg:'bg-purple-500/8',  b:'border-purple-500/20',  t:'text-purple-600',  bd:'bg-purple-500/15 text-purple-700'},
  cyan:   {bg:'bg-cyan-500/8',    b:'border-cyan-500/20',    t:'text-cyan-600',    bd:'bg-cyan-500/15 text-cyan-700'},
  green:  {bg:'bg-green-500/8',   b:'border-green-500/20',   t:'text-green-600',   bd:'bg-green-500/15 text-green-700'},
};

function Features() {
  const { ref, inView } = useReveal();
  return (
    <section id="features" className="py-24 sm:py-32" ref={ref}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <motion.div initial={{opacity:0,y:24}} animate={inView?{opacity:1,y:0}:{}} transition={{duration:0.5}} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-5">
            <Activity className="h-3.5 w-3.5 text-violet-600" />
            <span className="text-xs font-semibold text-violet-700">Complete trading stack</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4 tracking-tight">Everything you need to improve</h2>
          <p className="text-slate-600 text-lg max-w-xl mx-auto">Eight tools that work together to turn trading data into consistent edge.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f,i) => {
            const Icon = f.icon; const c = CM[f.c];
            return (
              <motion.div key={f.title}
                initial={{opacity:0,y:20}} animate={inView?{opacity:1,y:0}:{}} transition={{duration:0.5,delay:i*0.06,ease}}
                whileHover={{y:-4,transition:{duration:0.2}}}
                className="group rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300 cursor-default"
              >
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${c.bg} border ${c.b} mb-3`}>
                  <Icon className={`h-5 w-5 ${c.t}`} />
                </div>
                <div className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full ${c.bd} mb-2 ml-2`}>{f.tag}</div>
                <h3 className="font-bold text-slate-900 mb-1.5 text-sm">{f.title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
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
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4 tracking-tight">Plan → Execute → Review → Improve</h2>
          <p className="text-slate-600 text-lg max-w-xl mx-auto">A closed-loop operating system for your trading career.</p>
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
                <div className="text-[11px] font-mono text-slate-400 mb-1">{s.n}</div>
                <h3 className="text-xl font-black text-slate-900 mb-2">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
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
            <BarChart3 className="h-3.5 w-3.5 text-violet-600" />
            <span className="text-xs font-semibold text-violet-700">Live dashboard preview</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4 tracking-tight">Your edge, visualized</h2>
          <p className="text-slate-600 text-lg max-w-xl mx-auto">Real-time metrics, charts, and insights — all in one command center.</p>
        </motion.div>

        <motion.div initial={{opacity:0,y:40}} animate={inView?{opacity:1,y:0}:{}} transition={{duration:0.8,ease}}
          className="rounded-3xl border border-white/[0.06] bg-[#08080f] overflow-hidden shadow-2xl shadow-violet-900/15">
          <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-white/[0.06]">
            {[
              {l:'Total P&L', v:'+$12,480.75', c:'text-emerald-400'},
              {l:'Win Rate',  v:'68%',          c:'text-white'},
              {l:'Avg R:R',   v:'1:3.2',        c:'text-blue-400'},
              {l:'Trades',    v:'143',           c:'text-violet-400'},
            ].map((m,i) => (
              <motion.div key={m.l} initial={{opacity:0}} animate={inView?{opacity:1}:{}} transition={{delay:0.1+i*0.07}}
                className="p-5 sm:p-6 border-r border-white/[0.06] last:border-0">
                <p className="text-[11px] text-white/30 uppercase tracking-wider mb-2">{m.l}</p>
                <p className={`text-2xl sm:text-3xl font-black font-mono ${m.c}`}>{m.v}</p>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 border-b border-white/[0.06]">
            <div className="lg:col-span-2 p-5 sm:p-6 border-r border-white/[0.06]">
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
                    <div className="flex justify-between mb-1.5"><span className="text-xs text-white/30">{s.label}</span><span className="text-xs font-bold" style={{color:s.color}}>{s.value}</span></div>
                    <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                      <motion.div initial={{width:0}} animate={inView?{width:`${s.value}%`}:{}} transition={{duration:0.9,delay:0.3+i*0.1,ease}} className="h-full rounded-full" style={{background:s.color}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <div className="p-5 sm:p-6 border-r border-white/[0.06]">
              <p className="text-sm font-bold text-white mb-4">Recent Trades</p>
              <div className="space-y-1">
                {RECENT_TRADES.map((t,i) => (
                  <motion.div key={i} initial={{opacity:0,x:-6}} animate={inView?{opacity:1,x:0}:{}} transition={{delay:0.15+i*0.07}}
                    className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0 hover:bg-white rounded-lg px-2 -mx-2 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-1 h-6 rounded-full ${t.win?'bg-emerald-500':'bg-red-500'}`}/>
                      <div><p className="text-sm font-semibold text-white">{t.pair}</p><p className="text-[10px] text-white/30">{t.side} · {t.date}</p></div>
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
                        <span className="text-[10px] text-white/30">{s.pct}% WR</span>
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
          <p className="text-xs text-slate-400 mt-3">No credit card · Free forever plan available</p>
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
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-3 tracking-tight">Traders love TradeNova</h2>
          <p className="text-slate-500">Join traders who turned data into consistent edge.</p>
        </motion.div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tms.map((t,i) => (
            <motion.div key={t.name} initial={{opacity:0,y:16}} animate={inView?{opacity:1,y:0}:{}} transition={{delay:i*0.09,duration:0.5}} whileHover={{y:-4,transition:{duration:0.2}}}
              className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-slate-300 hover:bg-slate-50 transition-all">
              <div className="flex gap-0.5 mb-4">{[1,2,3,4,5].map(j=><Star key={j} className="h-3.5 w-3.5 text-amber-600 fill-amber-400"/>)}</div>
              <p className="text-sm text-slate-700 leading-relaxed mb-5">"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-violet-600/25 border border-violet-500/25 flex items-center justify-center text-[11px] font-bold text-violet-700">{t.av}</div>
                <div><p className="text-sm font-bold text-slate-900">{t.name}</p><p className="text-[11px] text-slate-500">{t.role}</p></div>
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
    {name:'Pro',   price:'$14', per:'/mo',desc:'Serious traders',badge:'Most Popular',features:['Unlimited trades','Full analytics','CSV import','AI insights','Playbook lab','Trade plan'],cta:'Start 7-day Free Trial',hi:true},
    {name:'Elite', price:'$28', per:'/mo',desc:'Funded traders', features:['Everything in Pro','Replay studio','API access','Unlimited AI','Priority support'],cta:'Start 7-day Free Trial',hi:false},
  ];
  return (
    <section id="pricing" className="py-24 sm:py-32 relative" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/6 to-transparent pointer-events-none"/>
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <motion.div initial={{opacity:0,y:24}} animate={inView?{opacity:1,y:0}:{}} transition={{duration:0.5}} className="text-center mb-14">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-5">
            <span className="text-xs font-semibold text-amber-700">🔄 Stripe coming soon · Manual activation via Payoneer</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-4 tracking-tight">Simple, honest pricing</h2>
          <p className="text-slate-500">Start free. Upgrade when you're ready.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p,i) => (
            <motion.div key={p.name} initial={{opacity:0,y:20}} animate={inView?{opacity:1,y:0}:{}} transition={{delay:i*0.09,duration:0.5}}
              className={`relative rounded-2xl p-6 border ${p.hi?'border-violet-500/40 bg-violet-600/5 shadow-xl shadow-violet-500/10':'border-slate-200 bg-white'}`}>
              {p.badge&&<div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-[11px] font-bold px-4 py-1 rounded-full">{p.badge}</div>}
              <div className="mb-5">
                <p className="text-sm font-bold text-slate-600 mb-1.5">{p.name}</p>
                <div className="flex items-end gap-1"><span className="text-4xl font-black text-slate-900">{p.price}</span>{(p as any).per&&<span className="text-slate-500 text-sm mb-1">{(p as any).per}</span>}</div>
                <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
              </div>
              <ul className="space-y-2.5 mb-6">{p.features.map(f=><li key={f} className="flex items-center gap-2 text-sm text-slate-600"><Check className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0"/>{f}</li>)}</ul>
              <button onClick={onSignup} className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${p.hi?'bg-violet-600 hover:bg-violet-500 text-slate-900 hover:shadow-lg hover:shadow-violet-500/20':'border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}>{p.cta}</button>
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
          className="relative rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-600/10 via-white/[0.01] to-indigo-600/5 p-12 sm:p-16 text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent"/>
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-violet-600/8 rounded-full blur-3xl"/>
          <div className="relative z-10">
            <Award className="h-10 w-10 text-violet-600 mx-auto mb-6 opacity-70"/>
            <h2 className="text-4xl sm:text-5xl font-black text-slate-900 mb-5 tracking-tight leading-tight">
              Start building your<br/><span className="bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">trading edge today</span>
            </h2>
            <p className="text-slate-600 text-lg mb-10 max-w-lg mx-auto">Stop trading on gut feeling. Start trading on data. Free forever — upgrade when you're ready.</p>
            <button onClick={onSignup} className="group inline-flex items-center gap-3 bg-violet-600 hover:bg-violet-500 text-white px-10 py-4 rounded-2xl font-black text-sm transition-all hover:shadow-2xl hover:shadow-violet-500/25 hover:-translate-y-0.5">
              Start Free Now <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform"/>
            </button>
            <p className="text-[11px] text-slate-400 mt-5">No credit card required · Free forever plan available</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-slate-200 py-10">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-violet-600 flex items-center justify-center"><BarChart3 className="h-3.5 w-3.5 text-white"/></div>
          <span className="text-sm font-black text-slate-600">TradeNova</span>
          <span className="text-slate-400 text-xs">· The Trading Operating System</span>
        </div>
        <p className="text-xs text-slate-400">© 2026 TradeNova. All rights reserved.</p>
        <div className="flex gap-5 text-xs text-slate-400">
          <a href="#" className="hover:text-slate-600 transition-colors">Privacy</a>
          <a href="#" className="hover:text-slate-600 transition-colors">Terms</a>
          <a href="#" className="hover:text-slate-600 transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const go = (path: string) => navigate(path);
  return (
    <div className="landing-light min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <SeoHead
        path="/"
        title="TradeNova OS — Trading journal, analytics & playbooks"
        description="Plan trades, journal every execution, and improve with AI insights. TradeNova OS is the Trading Operating System for serious traders."
      />
      <MarketingNavbar onLogin={() => go('/login')} onSignup={() => go('/signup')} />
      <main id="main-content">
        <Hero onSignup={() => go('/signup')} />
        <BrokersStrip />
        <StatsBar />
        <Features />
        <HowItWorks />
        <DashboardShowcase onSignup={() => go('/signup')} />
        <Testimonials />
        <Pricing onSignup={() => go('/signup')} />
        <FinalCTA onSignup={() => go('/signup')} />
      </main>
      <MarketingFooter />
    </div>
  );
}
