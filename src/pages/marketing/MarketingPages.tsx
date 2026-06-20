// src/pages/marketing/FeaturePage.tsx
// Generic feature page template — used for all /features/* routes

import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BookOpen, BarChart3, PlayCircle, Sparkles, Brain,
  Target, Calendar, Upload, ArrowRight, Check, ArrowLeft,
  TrendingUp, Building2, Globe, Users,
} from 'lucide-react';
import MarketingNavbar from '@/components/MarketingNavbar';
import SeoHead from '@/components/SeoHead';

const ease: any = [0.22, 1, 0.36, 1];

const FEATURE_DATA: Record<string, {
  icon: React.ElementType; color: string; bg: string;
  title: string; subtitle: string; description: string;
  benefits: string[]; cta: string;
}> = {
  'trade-journal': {
    icon: BookOpen, color: 'text-violet-600', bg: 'bg-violet-500/10',
    title: 'Trade Journal',
    subtitle: 'Log every trade with context, emotion, and execution quality.',
    description: 'The TradeNova Trade Journal goes beyond simple P&L tracking. Log your entries with emotion scores, execution ratings, setup tags, and session notes. Build the habit of reviewing every trade — and watch your performance compound over time.',
    benefits: ['Log trades with 15+ data points', 'Track emotions and psychology per trade', 'Tag setups and playbooks', 'Screenshot and notes attachment', 'Session-level review and scoring', 'Export to CSV or PDF'],
    cta: 'Start journaling free',
  },
  'edge-analytics': {
    icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-500/10',
    title: 'Edge Analytics',
    subtitle: 'Know exactly where your edge lives — and where it breaks.',
    description: 'Stop guessing which setups work. Edge Analytics calculates win rate, profit factor, expectancy, average R:R, and performance by setup, session, pair, and time of day. See the numbers that actually matter.',
    benefits: ['Win rate and profit factor', 'Expectancy per setup', 'Performance by session and pair', 'Best and worst time-of-day analysis', 'Equity curve visualization', 'Drawdown and streaks tracking'],
    cta: 'See your edge',
  },
  'mind-journal': {
    icon: Brain, color: 'text-pink-600', bg: 'bg-pink-500/10',
    title: 'Mind Journal',
    subtitle: 'Your psychology is your biggest edge — or your biggest leak.',
    description: 'The Mind Journal tracks your emotional state before, during, and after trading sessions. Identify patterns in your psychology — when you revenge trade, over-trade, or perform below your potential. Fix the mental game with data.',
    benefits: ['Pre-session bias and mood tracking', 'Emotion logging per trade', 'Revenge trading pattern detection', 'Confidence and energy scores', 'Mental performance correlation with P&L', 'Weekly psychology review'],
    cta: 'Track your mindset',
  },
  'playbook-lab': {
    icon: Target, color: 'text-emerald-600', bg: 'bg-emerald-500/10',
    title: 'Playbook Lab',
    subtitle: 'Trade with a system. Not a feeling.',
    description: 'Define your trading setups in detail — entry criteria, exit rules, risk parameters, and market conditions. Build a library of your best setups and score your execution against them after each trade.',
    benefits: ['Define unlimited trading setups', 'Entry and exit rule documentation', 'Pre-trade execution checklist', 'Setup performance tracking', 'Link trades to playbooks automatically', 'Backtest your setups over history'],
    cta: 'Build your playbook',
  },
  'replay-studio': {
    icon: PlayCircle, color: 'text-amber-600', bg: 'bg-amber-500/10',
    title: 'Replay Studio',
    subtitle: 'Practice without risk. Improve without losing money.',
    description: 'Replay any past market session bar by bar. Simulate entries, practice your playbook, score your execution, and export session scorecards. The fastest way to improve pattern recognition without risking capital.',
    benefits: ['Bar-by-bar session replay', 'Simulated trade entries and exits', 'Execution scoring system', 'Session scorecard export', 'Practice specific setups repeatedly', 'Drill your edge until automatic'],
    cta: 'Start replaying (Elite)',
  },
  'ai-insights': {
    icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-500/10',
    title: 'AI Insights',
    subtitle: 'Claude finds the patterns you\'d never catch manually.',
    description: 'Powered by Anthropic Claude, AI Insights analyzes your complete trade history and surfaces patterns, correlations, and blind spots. Get actionable weekly improvement plans based on 100% of your real data.',
    benefits: ['Pattern detection across all trades', 'Setup and session correlation analysis', 'Mistake identification and categorization', 'Weekly personalized improvement plan', 'Natural language trade analysis', 'Unlimited analyses on Elite plan'],
    cta: 'Get AI insights (Pro)',
  },
  'trading-calendar': {
    icon: Calendar, color: 'text-cyan-600', bg: 'bg-cyan-500/10',
    title: 'Trading Calendar',
    subtitle: 'See your P&L heatmap. Identify your best and worst days.',
    description: 'The Trading Calendar gives you a bird\'s-eye view of your performance across the month. See profit and loss days at a glance, identify patterns in your best trading days, and plan your sessions strategically.',
    benefits: ['Monthly P&L heatmap', 'Daily trade count overlay', 'Best and worst day identification', 'Week-over-week comparison', 'Market event correlation', 'Exportable performance report'],
    cta: 'View your calendar',
  },
  'csv-import': {
    icon: Upload, color: 'text-green-600', bg: 'bg-green-500/10',
    title: 'CSV Import',
    subtitle: 'Import from any broker. Smart column mapping.',
    description: 'Import your existing trade history from any broker platform with smart CSV parsing. TradeNova auto-detects column formats from MT4, MT5, cTrader, IBKR, Tradovate, and 50+ more. No manual entry required.',
    benefits: ['50+ broker formats supported', 'Smart column auto-detection', 'Duplicate trade prevention', 'Import preview and validation', 'Bulk import up to 10,000 trades', 'Progress tracking per import'],
    cta: 'Import your trades (Pro)',
  },
};

export function FeaturePage() {
  const navigate = useNavigate();
  const { feature } = useParams<{ feature: string }>();
  const data = feature ? FEATURE_DATA[feature] : null;

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 text-lg mb-4">Feature not found</p>
          <button onClick={() => navigate('/')} className="text-violet-600 hover:text-violet-700 flex items-center gap-2 mx-auto">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </button>
        </div>
      </div>
    );
  }

  const Icon = data.icon;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SeoHead
        path={`/features/${feature}`}
        title={`${data.title} — TradeNova OS`}
        description={data.subtitle}
      />
      <MarketingNavbar onLogin={() => navigate('/login')} onSignup={() => navigate('/signup')} />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-32 pb-24">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-10 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>

          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${data.bg} border border-slate-200 mb-6`}>
            <Icon className={`h-7 w-7 ${data.color}`} />
          </div>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 mb-4 tracking-tight">{data.title}</h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl">{data.subtitle}</p>
          <p className="text-slate-600 leading-relaxed mb-12 max-w-2xl">{data.description}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-12">
            {data.benefits.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">{b}</span>
              </motion.div>
            ))}
          </div>

          <div className="flex gap-4">
            <button onClick={() => navigate('/signup')}
              className="group flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all hover:shadow-xl hover:shadow-violet-500/25 hover:-translate-y-0.5">
              {data.cta} <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button onClick={() => navigate('/pricing')}
              className="px-6 py-4 rounded-2xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 text-sm font-semibold transition-all hover:bg-slate-50">
              View pricing
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SOLUTION PAGES
// ─────────────────────────────────────────────────────────────────────────────
const SOLUTION_DATA: Record<string, { title: string; subtitle: string; description: string; benefits: string[]; icon: React.ElementType; color: string; bg: string }> = {
  'forex-traders': {
    icon: BarChart3, color: 'text-violet-600', bg: 'bg-violet-500/10',
    title: 'TradeNova for Forex Traders',
    subtitle: 'Build a consistent forex edge with data-driven journaling.',
    description: 'Forex trading demands discipline and precision. TradeNova gives forex traders the tools to track every pip, identify their best currency pairs, and optimize session performance across London, New York, and Asia sessions.',
    benefits: ['Track performance per currency pair', 'Session-based analytics (London/NY/Asia)', 'Pip and dollar tracking', 'News event correlation', 'Multi-currency account support', 'Broker-agnostic CSV import'],
  },
  'futures-traders': {
    icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-500/10',
    title: 'TradeNova for Futures Traders',
    subtitle: 'Track NQ, ES, CL, and more with precision.',
    description: 'Futures trading requires rigorous discipline around position sizing and daily loss limits. TradeNova helps futures traders stay within their rules, track contract performance, and build consistency across sessions.',
    benefits: ['Contract-level performance tracking', 'Daily loss limit enforcement', 'Session P&L breakdown', 'Setup-specific win rates', 'Tick and dollar value tracking', 'Drawdown monitoring'],
  },
  'prop-firm-traders': {
    icon: Building2, color: 'text-amber-600', bg: 'bg-amber-500/10',
    title: 'TradeNova for Prop Firm Traders',
    subtitle: 'Pass challenges. Manage funded accounts. Scale.',
    description: 'Prop firm traders live and die by their rules. TradeNova helps you track your daily drawdown limits, maintain consistency, and document your edge for evaluation reviews. Pass more challenges with data.',
    benefits: ['Daily drawdown limit tracking', 'Challenge rule compliance alerts', 'Consistency score calculation', 'Risk management enforcement', 'Trade review documentation', 'Challenge pass rate analytics'],
  },
  'crypto-traders': {
    icon: Globe, color: 'text-emerald-600', bg: 'bg-emerald-500/10',
    title: 'TradeNova for Crypto Traders',
    subtitle: 'Journal crypto trades across every exchange.',
    description: 'Crypto markets never close and opportunities move fast. TradeNova helps crypto traders build discipline in a 24/7 market — tracking performance across spot, futures, and DeFi with complete trade history.',
    benefits: ['Multi-exchange trade tracking', 'Spot and futures support', 'Crypto-native pair formatting', 'USD and BTC denomination', 'After-hours performance tracking', 'Volatility session analysis'],
  },
  'trading-communities': {
    icon: Users, color: 'text-pink-600', bg: 'bg-pink-500/10',
    title: 'TradeNova for Trading Communities',
    subtitle: 'Empower your community with professional trading tools.',
    description: 'Trading educators and community leaders can use TradeNova to share their trading methodology, track member performance, and build accountability systems that help traders improve faster.',
    benefits: ['Playbook sharing templates', 'Community performance benchmarking', 'Educational resource integration', 'Member accountability tools', 'Progress tracking dashboards', 'Bulk member onboarding'],
  },
};

export function SolutionPage() {
  const navigate = useNavigate();
  const { solution } = useParams<{ solution: string }>();
  const data = solution ? SOLUTION_DATA[solution] : null;

  if (!data) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">Solution not found</p>
          <button onClick={() => navigate('/')} className="text-violet-600 flex items-center gap-2 mx-auto">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </button>
        </div>
      </div>
    );
  }

  const Icon = data.icon;
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SeoHead
        path={`/solutions/${solution}`}
        title={`${data.title} — TradeNova OS`}
        description={data.subtitle}
      />
      <MarketingNavbar onLogin={() => navigate('/login')} onSignup={() => navigate('/signup')} />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-32 pb-24">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }}>
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-10 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl ${data.bg} border border-slate-200 mb-6`}>
            <Icon className={`h-7 w-7 ${data.color}`} />
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 mb-4 tracking-tight">{data.title}</h1>
          <p className="text-xl text-slate-600 mb-8 leading-relaxed max-w-2xl">{data.subtitle}</p>
          <p className="text-slate-600 leading-relaxed mb-12 max-w-2xl">{data.description}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-12">
            {data.benefits.map((b, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.05 }}
                className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 bg-white">
                <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">{b}</span>
              </motion.div>
            ))}
          </div>
          <button onClick={() => navigate('/signup')}
            className="group flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all hover:shadow-xl hover:shadow-violet-500/25 hover:-translate-y-0.5">
            Start Free — No credit card <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCES
// ─────────────────────────────────────────────────────────────────────────────
export function BlogPage() {
  const navigate = useNavigate();
  const posts = [
    { title: 'Fair Value Gaps (FVG): How to identify and trade them', tag: 'Price Action', date: 'June 20, 2026', read: '9 min', href: '/blog/fair-value-gaps-guide' },
    { title: 'How to calculate your trading edge', tag: 'Analytics', date: 'May 10, 2026', read: '8 min' },
    { title: 'The psychology of losing trades', tag: 'Psychology', date: 'May 7, 2026', read: '6 min' },
    { title: 'Why most traders fail: the journaling gap', tag: 'Journaling', date: 'May 4, 2026', read: '5 min' },
    { title: 'How to pass a prop firm challenge', tag: 'Prop Firms', date: 'Apr 28, 2026', read: '10 min' },
    { title: 'Building a trading playbook from scratch', tag: 'Playbooks', date: 'Apr 22, 2026', read: '7 min' },
    { title: 'Using AI to analyze your trades', tag: 'AI', date: 'Apr 15, 2026', read: '9 min' },
  ] as Array<{ title: string; tag: string; date: string; read: string; href?: string }>;
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SeoHead
        path="/resources/blog"
        title="Trading insights & strategies — TradeNova Blog"
        description="Practical articles to help you improve your trading edge, psychology, and performance. Journaling, analytics, prop firms, and AI-powered review."
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Blog",
          "name": "TradeNova Blog",
          "url": "https://tradenovaos-com.lovable.app/resources/blog",
          "blogPost": posts.map(p => ({
            "@type": "BlogPosting",
            "headline": p.title,
            "datePublished": p.date,
          })),
        }}
      />
      <MarketingNavbar onLogin={() => navigate('/login')} onSignup={() => navigate('/signup')} />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-32 pb-24">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="inline-flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-full px-4 py-1.5 mb-6">
            <span className="text-xs font-semibold text-violet-700">TradeNova Blog</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tight">Trading insights & strategies</h1>
          <p className="text-slate-600 text-lg mb-14 max-w-xl">Practical articles to help you improve your trading edge, psychology, and performance.</p>
          <div className="space-y-4">
            {posts.map((p, i) => (
              <motion.div key={p.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                onClick={() => p.href && navigate(p.href)}
                className="group flex items-center justify-between p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-all">
                <div>
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="text-[10px] font-bold text-violet-600 bg-violet-500/10 px-2 py-0.5 rounded-full">{p.tag}</span>
                    <span className="text-[11px] text-slate-700">{p.date}</span>
                    <span className="text-[11px] text-slate-700">{p.read} read</span>
                  </div>
                  <p className="text-base font-bold text-slate-900 group-hover:text-violet-700 transition-colors">{p.title}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 group-hover:text-violet-600 transition-colors flex-shrink-0 ml-4" />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function HelpCenterPage() {
  const navigate = useNavigate();
  const topics = [
    { title: 'Getting Started', desc: 'Set up your account, add first trades, and configure your workspace.', icon: Sparkles },
    { title: 'Trade Journal',   desc: 'Learn how to log trades, add screenshots, and review sessions.',       icon: BookOpen },
    { title: 'Analytics',       desc: 'Understand win rate, profit factor, and all performance metrics.',     icon: BarChart3 },
    { title: 'CSV Import',      desc: 'Import trades from MT4, MT5, cTrader, IBKR, and other brokers.',       icon: Upload },
    { title: 'Billing',         desc: 'Manage your plan, upgrade via Payoneer, and billing questions.',        icon: Check },
    { title: 'AI Insights',     desc: 'How Claude analyzes your trades and generates improvement plans.',      icon: Sparkles },
  ];
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SeoHead
        path="/resources/help-center"
        title="Help Center — TradeNova OS guides & tutorials"
        description="Find answers, setup guides, CSV import tutorials, AI Insights walkthroughs, and billing help for TradeNova OS."
      />
      <MarketingNavbar onLogin={() => navigate('/login')} onSignup={() => navigate('/signup')} />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-32 pb-24">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tight">Help Center</h1>
          <p className="text-slate-600 text-lg mb-14">Find answers, guides, and tutorials for TradeNova.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {topics.map((t, i) => {
              const Icon = t.icon;
              return (
                <motion.div key={t.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                  className="group p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 cursor-pointer transition-all">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mb-3">
                    <Icon className="h-4.5 w-4.5 text-violet-600 h-[18px] w-[18px]" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 mb-1 group-hover:text-violet-700 transition-colors">{t.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{t.desc}</p>
                </motion.div>
              );
            })}
          </div>
          <div className="mt-10 p-6 rounded-2xl border border-violet-500/20 bg-violet-500/5 text-center">
            <p className="text-sm font-semibold text-slate-900 mb-1">Still need help?</p>
            <p className="text-xs text-slate-600 mb-4">Our support team replies within a few hours.</p>
            <button onClick={() => navigate('/signup')} className="text-sm bg-violet-600 hover:bg-violet-500 text-white px-6 py-2.5 rounded-xl font-bold transition-colors">
              Contact Support
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPPORTED BROKERS
// ─────────────────────────────────────────────────────────────────────────────
export function SupportedBrokersPage() {
  const navigate = useNavigate();
  const brokers = [
    { name: 'MetaTrader 4 (MT4)', cat: 'Forex / CFD' },
    { name: 'MetaTrader 5 (MT5)', cat: 'Forex / CFD' },
    { name: 'cTrader',            cat: 'Forex / CFD' },
    { name: 'Interactive Brokers (IBKR)', cat: 'Stocks / Futures' },
    { name: 'Tradovate',          cat: 'Futures' },
    { name: 'NinjaTrader',        cat: 'Futures' },
    { name: 'Rithmic',            cat: 'Futures' },
    { name: 'Binance',            cat: 'Crypto' },
    { name: 'Bybit',              cat: 'Crypto' },
    { name: 'Coinbase Pro',       cat: 'Crypto' },
    { name: 'TopstepX',           cat: 'Prop Firm' },
    { name: 'FTMO',               cat: 'Prop Firm' },
    { name: 'The5ers',            cat: 'Prop Firm' },
    { name: 'Apex Trader',        cat: 'Prop Firm' },
    { name: 'Tradezero',          cat: 'Stocks' },
    { name: 'Webull',             cat: 'Stocks' },
    { name: 'Any CSV broker',     cat: 'Universal' },
  ];
  const cats = [...new Set(brokers.map(b => b.cat))];
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <MarketingNavbar onLogin={() => navigate('/login')} onSignup={() => navigate('/signup')} />
      <div className="max-w-4xl mx-auto px-5 sm:px-8 pt-32 pb-24">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tight">Supported Brokers</h1>
          <p className="text-slate-600 text-lg mb-14 max-w-xl">Import your trade history from any of these platforms — or use our universal CSV importer for anything else.</p>
          {cats.map(cat => (
            <div key={cat} className="mb-8">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">{cat}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {brokers.filter(b => b.cat === cat).map(b => (
                  <div key={b.name} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white">
                    <Check className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <span className="text-sm text-slate-700 font-medium">{b.name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-6 p-5 rounded-2xl border border-violet-500/20 bg-violet-500/5">
            <p className="text-sm font-semibold text-slate-900 mb-1">Don't see your broker?</p>
            <p className="text-xs text-slate-600">If your broker exports a CSV, TradeNova can import it. Our smart column mapper handles any format.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
