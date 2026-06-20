import React from 'react';
import { useParams, useLocation, Navigate } from 'react-router-dom';
import MarketingPageShell from './MarketingPageShell';
import SeoHead from '@/components/SeoHead';

type Entry = { title: string; description: string; eyebrow?: string };

const PRODUCT: Record<string, Entry> = {
  'trade-journal':  { title: 'Trade Journal',  description: 'Log every trade with screenshots, tags, notes and emotions — the foundation of every winning trader.' },
  'edge-analytics': { title: 'Edge Analytics', description: 'Discover exactly what makes you profitable with deep performance breakdowns by setup, time, instrument and more.' },
  'mind-journal':   { title: 'Mind Journal',   description: 'Track your psychology, emotions and discipline in real time. Build the mental edge that separates pros from amateurs.' },
  'playbook-lab':   { title: 'Playbook Lab',   description: 'Design, refine and back-validate your trading setups in a structured playbook your future self will thank you for.' },
  'replay-studio':  { title: 'Replay Studio',  description: 'Replay your trades bar-by-bar to study execution, missed exits and pattern repeatability.' },
  'ai-insights':    { title: 'AI Insights',    description: 'Your personal AI trading coach — surfacing patterns, leaks and opportunities directly from your data.' },
  'csv-import':     { title: 'CSV Import',     description: 'One-click import from any broker. Map columns, dedupe, and analyze your full trading history in minutes.' },
};

const SOLUTION: Record<string, Entry> = {
  'forex':              { title: 'TradeNova for Forex Traders',         description: 'Pip-perfect journaling, session analytics and pair performance — built for serious FX traders.' },
  'futures':            { title: 'TradeNova for Futures Traders',       description: 'Tick-based P&L, contract tracking and execution analytics tuned for futures markets.' },
  'prop-firms':         { title: 'TradeNova for Prop Firm Traders',     description: 'Pass evaluations and stay funded with rule tracking, drawdown alerts and consistency reports.' },
  'funded-challenges':  { title: 'TradeNova for Funded Challenges',     description: 'Track challenge rules, daily loss limits and progress toward your payout — across every firm.' },
  'day-traders':        { title: 'TradeNova for Day Traders',           description: 'Intraday dashboards, time-of-day analytics and execution reviews for high-frequency traders.' },
  'swing-traders':      { title: 'TradeNova for Swing Traders',         description: 'Multi-day position tracking, risk monitoring and trade thesis journaling for swing traders.' },
};

const RESOURCE: Record<string, Entry> = {
  'psychology':        { title: 'Trading Psychology',  description: 'Articles, frameworks and tools to master the mental game of trading.' },
  'risk-management':   { title: 'Risk Management',     description: 'Protect your capital with proven position sizing, drawdown control and risk frameworks.' },
};

const COMPARE: Record<string, Entry> = {
  'tradezella':  { title: 'TradeNova vs. TradeZella',  description: 'See how TradeNova compares — features, pricing, AI insights and more.' },
  'tradersync':  { title: 'TradeNova vs. TraderSync',  description: 'A side-by-side comparison so you can pick the right tool for your trading.' },
  'edgewonk':    { title: 'TradeNova vs. Edgewonk',    description: 'Modern UX, AI insights and a Trading OS approach — see the differences.' },
  'tradervue':   { title: 'TradeNova vs. Tradervue',   description: 'Why traders are upgrading to TradeNova for a faster, smarter journal.' },
  'tradesviz':   { title: 'TradeNova vs. TradesViz',   description: 'Compare analytics, journaling and overall workflow.' },
};

const STATIC: Record<string, Entry> = {
  blog:    { title: 'TradeNova Blog',         description: 'Insights, frameworks and case studies from professional traders.', eyebrow: 'Blog' },
  contact: { title: 'Contact Support',        description: 'Reach out — we typically respond within a few hours during business days.', eyebrow: 'Support' },
  careers: { title: 'Careers at TradeNova',   description: 'Help us build the world’s best Trading Operating System. Roles open across product, engineering and design.', eyebrow: 'Careers' },
  privacy: { title: 'Privacy Policy',         description: 'How we collect, use and protect your data at TradeNova.', eyebrow: 'Legal' },
  terms:   { title: 'Terms & Conditions',     description: 'The terms governing your use of TradeNova.', eyebrow: 'Legal' },
  help:    { title: 'Help Center',            description: 'Guides, tutorials and answers to the most common questions.', eyebrow: 'Help' },
};

interface Props { group: 'product' | 'solution' | 'resource' | 'compare' | 'static'; staticKey?: string }

export default function MarketingPlaceholder({ group, staticKey }: Props) {
  const { slug } = useParams();
  const key = staticKey ?? slug ?? '';
  const map = group === 'product' ? PRODUCT : group === 'solution' ? SOLUTION : group === 'resource' ? RESOURCE : group === 'compare' ? COMPARE : STATIC;
  const entry = map[key];
  if (!entry) return <Navigate to="/" replace />;
  return <MarketingPageShell eyebrow={entry.eyebrow ?? 'Coming soon'} title={entry.title} description={entry.description} />;
}
