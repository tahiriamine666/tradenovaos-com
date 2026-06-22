import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Zap, Check, RefreshCw, Building2 } from 'lucide-react';

const PLANS = {
  pro: {
    name: 'TradeNova Pro',
    monthlyUSD: 29,
    annualUSD: 23,
    features: [
      'Unlimited trade journaling',
      'Edge Analytics (full)',
      'Playbook Lab (unlimited)',
      'Replay Studio',
      'AI Nova assistant',
      'CSV import',
      'Learning Hub (all lessons)',
      'Priority support',
    ],
    badge: 'Most Popular',
    badgeColor: 'bg-violet-600',
  },
  elite: {
    name: 'TradeNova Elite',
    monthlyUSD: 59,
    annualUSD: 47,
    features: [
      'Everything in Pro',
      'Funded Challenge mode',
      'Advanced AI coaching',
      'Custom playbook templates',
      'Multi-account tracking',
      'White-glove onboarding',
      'Early access to new features',
      'Dedicated success manager',
    ],
    badge: 'Best Value',
    badgeColor: 'bg-amber-500',
  },
} as const;

const MAD_RATE = 9.70;

type PlanKey = keyof typeof PLANS;

export default function Pricing() {
  const navigate = useNavigate();
  const { user } = useAuth() as any;

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>('pro');
  const [billing, setBilling] = useState<'monthly' | 'annual'>('annual');
  const [currency, setCurrency] = useState<'USD' | 'MAD'>('USD');
  const [paymentMethod, setPaymentMethod] = useState<'payoneer' | 'bank'>('payoneer');
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const plan = PLANS[selectedPlan];
  const pricePerMonth = billing === 'annual' ? plan.annualUSD : plan.monthlyUSD;
  const totalPerYear = billing === 'annual' ? pricePerMonth * 12 : pricePerMonth;

  const fmt = (usd: number) =>
    currency === 'USD' ? `$${usd}` : `MAD ${(usd * MAD_RATE).toFixed(2)}`;

  const handleSubmit = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('upgrade_requests').insert({
        user_id: user.id,
        requested_plan: selectedPlan,
        payment_method: paymentMethod,
        user_message: `Plan: ${plan.name} | Billing: ${billing} | Currency: ${currency} | Amount: ${fmt(totalPerYear)} | Method: ${paymentMethod}${promoCode ? ` | Promo: ${promoCode}` : ''}`,
        status: 'pending',
      } as any);
      if (error) throw error;
      toast({
        title: '✅ Upgrade request submitted!',
        description: 'Our team will activate your plan after payment confirmation.',
      });
      navigate('/app');
    } catch (err: any) {
      toast({
        title: 'Something went wrong',
        description: err?.message ?? 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayoneer = () => {
    setPaymentMethod('payoneer');
    handleSubmit();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* LEFT */}
      <div className="w-full lg:w-[460px] flex-shrink-0 flex flex-col px-8 py-10 overflow-y-auto">
        <div className="flex items-center gap-3 mb-10">
          <button
            onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Go back"
          >
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-foreground">TradeNova</span>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          {(Object.entries(PLANS) as [PlanKey, typeof PLANS[PlanKey]][]).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setSelectedPlan(key)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-all ${
                selectedPlan === key
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : 'border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {p.name.replace('TradeNova ', '')}
              {p.badge && selectedPlan !== key && (
                <span className="ml-2 text-[9px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                  {p.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-6 p-1 bg-muted rounded-xl w-fit">
          <button
            onClick={() => setBilling('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              billing === 'monthly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling('annual')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              billing === 'annual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
          >
            Annual
            <span className="text-[10px] font-black bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">
              -20%
            </span>
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-1">Subscribe to {plan.name}</p>

        <div className="mb-1">
          <div className="flex gap-1 mb-3">
            {(['USD', 'MAD'] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                  currency === c
                    ? 'bg-foreground text-background border-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <span>{c === 'USD' ? '🇺🇸' : '🇲🇦'}</span> {c}
              </button>
            ))}
          </div>
          <p className="text-4xl font-black text-foreground tracking-tight">
            {fmt(pricePerMonth)}
            <span className="text-lg font-normal text-muted-foreground ml-1">/ mo</span>
          </p>
          {billing === 'annual' && (
            <p className="text-xs text-muted-foreground mt-1">
              Billed {fmt(pricePerMonth * 12)}/year ·{' '}
              {currency === 'USD'
                ? `Save $${(plan.monthlyUSD - plan.annualUSD) * 12}/year`
                : `1 USD = ${MAD_RATE} MAD. Charges vary by exchange rate.`}
            </p>
          )}
        </div>

        <div className="mt-6 mb-6 space-y-2.5">
          {plan.features.map((f) => (
            <div key={f} className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                <Check className="h-2.5 w-2.5 text-violet-600 dark:text-violet-400" strokeWidth={3} />
              </div>
              <span className="text-sm text-foreground">{f}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium text-foreground">
              {fmt(totalPerYear)}
              {billing === 'annual' && '/year'}
            </span>
          </div>
          <div className="flex justify-between text-sm font-bold">
            <span className="text-foreground">Total due today</span>
            <span className="text-foreground">{fmt(totalPerYear)}</span>
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={() => setShowPromo((p) => !p)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            + Add promotion code
          </button>
          <AnimatePresence>
            {showPromo && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-2"
              >
                <div className="flex gap-2">
                  <input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter code"
                    className="flex-1 text-sm bg-background border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/50"
                  />
                  <button className="px-4 py-2.5 rounded-xl bg-muted border border-border text-sm font-semibold text-foreground hover:bg-muted/70 transition-colors">
                    Apply
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 flex flex-col px-8 py-10 border-t lg:border-t-0 lg:border-l border-border overflow-y-auto bg-card">
        <button
          onClick={handlePayoneer}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 transition-all mb-4 disabled:opacity-50"
        >
          <span className="text-lg">🏦</span> Pay with Payoneer
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-foreground mb-3">Contact information</p>
          <div className="rounded-xl border border-border bg-muted/20 flex items-center px-4 py-3">
            <span className="text-xs text-muted-foreground w-12 flex-shrink-0">Email</span>
            <span className="text-sm text-foreground ml-2">{user?.email ?? '—'}</span>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm font-semibold text-foreground mb-3">Payment method</p>

          <div
            className={`rounded-xl border-2 p-4 mb-3 cursor-pointer transition-all ${
              paymentMethod === 'payoneer'
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/8'
                : 'border-border hover:border-violet-200 dark:hover:border-violet-500/30'
            }`}
            onClick={() => setPaymentMethod('payoneer')}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'payoneer' ? 'border-violet-600' : 'border-border'
                }`}
              >
                {paymentMethod === 'payoneer' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                )}
              </div>
              <span className="text-lg">🏦</span>
              <div>
                <p className="text-sm font-semibold text-foreground">Payoneer</p>
                <p className="text-xs text-muted-foreground">Send payment reference after checkout</p>
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${
              paymentMethod === 'bank'
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-500/8'
                : 'border-border hover:border-violet-200 dark:hover:border-violet-500/30'
            }`}
            onClick={() => setPaymentMethod('bank')}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === 'bank' ? 'border-violet-600' : 'border-border'
                }`}
              >
                {paymentMethod === 'bank' && (
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-600" />
                )}
              </div>
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold text-foreground">Bank Transfer</p>
                <p className="text-xs text-muted-foreground">Manual wire transfer, 1-2 days processing</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{plan.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {plan.features.slice(0, 3).join(' · ')}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Billed {billing}</p>
            </div>
            <p className="text-sm font-bold text-foreground flex-shrink-0">{fmt(totalPerYear)}</p>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-md shadow-violet-500/20 transition-all disabled:opacity-50"
        >
          {submitting ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" /> Processing...
            </>
          ) : (
            <>
              Subscribe to {plan.name} — {fmt(totalPerYear)}
            </>
          )}
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By subscribing you agree to our Terms of Service. Secure payment processing.
        </p>
      </div>
    </div>
  );
}
