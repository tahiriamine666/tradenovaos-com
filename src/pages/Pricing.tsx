import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { startCheckout } from '@/lib/lemonsqueezy';
import {
  Check, X, Sparkles, Zap, Crown, Shield, BookOpen, BarChart3, Users,
  Play, Brain, ChevronLeft, Loader2,
} from 'lucide-react';

type PlanId = 'free' | 'pro' | 'elite';
type Billing = 'monthly' | 'yearly';

const PLANS: Array<{
  id: PlanId;
  name: string;
  icon: any;
  tagline: string;
  monthly: number;
  yearly: number;
  badge?: string;
  cta: string;
  features: string[];
  highlight?: boolean;
}> = [
  {
    id: 'free',
    name: 'Free',
    icon: Zap,
    tagline: 'Start journaling your trades',
    monthly: 0,
    yearly: 0,
    cta: 'Get Started',
    features: [
      'Dashboard',
      'Trade Journal',
      'Limited Learning Hub',
      '50 Trades',
      'Basic Analytics',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Sparkles,
    tagline: 'For serious active traders',
    monthly: 14,
    yearly: 11,
    badge: 'Most Popular',
    cta: 'Start 7-Day Free Trial',
    highlight: true,
    features: [
      'Unlimited Trades',
      'Trade Vault',
      'Replay Studio',
      'Learning Hub',
      'Trade Plan',
      'AI Reviews',
      'Community Access',
      'Advanced Analytics',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    icon: Crown,
    tagline: 'For funded & professional traders',
    monthly: 28,
    yearly: 22,
    cta: 'Start 7-Day Free Trial',
    features: [
      'Everything in Pro',
      'Unlimited AI Usage',
      'Elite Community',
      'Advanced Replay Analytics',
      'Premium Playbooks',
      'Priority Support',
      'Future Elite Features',
    ],
  },
];

const COMPARISON: Array<{ label: string; free: boolean | string; pro: boolean | string; elite: boolean | string }> = [
  { label: 'Unlimited Trades',     free: '50 / mo', pro: true, elite: true },
  { label: 'Replay Studio',         free: false, pro: true, elite: true },
  { label: 'Trade Plan',            free: false, pro: true, elite: true },
  { label: 'Trade Vault',           free: false, pro: true, elite: true },
  { label: 'Learning Hub',          free: 'Limited', pro: true, elite: true },
  { label: 'AI Reviews',            free: false, pro: 'Standard', elite: 'Unlimited' },
  { label: 'Community',             free: 'Read-only', pro: true, elite: 'Elite tier' },
  { label: 'Advanced Analytics',    free: false, pro: true, elite: true },
  { label: 'Priority Support',      free: false, pro: false, elite: true },
  { label: 'Unlimited AI',          free: false, pro: false, elite: true },
];

const TRUST_CARDS = [
  { icon: BookOpen, title: 'Trade Journal',  desc: 'Log every trade with screenshots, tags, and emotion tracking.' },
  { icon: Play,      title: 'Replay Studio',  desc: 'Re-walk past sessions bar-by-bar to study your execution.' },
  { icon: Brain,     title: 'AI Reviews',      desc: 'Get instant feedback on your setups, exits, and discipline.' },
  { icon: BarChart3, title: 'Learning Hub',   desc: 'Structured lessons on SMC, risk, psychology, and more.' },
  { icon: Users,     title: 'Community',       desc: 'Join serious traders sharing setups, journals, and reviews.' },
];

const FAQS = [
  { q: 'Can I cancel anytime?',     a: 'Yes — cancel in one click from your billing settings. No questions asked.' },
  { q: 'Do I get a free trial?',     a: 'Yes. Pro and Elite both start with a 7-day free trial. You won\'t be charged until it ends.' },
  { q: 'Can I upgrade later?',       a: 'Of course — upgrade from Pro to Elite anytime. Your billing prorates automatically.' },
  { q: 'Will I lose my data if I downgrade?', a: 'Never. All your trades, journals, and playbooks stay safe in your account.' },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [billing, setBilling] = useState<Billing>('monthly');
  const [loadingPlan, setLoadingPlan] = useState<PlanId | null>(null);

  const handleCta = async (plan: PlanId) => {
    if (plan === 'free') {
      navigate(user ? '/app' : '/signup');
      return;
    }
    if (!user) {
      navigate(`/signup?redirect=/pricing`);
      return;
    }
    try {
      setLoadingPlan(plan);
      await startCheckout(plan);
    } catch (e: any) {
      toast({
        title: 'Could not open checkout',
        description: e?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header bar */}
      <div className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold">TradeNova</span>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-10 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-4xl sm:text-5xl font-bold tracking-tight"
        >
          Choose Your Trading{' '}
          <span className="bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
            Edge
          </span>
        </motion.h1>
        <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
          Everything you need to journal, analyze, replay, and improve your trading performance.
        </p>

        {/* Billing toggle */}
        <div className="mt-8 inline-flex items-center gap-1 p-1 rounded-full bg-muted border border-border">
          {(['monthly', 'yearly'] as Billing[]).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                billing === b
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {b === 'monthly' ? 'Monthly' : 'Yearly'}
              {b === 'yearly' && (
                <span className="ml-2 text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Plan cards */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((p, i) => {
            const Icon = p.icon;
            const price = billing === 'yearly' ? p.yearly : p.monthly;
            const loading = loadingPlan === p.id;
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className={`relative rounded-2xl border bg-card p-6 flex flex-col ${
                  p.highlight
                    ? 'border-violet-500/60 shadow-xl shadow-violet-500/10 ring-1 ring-violet-500/30'
                    : 'border-border shadow-sm'
                }`}
              >
                {p.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-violet-600 text-white text-[11px] font-bold shadow-md">
                    {p.badge}
                  </div>
                )}

                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    p.highlight ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                                : p.id === 'elite' ? 'bg-amber-500/15 text-amber-500'
                                : 'bg-muted text-muted-foreground'
                  }`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.tagline}</p>
                  </div>
                </div>

                <div className="mb-6">
                  {price === 0 ? (
                    <p className="text-4xl font-bold">$0</p>
                  ) : (
                    <div className="flex items-end gap-1.5">
                      <span className="text-4xl font-bold">${price}</span>
                      <span className="text-sm text-muted-foreground mb-1.5">/month</span>
                    </div>
                  )}
                  {billing === 'yearly' && price > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed ${price * 12} annually
                    </p>
                  )}
                  {billing === 'monthly' && price > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">Billed monthly</p>
                  )}
                </div>

                <button
                  onClick={() => handleCta(p.id)}
                  disabled={loading}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                    p.highlight
                      ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-500/25'
                      : p.id === 'elite'
                      ? 'bg-foreground text-background hover:opacity-90'
                      : 'bg-muted text-foreground hover:bg-muted/70 border border-border'
                  } disabled:opacity-60`}
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Opening checkout…</>
                  ) : (
                    p.cta
                  )}
                </button>

                {p.id !== 'free' && (
                  <p className="text-[11px] text-center text-muted-foreground mt-2">
                    7-day free trial · Cancel anytime
                  </p>
                )}

                <div className="mt-6 pt-6 border-t border-border space-y-2.5">
                  {p.features.map((f) => (
                    <div key={f} className="flex items-start gap-2.5 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 flex items-center justify-center gap-2">
          <Shield className="h-3.5 w-3.5" /> Secure checkout by Paddle · All major cards, PayPal & Apple Pay
        </p>
      </section>

      {/* Comparison table */}
      <section className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-center mb-2">Compare plans</h2>
        <p className="text-center text-sm text-muted-foreground mb-8">
          Every feature, side by side.
        </p>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left font-semibold py-4 px-5">Feature</th>
                  <th className="font-semibold py-4 px-5 text-center">Free</th>
                  <th className="font-semibold py-4 px-5 text-center text-violet-600 dark:text-violet-400">Pro</th>
                  <th className="font-semibold py-4 px-5 text-center text-amber-600 dark:text-amber-500">Elite</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.label} className={i % 2 ? 'bg-muted/10' : ''}>
                    <td className="py-3.5 px-5 font-medium">{row.label}</td>
                    {(['free', 'pro', 'elite'] as const).map((tier) => {
                      const v = row[tier];
                      return (
                        <td key={tier} className="py-3.5 px-5 text-center">
                          {v === true ? (
                            <Check className="h-4 w-4 text-emerald-500 mx-auto" strokeWidth={2.5} />
                          ) : v === false ? (
                            <X className="h-4 w-4 text-muted-foreground/40 mx-auto" />
                          ) : (
                            <span className="text-xs text-muted-foreground">{v}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Trust section */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-center mb-2">Trusted by serious traders</h2>
        <p className="text-center text-sm text-muted-foreground mb-8">
          Built for the people who treat trading like a profession.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {TRUST_CARDS.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.title}
                className="rounded-xl border border-border bg-card p-5 hover:border-violet-500/40 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-3">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <p className="font-semibold text-sm mb-1">{c.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Frequently asked</h2>
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-xl border border-border bg-card p-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex items-center justify-between cursor-pointer font-semibold text-sm">
                {f.q}
                <span className="text-muted-foreground group-open:rotate-45 transition-transform text-xl leading-none">+</span>
              </summary>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-10">
          By subscribing you agree to our{' '}
          <a href="/terms" className="underline hover:text-foreground">Terms</a> and{' '}
          <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>.
          7-day refund available — see our{' '}
          <a href="/help" className="underline hover:text-foreground">refund policy</a>.
        </p>
      </section>
    </div>
  );
}
