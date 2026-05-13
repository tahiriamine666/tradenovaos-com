// src/components/PayoneerUpgradeModal.tsx
// Premium upgrade modal — replaces Stripe checkout temporarily.
// Shows Payoneer payment instructions + WhatsApp + Email contact.

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  X, Zap, Crown, Check, Copy, ExternalLink,
  MessageCircle, Mail, ArrowRight, Loader2, CheckCircle2,
  Clock, Shield, CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

// ─── Config — update these ────────────────────────────────────────────────────
const CONTACT = {
  whatsapp:   '+212XXXXXXXXX',      // ← replace with your WhatsApp number
  email:      'support@tradenova.app',
  payoneer:   'payments@tradenova.app', // Payoneer email to send payment to
};

const PLAN_PRICES = {
  pro:   { monthly: 29, yearly: 19 },
  elite: { monthly: 59, yearly: 39 },
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Plan     = 'pro' | 'elite';
type Interval = 'monthly' | 'yearly';
type Step     = 'info' | 'payment' | 'confirm' | 'success';

interface PayoneerUpgradeModalProps {
  open:         boolean;
  plan:         Plan;
  interval:     Interval;
  onClose:      () => void;
  onSuccess?:   () => void;
}

// ─── Step indicators ──────────────────────────────────────────────────────────
function Steps({ current }: { current: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: 'info',    label: 'Plan' },
    { id: 'payment', label: 'Payment' },
    { id: 'confirm', label: 'Confirm' },
  ];
  const idx = steps.findIndex(s => s.id === current);

  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {steps.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex items-center gap-1.5">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
              i < idx  ? 'bg-primary text-primary-foreground' :
              i === idx ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
              'bg-muted text-muted-foreground'
            }`}>
              {i < idx ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${i <= idx ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px max-w-[40px] transition-all ${i < idx ? 'bg-primary' : 'bg-border'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyBtn({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────
export default function PayoneerUpgradeModal({
  open, plan, interval, onClose, onSuccess,
}: PayoneerUpgradeModalProps) {
  const [step,       setStep]       = useState<Step>('info');
  const [ref,        setRef]        = useState('');
  const [message,    setMessage]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [reqId,      setReqId]      = useState<string | null>(null);

  const price    = PLAN_PRICES[plan][interval];
  const yearlyTotal = price * 12;
  const PlanIcon = plan === 'elite' ? Crown : Zap;
  const planColor = plan === 'elite' ? 'text-amber-500' : 'text-primary';
  const planBg    = plan === 'elite' ? 'bg-amber-500/10 border-amber-500/20' : 'bg-primary/10 border-primary/20';

  const whatsappMsg = encodeURIComponent(
    `Hi! I want to upgrade to TradeNova ${plan.charAt(0).toUpperCase() + plan.slice(1)} (${interval}) - $${price}/mo. My email: `
  );
  const emailSubject = encodeURIComponent(`TradeNova ${plan} upgrade request`);
  const emailBody    = encodeURIComponent(
    `Hi,\n\nI'd like to upgrade to TradeNova ${plan.charAt(0).toUpperCase() + plan.slice(1)} (${interval}) - $${price}/mo.\n\nMy Payoneer reference: [add here]\n\nThank you.`
  );

  const handleReset = () => {
    setStep('info');
    setRef('');
    setMessage('');
    setReqId(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmitRequest = async () => {
    if (!ref.trim()) {
      toast({ title: 'Reference required', description: 'Please enter your Payoneer transaction reference.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('request_upgrade', {
        p_plan:          plan,
        p_payoneer_ref:  ref.trim(),
        p_message:       message.trim() || null,
      });
      if (error) throw error;
      setReqId(data);
      setStep('success');
      toast({ title: 'Request submitted!', description: 'We\'ll review and activate your plan within 24h.' });
      onSuccess?.();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message ?? 'Could not submit. Please contact support.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleClose} />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0,  scale: 1 }}
          exit={{   opacity: 0, y: 40, scale: 0.97 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="relative w-full sm:max-w-md bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[94vh] flex flex-col"
        >
          {/* Close */}
          <button onClick={handleClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10">
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className={`rounded-xl p-2.5 border ${planBg}`}>
                <PlanIcon className={`h-5 w-5 ${planColor}`} />
              </div>
              <div>
                <h2 className="font-heading font-bold text-foreground text-lg">
                  Upgrade to TradeNova <span className="capitalize">{plan}</span>
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm text-muted-foreground">${price}/mo · {interval}</span>
                  <Badge variant="outline" className="text-[10px] rounded-full px-2 border-amber-500/30 text-amber-500 bg-amber-500/5">
                    🔄 Stripe coming soon
                  </Badge>
                </div>
              </div>
            </div>

            {step !== 'success' && <Steps current={step} />}
          </div>

          {/* Scrollable body */}
          <div className="overflow-y-auto flex-1 px-6 py-5">

            {/* ── Step 1: Info ── */}
            {step === 'info' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">

                {/* Description */}
                <div className="rounded-xl bg-muted/40 border border-border p-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Manual Payment via Payoneer
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Payments are currently handled manually via Payoneer. After sending payment, submit your transaction reference and we'll activate your plan within 24 hours.
                  </p>
                </div>

                {/* Plan features */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    What you get with {plan}
                  </p>
                  <div className="space-y-2">
                    {(plan === 'pro' ? [
                      'Unlimited trades',
                      'CSV import from any broker',
                      'AI insights powered by Claude',
                      'Playbook lab',
                      'Advanced analytics (profit factor, expectancy)',
                      'Trade plan',
                      '14-day free trial',
                    ] : [
                      'Everything in Pro',
                      'Replay studio (candle-by-candle)',
                      'Unlimited AI analyses',
                      'API access',
                      'Priority support',
                      'Early access to new features',
                    ]).map(f => (
                      <div key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price summary */}
                <div className={`rounded-xl border p-4 ${planBg}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground capitalize">{plan} · {interval}</span>
                    <div className="text-right">
                      <span className={`text-2xl font-bold font-heading ${planColor}`}>${price}</span>
                      <span className="text-muted-foreground text-sm">/mo</span>
                    </div>
                  </div>
                  {interval === 'yearly' && (
                    <p className="text-xs text-muted-foreground mt-1">Billed ${yearlyTotal} annually</p>
                  )}
                </div>

                {/* Quick contact */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Have questions first?</p>
                  <div className="flex gap-2">
                    <a href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g, '')}?text=${whatsappMsg}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                    <a href={`mailto:${CONTACT.email}?subject=${emailSubject}&body=${emailBody}`}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted/50 hover:text-foreground transition-colors">
                      <Mail className="h-4 w-4" /> Email
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Payment ── */}
            {step === 'payment' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

                <div className="rounded-xl bg-primary/5 border border-primary/20 p-4 space-y-1">
                  <p className="text-sm font-semibold text-foreground">Send payment via Payoneer</p>
                  <p className="text-xs text-muted-foreground">Send exactly <strong>${price} USD</strong> to the address below, then proceed to confirm.</p>
                </div>

                {/* Payoneer email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Payoneer Email / Account</label>
                  <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2.5">
                    <span className="text-sm text-foreground flex-1 font-mono">{CONTACT.payoneer}</span>
                    <CopyBtn value={CONTACT.payoneer} />
                  </div>
                </div>

                {/* Amount */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Amount to Send</label>
                  <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2.5">
                    <span className="text-sm text-foreground flex-1 font-mono font-bold">${interval === 'yearly' ? yearlyTotal : price} USD</span>
                    <CopyBtn value={`${interval === 'yearly' ? yearlyTotal : price}`} />
                  </div>
                </div>

                {/* Reference note */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Payment Note / Reference</label>
                  <div className="flex items-center gap-2 bg-muted/40 border border-border rounded-xl px-3 py-2.5">
                    <span className="text-sm text-foreground flex-1 font-mono">TradeNova {plan} - {interval}</span>
                    <CopyBtn value={`TradeNova ${plan} - ${interval}`} />
                  </div>
                  <p className="text-xs text-muted-foreground">Add this note to your Payoneer payment for faster processing.</p>
                </div>

                {/* Instructions */}
                <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-4 space-y-2">
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> How it works
                  </p>
                  <ol className="space-y-1.5 text-xs text-muted-foreground list-decimal list-inside">
                    <li>Send ${interval === 'yearly' ? yearlyTotal : price} USD via Payoneer to the address above</li>
                    <li>Copy your Payoneer transaction reference/ID</li>
                    <li>Click "I've paid" and paste your reference</li>
                    <li>We'll activate your plan within 24 hours</li>
                  </ol>
                </div>

                {/* Contact */}
                <div className="flex gap-2">
                  <a href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g,'')}?text=${whatsappMsg}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp Support
                  </a>
                  <a href={`mailto:${CONTACT.email}?subject=${emailSubject}&body=${emailBody}`}
                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border border-border text-muted-foreground text-xs font-medium hover:bg-muted/50 transition-colors">
                    <Mail className="h-3.5 w-3.5" /> Email Support
                  </a>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Confirm ── */}
            {step === 'confirm' && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

                <div className="rounded-xl bg-muted/40 border border-border p-4">
                  <p className="text-sm font-medium text-foreground mb-1">Confirm your payment</p>
                  <p className="text-xs text-muted-foreground">Enter your Payoneer transaction reference so we can verify your payment.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">
                    Payoneer Transaction Reference <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={ref}
                    onChange={e => setRef(e.target.value)}
                    placeholder="e.g. PAY-XXXXXXXXX or transaction ID"
                    className="rounded-xl font-mono text-sm"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">Find this in your Payoneer transaction history.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground block">Message (optional)</label>
                  <Textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Any additional info for faster processing..."
                    rows={2}
                    className="rounded-xl text-sm resize-none"
                  />
                </div>

                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 flex items-start gap-2">
                  <Shield className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">Your request is secure. We'll verify payment and activate your plan within 24 hours. You'll receive confirmation by email.</p>
                </div>
              </motion.div>
            )}

            {/* ── Step 4: Success ── */}
            {step === 'success' && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-4 text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-heading font-bold text-foreground text-lg">Request Submitted!</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Your upgrade request has been received. We'll verify your Payoneer payment and activate your <strong className="capitalize text-foreground">{plan}</strong> plan within <strong className="text-foreground">24 hours</strong>.
                  </p>
                  {reqId && (
                    <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 font-mono">
                      Request ID: {reqId.slice(0, 8).toUpperCase()}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Need faster activation?</p>
                  <div className="flex gap-2 justify-center">
                    <a href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g,'')}?text=Hi! My TradeNova upgrade request ID is ${reqId?.slice(0,8).toUpperCase()}. Please confirm.`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 transition-colors">
                      <MessageCircle className="h-4 w-4" /> WhatsApp
                    </a>
                    <a href={`mailto:${CONTACT.email}?subject=Upgrade request ${reqId?.slice(0,8).toUpperCase()}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted/50 transition-colors">
                      <Mail className="h-4 w-4" /> Email
                    </a>
                  </div>
                </div>
                <Button onClick={handleClose} className="w-full rounded-xl">Back to Dashboard</Button>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          {step !== 'success' && (
            <div className="px-6 py-4 border-t border-border flex gap-3 flex-shrink-0">
              {step === 'info' && (
                <>
                  <Button onClick={() => setStep('payment')} className="flex-1 rounded-xl gap-2">
                    Continue with Payoneer <ArrowRight className="h-4 w-4" />
                  </Button>
                  <a href={`https://wa.me/${CONTACT.whatsapp.replace(/\D/g,'')}?text=${whatsappMsg}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-border text-muted-foreground text-sm font-medium hover:bg-muted/50 transition-colors">
                    <MessageCircle className="h-4 w-4" />
                    <span className="hidden sm:inline">Contact</span>
                  </a>
                </>
              )}
              {step === 'payment' && (
                <>
                  <Button variant="outline" onClick={() => setStep('info')} className="rounded-xl">Back</Button>
                  <Button onClick={() => setStep('confirm')} className="flex-1 rounded-xl gap-2">
                    I've paid <ArrowRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              {step === 'confirm' && (
                <>
                  <Button variant="outline" onClick={() => setStep('payment')} className="rounded-xl">Back</Button>
                  <Button onClick={handleSubmitRequest} disabled={submitting || !ref.trim()} className="flex-1 rounded-xl gap-2">
                    {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</> : <>Submit Request <ArrowRight className="h-4 w-4" /></>}
                  </Button>
                </>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
