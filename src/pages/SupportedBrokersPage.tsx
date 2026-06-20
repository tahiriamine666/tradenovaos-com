import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';
import BrokersStrip from '@/components/marketing/BrokersStrip';
import SeoHead from '@/components/SeoHead';

const BROKERS = [
  { name: 'MetaTrader 4', desc: 'Industry-standard FX & CFD platform' },
  { name: 'MetaTrader 5', desc: 'Multi-asset trading & analytics' },
  { name: 'NinjaTrader', desc: 'Futures & advanced charting' },
  { name: 'Interactive Brokers', desc: 'Stocks, options, futures, forex' },
  { name: 'TradingView', desc: 'Charts, alerts & community ideas' },
  { name: 'Tradovate', desc: 'Cloud-based futures trading' },
  { name: 'cTrader', desc: 'Direct-market-access FX' },
  { name: 'Thinkorswim', desc: 'Pro tools from TD Ameritrade' },
  { name: 'CSV Import', desc: 'Universal import from any broker' },
];

export default function SupportedBrokersPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <MarketingNav />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] bg-violet-500/10 rounded-full blur-[140px]" />
          </div>
          <div className="relative max-w-5xl mx-auto px-5 sm:px-8 py-20 sm:py-28 text-center">
            <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-4 py-1.5 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
              <span className="text-xs font-semibold text-violet-700">Supported Brokers & Integrations</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.02em] text-slate-900 mb-5 leading-tight">
              Works with your <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">favorite broker</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Import your trades from any platform. We support direct integrations and universal CSV import — so nothing is left behind.
            </p>
          </div>
        </section>

        <BrokersStrip />

        <section className="py-16 sm:py-20 bg-slate-50/60">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {BROKERS.map(b => (
                <div key={b.name} className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-violet-200 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="font-bold text-slate-900 text-base">{b.name}</h3>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                      <Check className="h-3 w-3" /> Supported
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 text-center">
              <Link to="/signup" className="group inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-7 py-3.5 rounded-2xl font-bold text-sm transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5">
                Connect your broker — Start Free <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
