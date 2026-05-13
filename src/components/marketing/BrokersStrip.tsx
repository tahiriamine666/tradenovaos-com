import React from 'react';
import {
  CandlestickChart, LineChart, BarChart3, Briefcase, Activity,
  TrendingUp, Zap, Layers, Upload,
} from 'lucide-react';

const BROKERS = [
  { name: 'MetaTrader 4', icon: CandlestickChart },
  { name: 'MetaTrader 5', icon: CandlestickChart },
  { name: 'NinjaTrader', icon: BarChart3 },
  { name: 'Interactive Brokers', icon: Briefcase },
  { name: 'TradingView', icon: LineChart },
  { name: 'Tradovate', icon: Activity },
  { name: 'cTrader', icon: TrendingUp },
  { name: 'Thinkorswim', icon: Zap },
  { name: 'CSV Import', icon: Upload },
];

function BrokerCard({ name, Icon }: { name: string; Icon: React.ComponentType<any> }) {
  return (
    <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-violet-200 transition-all min-w-[220px]">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-violet-600" />
      </div>
      <span className="font-semibold text-slate-800 text-sm whitespace-nowrap">{name}</span>
    </div>
  );
}

export default function BrokersStrip() {
  const items = [...BROKERS, ...BROKERS]; // duplicate for seamless loop
  return (
    <section className="py-20 sm:py-24 bg-white text-slate-900">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 text-center mb-12">
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 mb-3">
          Connect your trading workflow
        </h2>
        <p className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto">
          Import, review, and analyze trades from your favorite platforms.
        </p>
      </div>

      <div
        className="group relative overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        }}
      >
        <div className="flex gap-5 w-max animate-[brokers-marquee_40s_linear_infinite] group-hover:[animation-play-state:paused]">
          {items.map((b, i) => (
            <BrokerCard key={i} name={b.name} Icon={b.icon} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes brokers-marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
