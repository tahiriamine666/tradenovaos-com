// src/pages/LandingPage.tsx
// Premium TradeNova landing page — shown to unauthenticated visitors.
// Authenticated users get redirected to /app (dashboard).

import React, { useState, useEffect, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import {
  BarChart3, BookOpen, Brain, Target, PlayCircle, Sparkles,
  ArrowRight, Check, ChevronRight, TrendingUp, Shield,
  Zap, Crown, Star, Menu, X, Activity,
} from 'lucide-react';

// ─── Animation helpers ────────────────────────────────────────────────────────
const fadeUp = {
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};
const stagger = (delay = 0) => ({
  hidden:  { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] } },
});

function useReveal() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return { ref, inView };
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ onLogin, onSignup }: { onLogin: () => void; onSignup: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'bg-[#0a0a0f]/90 backdrop-blur-xl border-b border-white/5' : ''
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/tradenova-icon.png" alt="TradeNova" className="w-8 h-8 rounded-lg"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            <span className="font-bold text-white text-lg tracking-tight">TradeNova</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'How it Works', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="text-sm text-white/60 hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <button onClick={onLogin}
              className="text-sm text-white/70 hover:text-white transition-colors px-4 py-2">
              Log in
            </button>
            <button onClick={onSignup}
              className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-violet-500/25">
              Start Free
            </button>
          </div>

          {/* Mobile menu */}
          <button className="md:hidden text-white/70 hover:text-white" onClick={() => setMenuOpen(v => !v)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="md:hidden bg-[#0d0d14] border-b border-white/5 px-6 py-4 space-y-4">
            {['Features', 'How it Works', 'Pricing'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="block text-sm text-white/60 hover:text-white py-1" onClick={() => setMenuOpen(false)}>
                {item}
              </a>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={onLogin} className="flex-1 text-sm border border-white/10 text-white/70 py-2 rounded-lg hover:bg-white/5 transition-colors">Log in</button>
              <button onClick={onSignup} className="flex-1 text-sm bg-violet-600 text-white py-2 rounded-lg font-medium hover:bg-violet-500 transition-colors">Start Free</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onSignup }: { onSignup: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-violet-900/15 rounded-full blur-[80px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[80px]" />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-8">
          <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-medium text-violet-300">AI-powered trading journal</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-[1.05] tracking-tight mb-6"
        >
          The Trading OS<br />
          <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">
            Built For Serious Traders
          </span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed"
        >
          Plan your trades, journal your execution, analyze your edge,<br className="hidden sm:block" />
          and improve with data — all in one place.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          <button onClick={onSignup}
            className="group flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-8 py-3.5 rounded-xl font-semibold text-sm transition-all hover:shadow-2xl hover:shadow-violet-500/30 hover:-translate-y-0.5">
            Start Free — No credit card
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="flex items-center gap-2 text-white/60 hover:text-white px-6 py-3.5 rounded-xl font-medium text-sm border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all">
            <PlayCircle className="h-4 w-4" /> Watch Demo
          </button>
        </motion.div>

        {/* Social proof bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="flex items-center justify-center gap-6 text-xs text-white/30 mb-16">
          <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Free forever plan</span>
          <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> No credit card</span>
          <span className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Setup in 2 minutes</span>
        </motion.div>

        {/* Dashboard mockup */}
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="relative max-w-5xl mx-auto"
        >
          {/* Glow under mockup */}
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-violet-600/20 blur-3xl rounded-full" />

          {/* Mock dashboard */}
          <div className="relative rounded-2xl border border-white/10 bg-[#0d0d14] overflow-hidden shadow-2xl shadow-black/50">
            {/* Window chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="bg-white/5 rounded-md px-6 py-1 text-xs text-white/20">app.tradenova.io</div>
              </div>
            </div>

            {/* Dashboard content mockup */}
            <div className="flex">
              {/* Sidebar mockup */}
              <div className="hidden sm:flex w-48 flex-col border-r border-white/5 p-4 gap-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-violet-600" />
                  <div className="text-xs font-bold text-white">TradeNova</div>
                </div>
                {[
                  { label: 'Command Center', active: true },
                  { label: 'Trade Vault', active: false },
                  { label: 'Mind Journal', active: false },
                  { label: 'Edge Analytics', active: false },
                  { label: 'AI Insights', active: false },
                ].map(item => (
                  <div key={item.label} className={`text-xs px-3 py-2 rounded-lg ${item.active ? 'bg-violet-600 text-white' : 'text-white/30'}`}>
                    {item.label}
                  </div>
                ))}
              </div>

              {/* Main content mockup */}
              <div className="flex-1 p-4 sm:p-6 space-y-4">
                {/* Metric cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total P&L', value: '+$4,280', color: 'text-emerald-400' },
                    { label: 'Win Rate', value: '68%', color: 'text-white' },
                    { label: 'Avg R:R', value: '2.4', color: 'text-white' },
                    { label: 'Trades', value: '47', color: 'text-white' },
                  ].map(card => (
                    <div key={card.label} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                      <p className="text-[10px] text-white/30 mb-1">{card.label}</p>
                      <p className={`text-lg font-bold font-mono ${card.color}`}>{card.value}</p>
                    </div>
                  ))}
                </div>

                {/* Chart mockup */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/30 mb-3">Equity Curve</p>
                    <svg viewBox="0 0 200 60" className="w-full h-16">
                      <defs>
                        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,50 C20,45 40,40 60,30 C80,20 100,25 120,15 C140,5 160,10 180,5 L200,3 L200,60 L0,60 Z"
                        fill="url(#equityGrad)" />
                      <path d="M0,50 C20,45 40,40 60,30 C80,20 100,25 120,15 C140,5 160,10 180,5 L200,3"
                        fill="none" stroke="#7c3aed" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                    <p className="text-xs text-white/30 mb-3">Setup Performance</p>
                    <div className="space-y-2">
                      {[
                        { name: 'Pullback', pct: 80, color: 'bg-emerald-500' },
                        { name: 'ORB', pct: 60, color: 'bg-violet-500' },
                        { name: 'Breakout', pct: 40, color: 'bg-amber-500' },
                      ].map(s => (
                        <div key={s.name} className="flex items-center gap-2">
                          <span className="text-[10px] text-white/30 w-14">{s.name}</span>
                          <div className="flex-1 bg-white/5 rounded-full h-1.5">
                            <div className={`h-full rounded-full ${s.color}`} style={{ width: `${s.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
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

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: BookOpen,    title: 'Trade Journal',   desc: 'Log every trade with emotion, execution score, and outcome. Build habits that compound.', color: 'from-violet-500/20 to-violet-600/5', accent: 'text-violet-400' },
  { icon: BarChart3,   title: 'Edge Analytics',  desc: 'Win rate, profit factor, expectancy — know exactly where your edge lives and where it breaks.', color: 'from-blue-500/20 to-blue-600/5', accent: 'text-blue-400' },
  { icon: Brain,       title: 'Mind Journal',    desc: 'Track emotions, biases, and mental state. Separate disciplined days from revenge-trading spirals.', color: 'from-pink-500/20 to-pink-600/5', accent: 'text-pink-400' },
  { icon: Target,      title: 'Playbook Lab',    desc: 'Define your setups, entry rules, and checklists. Execute with a system, not a feeling.', color: 'from-emerald-500/20 to-emerald-600/5', accent: 'text-emerald-400' },
  { icon: PlayCircle,  title: 'Replay Studio',   desc: 'Replay any session bar by bar. Practice without risk. Score your simulated executions.', color: 'from-amber-500/20 to-amber-600/5', accent: 'text-amber-400' },
  { icon: Sparkles,    title: 'AI Insights',     desc: 'Claude analyzes your trades and finds patterns you\'d never catch manually. Your personal trading coach.', color: 'from-purple-500/20 to-purple-600/5', accent: 'text-purple-400' },
];

function Features() {
  const { ref, inView } = useReveal();
  return (
    <section id="features" className="py-24 sm:py-32 relative" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/5 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} initial="hidden" animate={inView ? 'visible' : 'hidden'} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-6">
            <Activity className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-medium text-violet-300">Everything you need</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">Your complete trading stack</h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">Six tools that work together to turn trading data into consistent performance.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title}
                variants={stagger(i * 0.08)}
                initial="hidden" animate={inView ? 'visible' : 'hidden'}
                className="group relative rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 hover:border-white/20 hover:bg-white/[0.04] transition-all duration-300 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className="relative z-10">
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 mb-4`}>
                    <Icon className={`h-5 w-5 ${f.accent}`} />
                  </div>
                  <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── How it works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const { ref, inView } = useReveal();
  const steps = [
    { num: '01', title: 'Plan', desc: 'Set your bias, mark key levels, define your setups and risk before the market opens.', icon: Target, color: 'violet' },
    { num: '02', title: 'Execute', desc: 'Follow your playbook. Log every trade with full context — entry, exit, emotion, execution.', icon: Zap, color: 'blue' },
    { num: '03', title: 'Review', desc: 'Analyze your session. Win rate, profit factor, setup performance, mistakes made.', icon: BarChart3, color: 'emerald' },
    { num: '04', title: 'Improve', desc: 'AI finds the patterns. You get specific action items to raise your edge week over week.', icon: TrendingUp, color: 'purple' },
  ];

  const colorMap: Record<string, string> = {
    violet:  'border-violet-500/30 text-violet-400 bg-violet-500/10',
    blue:    'border-blue-500/30 text-blue-400 bg-blue-500/10',
    emerald: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10',
    purple:  'border-purple-500/30 text-purple-400 bg-purple-500/10',
  };

  return (
    <section id="how-it-works" className="py-24 sm:py-32" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} initial="hidden" animate={inView ? 'visible' : 'hidden'} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs font-medium text-violet-300">The system</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">Plan → Execute → Review → Improve</h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">A closed-loop operating system for your trading career.</p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <motion.div key={step.title} variants={stagger(i * 0.1)} initial="hidden" animate={inView ? 'visible' : 'hidden'}
                className="relative">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-full w-full h-px bg-gradient-to-r from-white/10 to-transparent z-0" />
                )}
                <div className="relative z-10 text-center">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl border mb-5 ${colorMap[step.color]}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <div className="text-xs font-mono text-white/20 mb-1">{step.num}</div>
                  <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
const TESTIMONIALS = [
  { name: 'Alex M.', role: 'Forex Trader · 3 years', text: 'TradeNova showed me I was 40% less profitable after 2pm. I changed my session hours and my drawdown dropped in half.', stars: 5 },
  { name: 'Sarah K.', role: 'Futures Trader · Funded', text: 'The AI insights found that I was over-trading on news days. No coach ever told me that. Data doesn\'t lie.', stars: 5 },
  { name: 'Omar B.', role: 'Crypto Trader', text: 'Finally a journal that I actually use. The playbook system keeps me accountable to my own rules every single day.', stars: 5 },
];

function Testimonials() {
  const { ref, inView } = useReveal();
  return (
    <section className="py-24 sm:py-32" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} initial="hidden" animate={inView ? 'visible' : 'hidden'} className="text-center mb-16">
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">Traders love TradeNova</h2>
          <p className="text-white/50">Join traders who turned data into consistent edge.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t, i) => (
            <motion.div key={t.name} variants={stagger(i * 0.1)} initial="hidden" animate={inView ? 'visible' : 'hidden'}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 hover:border-white/15 transition-colors">
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-white/70 text-sm leading-relaxed mb-5">"{t.text}"</p>
              <div>
                <p className="text-sm font-semibold text-white">{t.name}</p>
                <p className="text-xs text-white/30">{t.role}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Pricing preview ──────────────────────────────────────────────────────────
function PricingPreview({ onSignup }: { onSignup: () => void }) {
  const { ref, inView } = useReveal();
  const plans = [
    { name: 'Free', price: '$0', desc: 'Start tracking', icon: Zap, features: ['50 trades/month', 'Basic analytics', 'Trade journal', 'Calendar'], cta: 'Start Free', highlight: false },
    { name: 'Pro', price: '$29', per: '/mo', desc: 'Serious traders', icon: Zap, features: ['Unlimited trades', 'AI insights', 'CSV import', 'Playbook lab', 'Advanced analytics'], cta: 'Start Trial', highlight: true, badge: 'Most Popular' },
    { name: 'Elite', price: '$59', per: '/mo', desc: 'Funded traders', icon: Crown, features: ['Everything in Pro', 'Replay studio', 'API access', 'Priority support'], cta: 'Start Trial', highlight: false },
  ];

  return (
    <section id="pricing" className="py-24 sm:py-32 relative" ref={ref}>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/10 to-transparent pointer-events-none" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div variants={fadeUp} initial="hidden" animate={inView ? 'visible' : 'hidden'} className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs font-medium text-violet-300">🔄 Stripe coming soon</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white mb-4">Simple, honest pricing</h2>
          <p className="text-white/50">Start free. Upgrade when you're ready.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {plans.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div key={p.name} variants={stagger(i * 0.08)} initial="hidden" animate={inView ? 'visible' : 'hidden'}
                className={`relative rounded-2xl p-6 border transition-all ${
                  p.highlight
                    ? 'border-violet-500/50 bg-violet-600/5 shadow-xl shadow-violet-500/10'
                    : 'border-white/[0.08] bg-white/[0.02]'
                }`}>
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    {p.badge}
                  </div>
                )}
                <div className="mb-5">
                  <p className="text-sm font-semibold text-white/60 mb-1">{p.name}</p>
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">{p.price}</span>
                    {p.per && <span className="text-white/30 mb-1 text-sm">{p.per}</span>}
                  </div>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                      <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button onClick={onSignup}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    p.highlight
                      ? 'bg-violet-600 hover:bg-violet-500 text-white hover:shadow-lg hover:shadow-violet-500/25'
                      : 'border border-white/10 text-white/70 hover:bg-white/5 hover:text-white'
                  }`}>
                  {p.cta}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA({ onSignup }: { onSignup: () => void }) {
  const { ref, inView } = useReveal();
  return (
    <section className="py-24 sm:py-32" ref={ref}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        <motion.div variants={fadeUp} initial="hidden" animate={inView ? 'visible' : 'hidden'} className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-indigo-600/20 blur-3xl rounded-full" />
          <div className="relative rounded-3xl border border-white/10 bg-white/[0.02] p-12 sm:p-16">
            <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-8">
              <Shield className="h-3.5 w-3.5 text-violet-400" />
              <span className="text-xs font-medium text-violet-300">Join serious traders</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold text-white mb-5 leading-tight">
              Start building your<br />
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                trading edge today
              </span>
            </h2>
            <p className="text-white/50 text-lg mb-10 max-w-lg mx-auto">
              Stop trading on gut feeling. Start trading on data. Free forever — upgrade when you're ready.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button onClick={onSignup}
                className="group flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-10 py-4 rounded-xl font-semibold text-sm transition-all hover:shadow-2xl hover:shadow-violet-500/30 hover:-translate-y-0.5">
                Start Free Now
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <p className="text-xs text-white/20 mt-6">No credit card required · Free forever plan available</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-white/5 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/tradenova-icon.png" alt="TradeNova" className="w-6 h-6 rounded-md"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <span className="text-sm font-semibold text-white/60">TradeNova</span>
        </div>
        <p className="text-xs text-white/20">© 2026 TradeNova. The Trading Operating System.</p>
        <div className="flex gap-6 text-xs text-white/30">
          <a href="#" className="hover:text-white/60 transition-colors">Privacy</a>
          <a href="#" className="hover:text-white/60 transition-colors">Terms</a>
          <a href="#" className="hover:text-white/60 transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Landing Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();

  const handleSignup = () => navigate('/signup');
  const handleLogin  = () => navigate('/login');

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">
      <Nav onLogin={handleLogin} onSignup={handleSignup} />
      <Hero onSignup={handleSignup} />
      <Features />
      <HowItWorks />
      <Testimonials />
      <PricingPreview onSignup={handleSignup} />
      <FinalCTA onSignup={handleSignup} />
      <Footer />
    </div>
  );
}
