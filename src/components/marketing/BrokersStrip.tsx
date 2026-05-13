import React from 'react';

const BROKERS = [
  { name: 'MetaTrader 5', logo: '/brokers/mt5.png' },
  { name: 'MetaTrader 4', logo: '/brokers/mt4.png' },
  { name: 'TradingView',  logo: '/brokers/tradingview.png' },
  { name: 'NinjaTrader',  logo: '/brokers/ninjatrader.png' },
  { name: 'Tradovate',    logo: '/brokers/tradovate.png' },
  { name: 'cTrader',      logo: '/brokers/ctrader.png' },
];

function BrokerCard({ name, logo }: { name: string; logo: string }) {
  return (
    <div className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:shadow-md hover:border-violet-200 transition-all min-w-[230px]">
      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        <img
          src={logo}
          alt={`${name} logo`}
          loading="lazy"
          className="max-h-9 max-w-9 object-contain"
        />
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
            <BrokerCard key={i} name={b.name} logo={b.logo} />
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
