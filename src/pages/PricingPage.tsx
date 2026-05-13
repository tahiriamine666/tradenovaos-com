// src/pages/PricingPage.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { usePlan, Plan } from '@/hooks/usePlan';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2, Zap, Crown, Rocket,
  MessageCircle, Mail, Clock, AlertCircle,
} from 'lucide-react';
import PayoneerUpgradeModal from '@/components/PayoneerUpgradeModal';

const CONTACT = {
  whatsapp: '+212XXXXXXXXX',
  email: 'support@tradenovaos.com',
};

const PLANS = [
  {
    id: 'free' as Plan,
    name: 'Free',
    icon: Zap,
    price: { monthly: 0, yearly: 0 },
    description: 'Start tracking your trades',
    accent: 'border-border',
    badge: null,
    features: [
      { t: 'Up to 50 trades / month',           ok: true },
      { t: 'Basic analytics (win rate, P&L)',    ok: true },
      { t: 'Trading calendar',                   ok: true },
      { t: 'Mind journal',                       ok: true },
      { t: 'CSV import',                         ok: false },
      { t: 'AI insights (Claude)',               ok: false },
      { t: 'Playbook lab',                       ok: false },
      { t: 'Advanced analytics',                 ok: false },
      { t: 'Replay studio',                      ok: false },
    ],
  },
  {
    id: 'pro' as Plan,
    name: 'Pro',
    icon: Rocket,
    price: { monthly: 14, yearly: 9 },
    description: 'For serious active traders',
    accent: 'border-primary',
    badge: 'Most Popular',
    features: [
      { t: 'Unlimited trades',                   ok: true },
      { t: 'Full analytics suite',               ok: true },
      { t: 'CSV import (any broker)',             ok: true },
      { t: 'AI insights (Claude)',               ok: true },
      { t: 'Playbook lab',                       ok: true },
      { t: 'Trade plan',                         ok: true },
      { t: 'Profit factor + expectancy',         ok: true },
      { t: 'Replay studio',                      ok: false },
      { t: 'API access',                         ok: false },
    ],
  },
  {
    id: 'elite' as Plan,
    name: 'Elite',
    icon: Crown,
    price: { monthly: 28, yearly: 19 },
    description: 'For funded & professional traders',
    accent: 'border-amber-500',
    badge: 'Best Value',
    features: [
      { t: 'Everything in Pro',                  ok: true },
      { t: 'Replay studio',                      ok: true },
      { t: 'API access',                         ok: true },
      { t: 'Unlimited AI analyses',              ok: true },
      { t: 'Priority support',                   ok: true },
      { t: 'Early access to new features',       ok: true },
    ],
  },
];

export default function PricingPage() {
  const { plan: currentPlan, isActive, isTrialing, trialEndsAt, loading } = usePlan();
  const [interval, setIntervalVal] = useState<'monthly' | 'yearly'>('monthly');
  const [modal, setModal] = useState<{ open: boolean; plan: 'pro' | 'elite' } | null>(null);

  const openModal = (plan: 'pro' | 'elite') => setModal({ open: true, plan });
  const closeModal = () => setModal(null);

  const whatsappMsg = encodeURIComponent('Hi! I want to upgrade my TradeNova plan. ');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold font-heading text-foreground">Choose your plan</h2>
        <p className="text-muted-foreground">Manual activation via Payoneer · Usually within 24 hours</p>
        <div className="flex items-center justify-center gap-2 mt-2">
          <Badge variant="outline" className="border-amber-500/30 text-amber-500 bg-amber-500/5 text-xs">
            🔄 Stripe coming soon
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Clock className="h-3 w-3 mr-1" /> Manual activation 24h
          </Badge>
        </div>
      </div>

      {/* Payment method notice */}
      <Card className="border-0 shadow-sm bg-muted/30">
        <CardContent className="py-4 px-5">
          <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
            <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Payments handled manually via Payoneer</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                After payment, we'll manually activate your plan within 24 hours. Stripe integration coming soon for instant activation.
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <a href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g,'')}?text=${whatsappMsg}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
              </a>
              <a href={`mailto:${CONTACT.email}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-muted-foreground text-xs font-medium hover:bg-muted/50 transition-colors">
                <Mail className="h-3.5 w-3.5" /> Email
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current plan banner */}
      {currentPlan !== 'free' && isActive && (
        <Card className="border-0 shadow-sm border-l-4 border-l-primary">
          <CardContent className="py-3 px-4">
            <p className="text-sm font-medium text-foreground">
              You're on <span className="capitalize font-bold text-primary">{currentPlan}</span>
              {isTrialing && <span className="text-muted-foreground"> (trial)</span>}
            </p>
            {trialEndsAt && isTrialing && (
              <p className="text-xs text-muted-foreground">Trial ends {trialEndsAt.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Interval toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={`text-sm font-medium ${interval === 'monthly' ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
        <button onClick={() => setIntervalVal(v => v === 'monthly' ? 'yearly' : 'monthly')}
          className={`relative h-6 w-12 rounded-full transition-colors ${interval === 'yearly' ? 'bg-primary' : 'bg-muted'}`}>
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${interval === 'yearly' ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
        <span className={`text-sm font-medium ${interval === 'yearly' ? 'text-foreground' : 'text-muted-foreground'}`}>Yearly</span>
        {interval === 'yearly' && <Badge className="bg-emerald-500/10 text-emerald-500 border-0 text-xs">Save up to 35%</Badge>}
      </div>

      {/* Plan grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((p, i) => {
          const Icon     = p.icon;
          const price    = p.price[interval];
          const isCur    = currentPlan === p.id && (isActive || p.id === 'free');
          const isPopular = p.badge === 'Most Popular';
          const isBest    = p.badge === 'Best Value';

          return (
            <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className={`relative flex flex-col rounded-2xl border-2 ${p.accent} bg-card overflow-hidden ${isPopular ? 'shadow-xl shadow-primary/15' : 'shadow-sm'}`}>
              {p.badge && (
                <div className={`absolute top-0 inset-x-0 text-center py-1.5 text-xs font-semibold ${isPopular ? 'bg-primary text-primary-foreground' : 'bg-amber-500 text-white'}`}>
                  {p.badge}
                </div>
              )}
              <div className={`flex flex-col flex-1 p-6 ${p.badge ? 'pt-10' : ''}`}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-5">
                  <div className={`rounded-xl p-2.5 ${isPopular ? 'bg-primary/15' : isBest ? 'bg-amber-500/10' : 'bg-muted'}`}>
                    <Icon className={`h-5 w-5 ${isPopular ? 'text-primary' : isBest ? 'text-amber-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-foreground">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6">
                  {price === 0 ? (
                    <p className="text-4xl font-bold font-heading text-foreground">$0 <span className="text-sm font-normal text-muted-foreground">forever</span></p>
                  ) : (
                    <>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-bold font-heading text-foreground">${price}</span>
                        <span className="text-muted-foreground text-sm mb-1">/mo</span>
                        {interval === 'yearly' && <Badge className="mb-1 bg-emerald-500/10 text-emerald-500 border-0 text-xs">Save ${(p.price.monthly - price) * 12}/yr</Badge>}
                      </div>
                      {interval === 'yearly' && <p className="text-xs text-muted-foreground mt-0.5">Billed ${price * 12} annually</p>}
                    </>
                  )}
                </div>

                {/* CTA */}
                <div className="mb-6">
                  {isCur ? (
                    <Button variant="outline" className="w-full rounded-xl" disabled>
                      <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                      {isTrialing ? 'On Trial' : 'Current Plan'}
                    </Button>
                  ) : p.id === 'free' ? (
                    <Button variant="outline" className="w-full rounded-xl" disabled>Downgrade</Button>
                  ) : (
                    <Button onClick={() => openModal(p.id as 'pro' | 'elite')}
                      className={`w-full rounded-xl ${isBest ? 'bg-amber-500 hover:bg-amber-600 text-white border-0' : ''}`}>
                      Start 14-day trial
                    </Button>
                  )}
                  {p.id !== 'free' && !isCur && (
                    <p className="text-xs text-center text-muted-foreground mt-2">Via Payoneer · Activated within 24h</p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {p.features.map((f, j) => (
                    <li key={j} className={`flex items-start gap-2.5 text-sm ${f.ok ? 'text-foreground' : 'text-muted-foreground/40 line-through'}`}>
                      <CheckCircle2 className={`h-4 w-4 flex-shrink-0 mt-0.5 ${f.ok ? 'text-emerald-500' : 'text-muted-foreground/25'}`} />
                      {f.t}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* FAQ */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <h3 className="font-heading font-semibold text-foreground mb-4">Common questions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              { q: 'How do I pay?', a: 'Send payment via Payoneer to our account, then submit your transaction reference in the upgrade modal.' },
              { q: 'How fast is activation?', a: 'Usually within 24 hours of payment confirmation. Contact us on WhatsApp for faster activation.' },
              { q: 'When will Stripe be available?', a: 'Stripe integration is coming soon. Until then, all payments are handled manually via Payoneer.' },
              { q: 'Can I get a refund?', a: 'Yes, within 7 days if the plan was not activated. Contact us directly.' },
              { q: 'What currencies are accepted?', a: 'USD via Payoneer. Contact us if you need other arrangements.' },
              { q: 'What\'s the Free plan limit?', a: '50 trades per month. Unlimited journaling, calendar, and basic analytics.' },
            ].map(({ q, a }) => (
              <div key={q} className="space-y-1">
                <p className="text-sm font-medium text-foreground">{q}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upgrade modal */}
      {modal && (
        <PayoneerUpgradeModal
          open={modal.open}
          plan={modal.plan}
          interval={interval}
          onClose={closeModal}
        />
      )}
    </motion.div>
  );
}
