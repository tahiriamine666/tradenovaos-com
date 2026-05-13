import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart3, Twitter, Instagram, Linkedin, Facebook, MessageCircle, ArrowRight } from 'lucide-react';

const COLS: { title: string; links: { label: string; to: string; external?: boolean }[] }[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Log In', to: '/login' },
      { label: 'Features', to: '/#features' },
      { label: 'Solutions', to: '/solutions/forex' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Supported Brokers', to: '/supported-brokers' },
      { label: 'Start Free', to: '/signup' },
    ],
  },
  {
    title: 'Compare',
    links: [
      { label: 'vs. TradeZella', to: '/compare/tradezella' },
      { label: 'vs. TraderSync', to: '/compare/tradersync' },
      { label: 'vs. Edgewonk', to: '/compare/edgewonk' },
      { label: 'vs. Tradervue', to: '/compare/tradervue' },
      { label: 'vs. TradesViz', to: '/compare/tradesviz' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'Contact Us', to: '/contact' },
      { label: 'Careers', to: '/careers' },
      { label: 'Blog', to: '/blog' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms & Conditions', to: '/terms' },
    ],
  },
];

const SOCIAL = [
  { label: 'X / Twitter', Icon: Twitter, href: 'https://twitter.com' },
  { label: 'Instagram', Icon: Instagram, href: 'https://instagram.com' },
  { label: 'LinkedIn', Icon: Linkedin, href: 'https://linkedin.com' },
  { label: 'Discord', Icon: MessageCircle, href: 'https://discord.com' },
  { label: 'Facebook', Icon: Facebook, href: 'https://facebook.com' },
];

export default function MarketingFooter() {
  const nav = useNavigate();
  return (
    <footer className="relative bg-white text-slate-900 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[300px] bg-indigo-700/8 rounded-full blur-[100px]" />
      </div>

      {/* CTA banner */}
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-20">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-violet-600/15 via-white/[0.02] to-indigo-600/10 p-10 sm:p-14 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
              Start building your <span className="bg-gradient-to-r from-violet-400 to-purple-300 bg-clip-text text-transparent">trading edge today.</span>
            </h3>
            <p className="text-slate-600 text-sm mt-2">Free forever plan · No credit card required</p>
          </div>
          <button
            onClick={() => nav('/signup')}
            className="group inline-flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500 text-white px-7 py-3.5 rounded-2xl font-black text-sm transition-all hover:shadow-2xl hover:shadow-violet-500/40 hover:-translate-y-0.5 whitespace-nowrap"
          >
            Start Free <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>

      {/* Main footer */}
      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-16 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-4 space-y-5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <BarChart3 className="h-5 w-5 text-slate-900" />
            </div>
            <span className="font-black text-slate-900 text-xl tracking-tight">TradeNova</span>
          </Link>
          <p className="text-sm text-slate-700 leading-relaxed max-w-sm">
            TradeNova is a Trading Operating System built to help traders plan, journal, analyze, and improve their performance.
          </p>
          <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm border-l-2 border-slate-200 pl-3">
            Trading involves substantial risk and is not suitable for every investor. Past performance does not guarantee future results.
          </p>
        </div>

        <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
          {COLS.map(col => (
            <div key={col.title}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">{col.title}</p>
              <ul className="space-y-2.5">
                {col.links.map(l => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-slate-600 hover:text-violet-700 transition-colors">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-900 mb-4">Social</p>
            <ul className="space-y-2.5">
              {SOCIAL.map(s => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer noopener"
                    className="group flex items-center gap-2.5 text-sm text-slate-600 hover:text-violet-700 transition-colors">
                    <span className="w-7 h-7 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center group-hover:bg-violet-500/15 group-hover:border-violet-500/30 transition-colors">
                      <s.Icon className="h-3.5 w-3.5" />
                    </span>
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="relative border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} TradeNova. All rights reserved.</p>
          <a href="https://tradenovaos.com" target="_blank" rel="noreferrer noopener"
            className="hover:text-violet-700 transition-colors">tradenovaos.com</a>
        </div>
      </div>
    </footer>
  );
}
