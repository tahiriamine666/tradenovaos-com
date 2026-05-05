// ─── PricingPage.tsx ──────────────────────────────────────────────────────────
// Pricing page with Free / Pro / Elite plans + Stripe checkout integration

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePlan } from '@/hooks/usePlan';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Zap, Crown, Rocket, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ─── Plans config ─────────────────────────────────────────────────────────────
const PLANS = [
  {
    id: 'free',
    name: 'Free',
    icon: Zap,
    price: { monthly: 0, yearly: 0 },
    description: 'Start tracking your trades',
    color: 'border-border',
    badge: null,
    features: [
      'Up to 50 trades / month',
      'Basic analytics (win rate, P&L)',
      'Trading calendar',
      'Mind journal',
      'Dark / light mode',
    ],
    missing: [
      'CSV import',
      'AI insights',
      'Playbook lab',
      'Trade plan',
      'Advanced analytics',
      'Replay studio',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Rocket,
    price: { monthly: 29, yearly: 19 },
    description: 'For serious active traders',
    color: 'border-primary',
    badge: 'Most Popular',
    features: [
      'Unlimited trades',
      'Full analytics suite',
      'CSV import (any broker)',
      'AI insights powered by Claude',
      'Playbook lab',
      'Trade plan (daily)',
      'Advanced metrics (profit factor, expectancy)',
      '14-day free trial',
      'Email support',
    ],
    missing: [
      'Replay studio',
      'API access',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    icon: Crown,
    price: { monthly: 59, yearly: 39 },
    description: 'For funded & professional traders',
    color: 'border-amber-500',
    badge: 'Best Value',
    features: [
      'Everything in Pro',
      'Replay studio (candle-by-candle)',
      'API access',
      'Unlimited AI analyses',
      'Priority support',
      'Early access to new features',
      '14-day free trial',
    ],
    missing: [],
  },
];

// ─── Plan card ────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  interval,
  currentPlan,
  isActive,
  onSelect,
  loading,
}: {
  plan: typeof PLANS[0];
  interval: 'monthly' | 'yearly';
  currentPlan: string;
  isActive: boolean;
  onSelect: (planId: string) => void;
  loading: boolean;
}) {
  const Icon = plan.icon;
  const price = plan.price[interval];
  const isCurrent = currentPlan === plan.id && isActive;
  const isPopular = plan.badge === 'Most Popular';
  const isBest = plan.badge === 'Best Value';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border-2 ${plan.color} bg-card shadow-sm overflow-hidden ${
        isPopular ? 'shadow-primary/20 shadow-lg' : ''
      }`}
    >
      {plan.badge && (
        <div className={`absolute top-0 left-0 right-0 text-center py-1.5 text-xs font-semibold ${
          isPopular ? 'bg-primary text-primary-foreground' : 'bg-amber-500 text-white'
        }`}>
          {plan.badge}
        </div>
      )}

      <div className={`p-6 ${plan.badge ? 'pt-10' : ''}`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`rounded-xl p-2.5 ${
            isPopular ? 'bg-primary/10' : isBest ? 'bg-amber-500/10' : 'bg-muted'
          }`}>
            <Icon className={`h-5 w-5 ${
              isPopular ? 'text-primary' : isBest ? 'text-amber-500' : 'text-muted-foreground'
            }`} />
          </div>
          <div>
            <h3 className="font-heading font-bold text-foreground">{plan.name}</h3>
            <p className="text-xs text-muted-foreground">{plan.description}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          {price === 0 ? (
            <div>
              <span className="text-4xl font-bold font-heading text-foreground">$0</span>
              <span className="text-muted-foreground text-sm ml-1">forever</span>
            </div>
          ) : (
            <div>
              <span className="text-4xl font-bold font-heading text-foreground">${price}</span>
              <span className="text-muted-foreground text-sm ml-1">/mo</span>
              {interval === 'yearly' && (
                <Badge className="ml-2 bg-emerald-500/10 text-emerald-600 border-0 text-xs">
                  Save ${(plan.price.monthly - price) * 12}/yr
                </Badge>
              )}
            </div>
          )}
          {price > 0 && interval === 'yearly' && (
            <p className="text-xs text-muted-foreground mt-1">Billed ${price * 12}/year</p>
          )}
        </div>

        {/* CTA */}
        {isCurrent ? (
          <Button variant="outline" className="w-full rounded-xl" disabled>
            ✓ Current Plan
          </Button>
        ) : plan.id === 'free' ? (
          <Button variant="outline" className="w-full rounded-xl" disabled={currentPlan !== 'free'}>
            {currentPlan === 'free' ? 'Current Plan' : 'Downgrade'}
          </Button>
        ) : (
          <Button
            onClick={() => onSelect(plan.id)}
            disabled={loading}
            className={`w-full rounded-xl ${
              isPopular ? '' : isBest ? 'bg-amber-500 hover:bg-amber-600 text-white border-0' : ''
            }`}
          >
            {loading ? 'Redirecting...' : `Start 14-day trial`}
          </Button>
        )}

        <p className="text-xs text-center text-muted-foreground mt-2">
          {plan.id === 'free' ? 'No credit card required' : 'Cancel anytime · No credit card for trial'}
        </p>

        {/* Features */}
        <div className="mt-6 space-y-2.5">
          {plan.features.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-foreground">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
              {f}
            </div>
          ))}
          {plan.missing.map((f, i) => (
            <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground/50 line-through">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground/30 flex-shrink-0 mt-0.5" />
              {f}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PricingPage() {
  const { plan: currentPlan, isActive, checkout, openPortal, isTrialing, currentPeriodEnd, cancelAtPeriodEnd } = usePlan();
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleSelect = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      await checkout(planId as 'pro' | 'elite', interval);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Could not start checkout.', variant: 'destructive' });
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold font-heading text-foreground">Choose your plan</h2>
        <p className="text-muted-foreground mt-2">Upgrade anytime. Cancel anytime. 14-day free trial.</p>
      </div>

      {/* Current plan banner */}
      {currentPlan !== 'free' && (
        <Card className="border-0 shadow-sm border-l-4 border-l-primary">
          <CardContent className="py-3 px-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">
                You're on the <span className="capitalize font-bold text-primary">{currentPlan}</span> plan
                {isTrialing && ' (trial)'}
              </p>
              {currentPeriodEnd && (
                <p className="text-xs text-muted-foreground">
                  {cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on {new Date(currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={openPortal} className="rounded-xl gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" /> Manage Billing
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Interval toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm ${interval === 'monthly' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          Monthly
        </span>
        <button
          onClick={() => setInterval(v => v === 'monthly' ? 'yearly' : 'monthly')}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            interval === 'yearly' ? 'bg-primary' : 'bg-muted'
          }`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            interval === 'yearly' ? 'translate-x-7' : 'translate-x-1'
          }`} />
        </button>
        <span className={`text-sm ${interval === 'yearly' ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
          Yearly
        </span>
        {interval === 'yearly' && (
          <Badge className="bg-emerald-500/10 text-emerald-600 border-0 text-xs">Save ~35%</Badge>
        )}
      </div>

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map(plan => (
          <PlanCard
            key={plan.id}
            plan={plan}
            interval={interval}
            currentPlan={currentPlan}
            isActive={isActive}
            onSelect={handleSelect}
            loading={checkoutLoading === plan.id}
          />
        ))}
      </div>

      {/* FAQ */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Common questions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { q: 'Can I cancel anytime?', a: 'Yes — cancel from billing portal anytime. You keep access until period end.' },
              { q: 'What happens after the trial?', a: "You're charged automatically. Cancel before trial ends to avoid charges." },
              { q: 'Do you offer refunds?', a: 'Yes, within 7 days of any charge. Contact support.' },
              { q: 'Can I switch plans?', a: 'Yes — upgrade or downgrade anytime from the billing portal.' },
            ].map(({ q, a }) => (
              <div key={q}>
                <p className="text-sm font-medium text-foreground">{q}</p>
                <p className="text-xs text-muted-foreground mt-1">{a}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
