import { LockKeyhole, Radio, ShieldCheck } from 'lucide-react';

export default function MtAutoSyncComingSoon() {
  return (
    <section aria-labelledby="mt-auto-sync-heading" className="relative overflow-hidden rounded-xl border border-primary/30 bg-card p-5 sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <span aria-hidden="true" className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary"><Radio className="h-7 w-7" /></span>
        <div className="min-w-0 space-y-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><LockKeyhole aria-hidden="true" className="h-3 w-3" />Coming Soon</span>
          <h3 id="mt-auto-sync-heading" className="font-heading text-xl font-semibold text-foreground sm:text-2xl">MT5 Auto Sync — Coming Soon</h3>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">Automatic MT4 and MT5 broker connections are temporarily unavailable. Continue logging trades and importing them manually in your journal.</p>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />Your saved accounts and trading history remain intact.</p>
        </div>
      </div>
    </section>
  );
}
