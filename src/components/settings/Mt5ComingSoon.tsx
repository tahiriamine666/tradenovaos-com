import { RefreshCw, ShieldCheck, LineChart, Lock } from 'lucide-react';

const POINTS = [
  { icon: RefreshCw, text: 'Automatic MT5 trade import into your journal' },
  { icon: ShieldCheck, text: 'Read-only investor access, encrypted credentials' },
  { icon: LineChart, text: 'Live account stats alongside your analytics' },
];

export default function Mt5ComingSoon() {
  return (
    <section aria-labelledby="mt5-coming-soon" className="relative overflow-hidden rounded-xl border border-border bg-card p-6 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -top-24 right-0 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary">
            <Lock className="h-3 w-3" /> Coming Soon
          </span>
          <h2 id="mt5-coming-soon" className="mt-3 text-xl font-bold text-foreground sm:text-2xl">MT5 Auto Sync</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Connecting trading accounts is temporarily unavailable while we finish MT5 Auto Sync.
            Your existing trades, journal and manual imports are unaffected — keep logging and importing trades as usual.
          </p>
        </div>
        <ul className="grid gap-3 md:min-w-[280px]">
          {POINTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-lg border border-border bg-background/40 px-3 py-2.5 text-sm text-foreground">
              <Icon className="h-4 w-4 shrink-0 text-primary" /> {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
