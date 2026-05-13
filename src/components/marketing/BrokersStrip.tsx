import React, { useState } from 'react';

const BROKERS = [
  { name: 'MetaTrader 5', logo: '/brokers/metatrader5.png' },
  { name: 'MetaTrader 4', logo: '/brokers/metatrader4.png' },
  { name: 'TradingView',  logo: '/brokers/tradingview.png' },
  { name: 'NinjaTrader',  logo: '/brokers/ninjatrader.png' },
  { name: 'Tradovate',    logo: '/brokers/tradovate.png' },
  { name: 'cTrader',      logo: '/brokers/ctrader.png' },
];

function BrokerCard({ name, logo }: { name: string; logo: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="group/card flex h-[72px] min-w-[230px] items-center gap-4 rounded-xl border border-border bg-card px-5 py-4 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-primary/35 hover:shadow-lg hover:shadow-primary/10">
      <div className="flex h-9 min-w-[112px] items-center justify-start overflow-hidden flex-shrink-0">
        {failed ? (
          <span className="text-center text-[10px] font-bold leading-tight text-muted-foreground">
            {name.split(' ').map(w => w[0]).join('')}
          </span>
        ) : (
          <img
            src={logo}
            alt={`${name} logo`}
            loading="lazy"
            onError={() => setFailed(true)}
            className="block max-h-7 w-auto object-contain"
          />
        )}
      </div>
      <span className="whitespace-nowrap text-sm font-semibold text-foreground">{name}</span>
    </div>
  );
}

export default function BrokersStrip() {
  const items = [...BROKERS, ...BROKERS];
  return (
    <section className="bg-background py-20 text-foreground sm:py-24">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 text-center mb-12">
        <h2 className="mb-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Connect your trading workflow
        </h2>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground sm:text-lg">
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
