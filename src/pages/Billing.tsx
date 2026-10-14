import { errorMessage } from '@/lib/dataTypes';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, ExternalLink, Loader2, Crown, Sparkles, ChevronLeft, Shield, Download, RotateCcw, XCircle } from 'lucide-react';
import { fetchBillingSummary, setCancelAtPeriodEnd, startPaymentMethodUpdate, downloadInvoice, formatMinorAmount, intervalLabel, type BillingSummary } from '@/lib/billingNative';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/hooks/usePlan';
import { openCustomerPortal } from '@/lib/dodo';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface BillingRow {
  plan: 'pro' | 'elite' | null;
  status: string | null;
  trial_end: string | null;
  renews_at: string | null;
  ends_at: string | null;
  dodo_subscription_id: string | null;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
  } catch {
    return iso;
  }
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  on_trial:  { label: 'Trial active',   color: 'bg-primary/15 text-primary dark:text-primary' },
  trialing:  { label: 'Trial active',   color: 'bg-primary/15 text-primary dark:text-primary' },
  active:    { label: 'Active',         color: 'bg-primary/15 text-primary dark:text-primary' },
  past_due:  { label: 'Past due',       color: 'bg-muted/15 text-muted-foreground dark:text-muted-foreground' },
  paused:    { label: 'Paused',         color: 'bg-muted/15 text-muted-foreground dark:text-muted-foreground' },
  cancelled: { label: 'Cancelled',      color: 'bg-muted text-muted-foreground' },
  canceled:  { label: 'Cancelled',      color: 'bg-muted text-muted-foreground' },
  expired:   { label: 'Expired',        color: 'bg-muted text-muted-foreground' },
  inactive:  { label: 'No subscription', color: 'bg-muted text-muted-foreground' },
};

export default function Billing() {
  const { user } = useAuth();
  const { plan, status, trialEndsAt, isTrialing } = usePlan();
  const [row, setRow] = useState<BillingRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [native, setNative] = useState<BillingSummary | null>(null);
  const [nativeLoading, setNativeLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('billing_subscriptions')
        .select('plan,status,trial_ends_at,renews_at,ends_at,subscription_id')
        .eq('user_id', user.id)
        .maybeSingle();
      setRow(data ? {
        plan: data.plan, status: data.status, trial_end: data.trial_ends_at,
        renews_at: data.renews_at, ends_at: data.ends_at, dodo_subscription_id: data.subscription_id,
      } as BillingRow : null);
      setLoading(false);
      if (data?.subscription_id) setNative(await fetchBillingSummary());
      setNativeLoading(false);
    })();
  }, [user]);

  const effectivePlan = row?.plan ?? plan ?? null;
  const effectiveStatus = row?.status ?? status;
  const statusInfo = STATUS_LABEL[effectiveStatus] ?? { label: effectiveStatus || 'Unknown', color: 'bg-muted text-muted-foreground' };
  const trial = row?.trial_end ?? (trialEndsAt ? trialEndsAt.toISOString() : null);
  const sub = native?.subscription;
  const renews = sub?.next_billing_date ?? row?.renews_at ?? null;
  const ends = row?.ends_at ?? null;
  const amount = formatMinorAmount(sub?.amount, sub?.currency);
  const scheduledCancel = !!sub?.cancel_at_next_billing_date;

  const PlanIcon = effectivePlan === 'elite' ? Crown : effectivePlan === 'pro' ? Sparkles : CreditCard;
  const hasSubscription = !!row?.dodo_subscription_id;
  const isEnded = ['canceled', 'cancelled', 'expired'].includes(String(effectiveStatus));

  const run = async (key: string, fn: () => Promise<void>, errTitle: string) => {
    try { setBusy(key); await fn(); }
    catch (e: unknown) { toast({ title: errTitle, description: errorMessage(e) ?? 'Try again later', variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  const toggleCancel = (cancel: boolean) => run(cancel ? 'cancel' : 'reactivate', async () => {
    const now = await setCancelAtPeriodEnd(cancel);
    setNative((n) => n ? { ...n, subscription: { ...n.subscription, cancel_at_next_billing_date: now } } : n);
    toast({ title: cancel ? 'Cancellation scheduled' : 'Subscription reactivated',
      description: cancel ? `You keep access until ${fmtDate(renews)}.` : 'Your plan will renew as normal.' });
  }, 'Could not update subscription');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="border-b border-border/60 sticky top-0 bg-background/80 backdrop-blur z-30">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="h-4 w-4" /> Back to app
          </Link>
          <div className="text-sm font-bold">Billing</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold">Subscription & Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your TradeNova plan, renewals and invoices.</p>
        </motion.div>

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-10 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${effectivePlan ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                    <PlanIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Current Plan</div>
                    <div className="text-xl font-bold capitalize">{effectivePlan ?? 'No active plan'}</div>
                    {amount && <div className="text-sm text-muted-foreground">{amount} {intervalLabel(sub?.interval ?? null, sub?.interval_count ?? null)}</div>}
                  </div>
                </div>
                <Badge className={`${scheduledCancel ? 'bg-muted text-muted-foreground' : statusInfo.color} border-0 px-3 py-1`}>
                  {scheduledCancel ? 'Cancels at period end' : statusInfo.label}
                </Badge>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">Trial ends</div>
                  <div className="font-semibold mt-1">{isTrialing || trial ? fmtDate(trial) : '—'}</div>
                </div>
                <div className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">{scheduledCancel ? 'Access until' : 'Next billing date'}</div>
                  <div className="font-semibold mt-1">{fmtDate(renews)}</div>
                </div>
                <div className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">Subscription ends</div>
                  <div className="font-semibold mt-1">{fmtDate(ends)}</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {effectivePlan !== 'elite' && (
                  <Button asChild className="rounded-xl"><Link to="/pricing">Upgrade Plan</Link></Button>
                )}
                {hasSubscription && !isEnded && native && ['active', 'on_hold'].includes(String(sub?.status).toLowerCase()) && (
                  <>
                    <Button variant="outline" className="rounded-xl" disabled={!!busy}
                      onClick={() => run('pm', startPaymentMethodUpdate, 'Could not start payment update')}>
                      {busy === 'pm' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
                      Update payment method
                    </Button>
                    {scheduledCancel ? (
                      <Button variant="outline" className="rounded-xl" disabled={!!busy} onClick={() => toggleCancel(false)}>
                        {busy === 'reactivate' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />}
                        Reactivate subscription
                      </Button>
                    ) : (
                      <Button variant="ghost" className="rounded-xl text-muted-foreground hover:text-foreground" disabled={!!busy} onClick={() => setConfirmCancel(true)}>
                        <XCircle className="h-4 w-4 mr-2" /> Cancel subscription
                      </Button>
                    )}
                  </>
                )}
                {!hasSubscription && (
                  <Button asChild variant="outline" className="rounded-xl"><Link to="/pricing">View Plans</Link></Button>
                )}
              </div>
              {hasSubscription && !nativeLoading && !native && (
                <p className="mt-4 text-xs text-muted-foreground">Live billing details are temporarily unavailable. You can still manage your subscription through the secure payment portal below.</p>
              )}
            </div>

            {hasSubscription && (
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-sm font-semibold">Payment history</h2>
                {nativeLoading ? (
                  <div className="py-6 flex justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                ) : !native ? (
                  <p className="text-sm text-muted-foreground mt-3">Not available right now.</p>
                ) : native.payments.length === 0 ? (
                  <p className="text-sm text-muted-foreground mt-3">No payments yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-border">
                    {native.payments.map((p) => (
                      <li key={p.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                        <div>
                          <div className="font-medium">{fmtDate(p.created_at)}</div>
                          <div className="text-xs text-muted-foreground capitalize">{(p.status ?? 'unknown').replace(/_/g, ' ')}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold tabular-nums">{formatMinorAmount(p.amount, p.currency) ?? '—'}</span>
                          {p.status === 'succeeded' && (
                            <Button size="sm" variant="ghost" disabled={!!busy} aria-label="Download invoice"
                              onClick={() => run(`inv-${p.id}`, () => downloadInvoice(p.id), 'Invoice not available')}>
                              {busy === `inv-${p.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-2">
              <p className="flex items-start gap-2">
                <Shield className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                Payments are processed securely by our payment partner. Updating your card opens a secure external checkout page, because TradeNova never handles card details directly. Cancellations take effect at the end of your paid period.
              </p>
              {hasSubscription && (
                <button className="underline underline-offset-2 hover:text-foreground inline-flex items-center gap-1" disabled={!!busy}
                  onClick={() => run('portal', openCustomerPortal, 'Could not open billing portal')}>
                  Open advanced billing portal <ExternalLink className="h-3 w-3" />
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel your subscription?</AlertDialogTitle>
            <AlertDialogDescription>
              Your plan stays active until {fmtDate(renews)}. You won't be charged again, and you can reactivate any time before then.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep plan</AlertDialogCancel>
            <AlertDialogAction onClick={() => toggleCancel(true)}>Cancel at period end</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
