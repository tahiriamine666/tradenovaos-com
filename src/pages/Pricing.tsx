import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, Minus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/hooks/usePlan';
import { openCustomerPortal } from '@/lib/dodo';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';
import robotAsset from '@/assets/tradenova-robot-full.jpg.asset.json';
import { cn } from '@/lib/utils';

type PlanId = 'pro' | 'elite';

const CORE = [
  'Dashboard & Trading Calendar', 'Trade Journal & Trade Logs', 'Core Analytics',
  'Trade Plan, Weekly Outlook & Daily Plan', 'Custom checklists & Checklist Models', 'Custom rules tracking',
  'Psychology tracking & Psychology Score', 'Economic Calendar', 'Before / after trade screenshots',
  'Historical journal & plan review', 'Certificates wall',
];

const PLANS: Record<PlanId, { name: string; tagline: string; price: number; badge?: string; summary: string[] }> = {
  pro: {
    name: 'Pro', price: 14, tagline: 'For serious traders building consistency.',
    summary: ['The complete core TradeNova experience', '1 connected trading account (MT4 / MT5 sync)', 'NOVA AI — 500 credits / month', ...CORE.slice(0, 6)],
  },
  elite: {
    name: 'Elite', price: 28, badge: 'MOST POWERFUL', tagline: 'For traders managing more accounts.',
    summary: ['Everything in Pro', 'Unlimited connected trading accounts', 'NOVA AI — 1,000 credits / month', 'Priority support'],
  },
};

type Cell = boolean | string;
const COMPARE: { group: string; rows: [string, Cell, Cell][] }[] = [
  { group: 'Trading', rows: [['Connected trading accounts', '1', 'Unlimited'], ['MT4 / MT5 trade sync', true, true], ['Trade Logs', true, true], ['Trading Calendar', true, true]] },
  { group: 'Journal', rows: [['Trade Journal', true, true], ['Before / after screenshots', true, true], ['Historical review', true, true]] },
  { group: 'Planning', rows: [['Trade Plan', true, true], ['Weekly Outlook', true, true], ['Daily Plan', true, true], ['Pre-trade checklist', true, true], ['Checklist Models', true, true], ['Custom rules', true, true]] },
  { group: 'Analytics', rows: [['Core analytics', true, true]] },
  { group: 'Psychology', rows: [['Psychology tracking', true, true], ['Psychology Score', true, true]] },
  { group: 'Market', rows: [['Economic Calendar', true, true]] },
  { group: 'AI', rows: [['NOVA AI', true, true], ['Monthly NOVA credits', '500', '1,000']] },
  { group: 'Support', rows: [['Standard support', true, true], ['Priority support', false, true]] },
];

const CellView = ({ v }: { v: Cell }) =>
  typeof v === 'string' ? <span className="font-medium text-foreground">{v}</span>
    : v ? <Check className="mx-auto h-4 w-4 text-primary" /> : <Minus className="mx-auto h-4 w-4 text-muted-foreground/50" />;

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPro, isElite } = usePlan();

  const cta = (plan: PlanId) => {
    if (!user) return navigate('/signup');
    if (isPro || isElite) return openCustomerPortal().catch(() => navigate('/billing'));
    navigate('/onboarding?step=plan');
  };
  const label = (plan: PlanId) =>
    isElite ? (plan === 'elite' ? 'Current plan' : 'Manage billing')
      : isPro ? (plan === 'pro' ? 'Current plan' : 'Upgrade to Elite')
      : 'Start 14-Day Free Trial';

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <BrandLogo className="h-9 w-9 object-contain mix-blend-screen" />
            <span className="text-sm font-bold">TradeNova</span>
          </div>
        </div>
      </div>

      <section className="mx-auto max-w-5xl px-6 pb-10 pt-14 text-center">
        <div className="mb-6 flex items-end justify-center gap-3">
          <img src={robotAsset.url} alt="" className="h-24 w-auto object-contain mix-blend-screen animate-[tn-float_6s_ease-in-out_infinite] motion-reduce:animate-none" />
          <div className="mb-10 rounded-xl border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">Start with 14 days free.</div>
        </div>
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-5xl">Start mastering your trading.</h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Two plans. 14 days free, then billed monthly. Cancel anytime.</p>
      </section>

      <section className="mx-auto grid max-w-4xl gap-5 px-6 md:grid-cols-2">
        {(Object.keys(PLANS) as PlanId[]).map((id) => {
          const p = PLANS[id];
          const current = (id === 'pro' && isPro) || (id === 'elite' && isElite);
          return (
            <div key={id} className={cn('relative flex flex-col rounded-2xl border bg-card p-7 transition-colors duration-300',
              id === 'elite' ? 'border-primary/50' : 'border-border')}>
              {p.badge && <span className="absolute -top-3 left-7 rounded-full border border-primary/40 bg-background px-3 py-0.5 text-[10px] font-semibold tracking-[0.15em] text-primary">{p.badge}</span>}
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">{p.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
              <p className="mt-5 text-5xl font-bold">${p.price}<span className="text-base font-normal text-muted-foreground"> / month</span></p>
              <p className="mt-1 text-xs text-primary">14 days free · Cancel anytime</p>
              <Button className="mt-6" variant={id === 'elite' ? 'default' : 'outline'} disabled={current} onClick={() => cta(id)}>{label(id)}</Button>
              <ul className="mt-6 space-y-2.5 text-sm">
                {p.summary.map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />{f}</li>)}
              </ul>
            </div>
          );
        })}
      </section>

      <section className="mx-auto max-w-4xl px-6 py-20">
        <h2 className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Compare plans</h2>
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-card">
              <th className="px-5 py-3 text-left font-semibold">Feature</th>
              <th className="w-28 px-5 py-3 text-center font-semibold">Pro</th>
              <th className="w-28 px-5 py-3 text-center font-semibold text-primary">Elite</th>
            </tr></thead>
            <tbody>
              {COMPARE.map((g) => (
                <>
                  <tr key={g.group} className="border-b border-border/60"><td colSpan={3} className="bg-background px-5 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{g.group}</td></tr>
                  {g.rows.map(([f, a, b]) => (
                    <tr key={f} className="border-b border-border/40 last:border-0">
                      <td className="px-5 py-2.5 text-foreground/90">{f}</td>
                      <td className="px-5 py-2.5 text-center"><CellView v={a} /></td>
                      <td className="px-5 py-2.5 text-center"><CellView v={b} /></td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">One NOVA credit = one message. Credits reset every billing period. A payment method is required to start the trial; you won't be charged until it ends.</p>
      </section>
    </div>
  );
}
