import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import MarketingNav from '@/components/marketing/MarketingNav';
import MarketingFooter from '@/components/marketing/MarketingFooter';

interface Props {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}

export default function MarketingPageShell({ eyebrow = 'Coming soon', title, description, children }: Props) {
  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col">
      <MarketingNav />

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-violet-500/10 rounded-full blur-[140px]" />
          </div>
          <div className="relative max-w-4xl mx-auto px-5 sm:px-8 py-24 sm:py-32 text-center">
            <div className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-full px-4 py-1.5 mb-6">
              <Sparkles className="h-3.5 w-3.5 text-violet-600" />
              <span className="text-xs font-semibold text-violet-700">{eyebrow}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[-0.02em] text-slate-900 mb-5 leading-tight">
              {title}
            </h1>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              {description}
            </p>

            {children && <div className="mt-10">{children}</div>}

            <div className="mt-10 flex flex-col sm:flex-row gap-3 items-center justify-center">
              <Link to="/signup" className="group inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-7 py-3.5 rounded-2xl font-bold text-sm transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:-translate-y-0.5">
                Start Free <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/" className="text-sm font-semibold text-slate-700 hover:text-violet-600 px-5 py-3.5 transition-colors">
                Back to home →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
