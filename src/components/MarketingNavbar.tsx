// src/components/MarketingNavbar.tsx
// Fully dynamic marketing navbar with dropdowns, icons, animations
// Replaces the static Navbar in LandingPage.tsx

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, BarChart3, PlayCircle, Sparkles, Brain, Target,
  TrendingUp, Users, Building2, Globe, HelpCircle, FileText,
  ChevronDown, Menu, X, Zap, ArrowRight, Upload, Calendar,
} from 'lucide-react';

// ─── Nav config ────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    label: 'Products',
    dropdown: [
      { icon: BookOpen,   label: 'Trade Journal',    desc: 'Log every trade with emotion and execution score', path: '/features/trade-journal',    color: 'text-violet-600' },
      { icon: BarChart3,  label: 'Edge Analytics',   desc: 'Win rate, profit factor, expectancy metrics',      path: '/features/edge-analytics',   color: 'text-blue-600' },
      { icon: Brain,      label: 'Mind Journal',     desc: 'Track your psychology and mental edge',            path: '/features/mind-journal',     color: 'text-pink-600' },
      { icon: Target,     label: 'Playbook Lab',     desc: 'Define setups, rules, and checklists',             path: '/features/playbook-lab',     color: 'text-emerald-600' },
      { icon: PlayCircle, label: 'Replay Studio',    desc: 'Replay sessions bar by bar',                       path: '/features/replay-studio',    color: 'text-amber-600' },
      { icon: Sparkles,   label: 'AI Insights',      desc: 'Claude analyzes your trading patterns',            path: '/features/ai-insights',      color: 'text-purple-600' },
      { icon: Calendar,   label: 'Trading Calendar', desc: 'Monthly P&L heatmap and trade activity',           path: '/features/trading-calendar', color: 'text-cyan-600' },
      { icon: Upload,     label: 'CSV Import',       desc: 'Import from any broker automatically',             path: '/features/csv-import',       color: 'text-green-600' },
    ],
  },
  {
    label: 'Solutions',
    dropdown: [
      { icon: TrendingUp,  label: 'Forex Traders',       desc: 'Optimize your forex edge with data',          path: '/solutions/forex-traders',       color: 'text-violet-600' },
      { icon: BarChart3,   label: 'Futures Traders',     desc: 'Track and improve futures performance',       path: '/solutions/futures-traders',     color: 'text-blue-600' },
      { icon: Building2,   label: 'Prop Firm Traders',   desc: 'Pass challenges and manage funded accounts',  path: '/solutions/prop-firm-traders',   color: 'text-amber-600' },
      { icon: Globe,       label: 'Crypto Traders',      desc: 'Journal crypto trades across all exchanges',  path: '/solutions/crypto-traders',      color: 'text-emerald-600' },
      { icon: Users,       label: 'Trading Communities', desc: 'Tools for trading educators and groups',      path: '/solutions/trading-communities', color: 'text-pink-600' },
    ],
  },
  {
    label: 'Resources',
    dropdown: [
      { icon: FileText,   label: 'Blog',          desc: 'Trading insights, tips, and strategies',  path: '/resources/blog',        color: 'text-violet-600' },
      { icon: HelpCircle, label: 'Help Center',   desc: 'Guides, tutorials, and documentation',    path: '/resources/help-center', color: 'text-blue-600' },
    ],
  },
  { label: 'Supported Brokers', path: '/supported-brokers' },
  { label: 'Pricing',           path: '/pricing' },
];

const ease: any = [0.22, 1, 0.36, 1];

// ─── Dropdown panel ───────────────────────────────────────────────────────────
function DropdownPanel({
  items, onNavigate,
}: {
  items: { icon: React.ElementType; label: string; desc: string; path: string; color: string }[];
  onNavigate: (path: string) => void;
}) {
  const cols = items.length > 4 ? 'grid-cols-2' : 'grid-cols-1';
  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.18, ease }}
      className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-max min-w-[280px] rounded-2xl border border-slate-200 bg-white/98 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden z-50`}
    >
      <div className={`p-2 grid ${cols} gap-0.5`}>
        {items.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className="flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-slate-100 transition-all text-left group"
            >
              <div className={`w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:border-slate-300 transition-colors`}>
                <Icon className={`h-4 w-4 ${item.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 group-hover:text-slate-900 leading-tight">{item.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-1 transition-all -translate-x-1 group-hover:translate-x-0" />
            </button>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────
interface MarketingNavbarProps {
  onLogin:  () => void;
  onSignup: () => void;
}

export default function MarketingNavbar({ onLogin, onSignup }: MarketingNavbarProps) {
  const navigate = useNavigate();
  const [scrolled,     setScrolled]     = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  // Scroll detection
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Close dropdown on escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenDropdown(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  // Lock scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleNavigate = (path: string) => {
    setOpenDropdown(null);
    setMobileOpen(false);
    setMobileExpanded(null);
    navigate(path);
  };

  const toggleDropdown = (label: string) => {
    setOpenDropdown(prev => prev === label ? null : label);
  };

  return (
    <nav
      ref={navRef}
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-xl border-b border-slate-200' : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <button onClick={() => handleNavigate('/')} className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <BarChart3 className="h-[18px] w-[18px] text-slate-900" />
            </div>
            <span className="font-black text-slate-900 text-lg tracking-tight">TradeNova</span>
          </button>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <div key={item.label} className="relative">
                {item.dropdown ? (
                  <button
                    onClick={() => toggleDropdown(item.label)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      openDropdown === item.label
                        ? 'text-slate-900 bg-slate-100'
                        : 'text-slate-700 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {item.label}
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${openDropdown === item.label ? 'rotate-180' : ''}`} />
                  </button>
                ) : (
                  <button
                    onClick={() => handleNavigate(item.path!)}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all"
                  >
                    {item.label}
                  </button>
                )}

                <AnimatePresence>
                  {item.dropdown && openDropdown === item.label && (
                    <DropdownPanel
                      items={item.dropdown}
                      onNavigate={handleNavigate}
                    />
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-3">
            <button onClick={onLogin} className="text-sm text-slate-700 hover:text-slate-900 px-4 py-2 transition-colors">
              Log in
            </button>
            <button onClick={onSignup}
              className="text-sm bg-violet-600 hover:bg-violet-500 text-slate-900 px-5 py-2.5 rounded-xl font-bold transition-all hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-px">
              Start Free
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="lg:hidden text-slate-700 hover:text-slate-900 p-2 rounded-xl hover:bg-slate-100 transition-colors"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease }}
            className="lg:hidden overflow-hidden bg-white border-b border-slate-200"
          >
            <div className="px-5 py-4 space-y-1 max-h-[80vh] overflow-y-auto">
              {NAV_ITEMS.map(item => (
                <div key={item.label}>
                  {item.dropdown ? (
                    <>
                      <button
                        onClick={() => setMobileExpanded(prev => prev === item.label ? null : item.label)}
                        className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all"
                      >
                        {item.label}
                        <ChevronDown className={`h-4 w-4 transition-transform ${mobileExpanded === item.label ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {mobileExpanded === item.label && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden ml-3 mt-0.5 space-y-0.5"
                          >
                            {item.dropdown.map(sub => {
                              const Icon = sub.icon;
                              return (
                                <button
                                  key={sub.path}
                                  onClick={() => handleNavigate(sub.path)}
                                  className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all text-left"
                                >
                                  <Icon className={`h-4 w-4 ${sub.color} flex-shrink-0`} />
                                  <span className="font-medium">{sub.label}</span>
                                </button>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <button
                      onClick={() => handleNavigate(item.path!)}
                      className="flex w-full px-4 py-3 rounded-xl text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-all text-left"
                    >
                      {item.label}
                    </button>
                  )}
                </div>
              ))}

              {/* Mobile CTA */}
              <div className="flex gap-3 pt-3 border-t border-slate-200 mt-3">
                <button onClick={() => { onLogin(); setMobileOpen(false); }}
                  className="flex-1 text-sm border border-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-100 transition-colors">
                  Log in
                </button>
                <button onClick={() => { onSignup(); setMobileOpen(false); }}
                  className="flex-1 text-sm bg-violet-600 text-slate-900 py-3 rounded-xl font-bold hover:bg-violet-500 transition-colors">
                  Start Free
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
