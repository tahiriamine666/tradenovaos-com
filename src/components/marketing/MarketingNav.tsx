import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart3, ChevronDown, Menu, X } from 'lucide-react';

type Item = { label: string; to: string; desc?: string };

const PRODUCTS: Item[] = [
  { label: 'Trade Journal', to: '/products/trade-journal', desc: 'Log every trade with rich context' },
  { label: 'Edge Analytics', to: '/products/edge-analytics', desc: 'Find what makes you profitable' },
  { label: 'Mind Journal', to: '/products/mind-journal', desc: 'Track psychology & emotions' },
  { label: 'Playbook Lab', to: '/products/playbook-lab', desc: 'Build & refine your setups' },
  { label: 'Replay Studio', to: '/products/replay-studio', desc: 'Replay trades bar-by-bar' },
  { label: 'AI Insights', to: '/products/ai-insights', desc: 'AI coach for your trading' },
  { label: 'CSV Import', to: '/products/csv-import', desc: 'Import from any broker' },
];

const SOLUTIONS: Item[] = [
  { label: 'Forex Traders', to: '/solutions/forex', desc: 'Pip-perfect FX journaling' },
  { label: 'Futures Traders', to: '/solutions/futures', desc: 'Tick-based analytics for futures' },
  { label: 'Prop Firm Traders', to: '/solutions/prop-firms', desc: 'Pass evaluations & stay funded' },
  { label: 'Funded Challenges', to: '/solutions/funded-challenges', desc: 'Track challenge rules & drawdown' },
  { label: 'Day Traders', to: '/solutions/day-traders', desc: 'Intraday performance dashboards' },
  { label: 'Swing Traders', to: '/solutions/swing-traders', desc: 'Multi-day position tracking' },
];

const RESOURCES: Item[] = [
  { label: 'Blog', to: '/blog', desc: 'Articles & trading insights' },
  { label: 'Trading Psychology', to: '/resources/psychology', desc: 'Master the mental game' },
  { label: 'Risk Management', to: '/resources/risk-management', desc: 'Protect your capital' },
  { label: 'Help Center', to: '/help', desc: 'Guides & documentation' },
  { label: 'Contact Support', to: '/contact', desc: 'Talk to our team' },
];

function Dropdown({ label, items }: { label: string; items: Item[] }) {
  const [open, setOpen] = useState(false);
  let timer: ReturnType<typeof setTimeout>;
  const enter = () => { clearTimeout(timer); setOpen(true); };
  const leave = () => { timer = setTimeout(() => setOpen(false), 120); };
  return (
    <div className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button className="flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-violet-600 transition-colors py-2">
        {label} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-1/2 -translate-x-1/2 pt-3 w-[420px] z-50">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-900/10 p-3 grid grid-cols-1 gap-1">
              {items.map(it => (
                <Link key={it.to} to={it.to} className="group rounded-xl px-3 py-2.5 hover:bg-violet-50 transition-colors">
                  <p className="text-sm font-semibold text-slate-900 group-hover:text-violet-700">{it.label}</p>
                  {it.desc && <p className="text-xs text-slate-500 mt-0.5">{it.desc}</p>}
                </Link>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function MarketingNav() {
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    h();
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  return (
    <header className={`sticky top-0 inset-x-0 z-50 bg-white/95 backdrop-blur-xl transition-shadow ${scrolled ? 'shadow-[0_1px_0_0_rgba(15,23,42,0.06),0_8px_24px_-12px_rgba(15,23,42,0.12)]' : 'border-b border-slate-100'}`}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <BarChart3 className="h-[18px] w-[18px] text-white" />
          </div>
          <span className="font-black text-slate-900 text-lg tracking-tight">TradeNova</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-7">
          <Dropdown label="Products" items={PRODUCTS} />
          <Dropdown label="Solutions" items={SOLUTIONS} />
          <Link to="/supported-brokers" className="text-sm font-medium text-slate-700 hover:text-violet-600 transition-colors">Supported Brokers</Link>
          <Link to="/pricing" className="text-sm font-medium text-slate-700 hover:text-violet-600 transition-colors">Pricing</Link>
          <Dropdown label="Resources" items={RESOURCES} />
        </nav>

        <div className="hidden lg:flex items-center gap-2">
          <button onClick={() => nav('/login')} className="text-sm font-semibold text-slate-700 hover:text-violet-600 px-4 py-2 transition-colors">
            Log In
          </button>
          <button onClick={() => nav('/signup')} className="text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-violet-500/30 hover:-translate-y-px">
            Start Free
          </button>
        </div>

        <button className="lg:hidden p-2 text-slate-700" onClick={() => setOpen(v => !v)} aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="lg:hidden overflow-hidden bg-white border-t border-slate-100">
            <div className="px-5 py-4 space-y-4 max-h-[80vh] overflow-y-auto">
              {[
                { label: 'Products', items: PRODUCTS },
                { label: 'Solutions', items: SOLUTIONS },
                { label: 'Resources', items: RESOURCES },
              ].map(group => (
                <div key={group.label}>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">{group.label}</p>
                  <div className="space-y-0.5">
                    {group.items.map(i => (
                      <Link key={i.to} to={i.to} onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700">
                        {i.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <Link to="/supported-brokers" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-violet-50">Supported Brokers</Link>
                <Link to="/pricing" onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-violet-50">Pricing</Link>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button onClick={() => { setOpen(false); nav('/login'); }} className="flex-1 text-sm font-semibold border border-slate-200 text-slate-700 py-2.5 rounded-xl hover:bg-slate-50">Log In</button>
                <button onClick={() => { setOpen(false); nav('/signup'); }} className="flex-1 text-sm font-bold bg-violet-600 text-white py-2.5 rounded-xl hover:bg-violet-500">Start Free</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
