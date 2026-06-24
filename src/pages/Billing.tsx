import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CreditCard, ExternalLink, Loader2, Crown, Sparkles, Zap, ChevronLeft, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlan } from '@/hooks/usePlan';
import { openCustomerPortal } from '@/lib/lemonsqueezy';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface BillingRow {
  plan: string;
  status: string;
  trial_ends_at: string | null;
  renews_at: string | null;
  ends_at: string | null;
  subscription_id: string | null;
  customer_portal_url: string | null;
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
  on_trial:  { label: 'Trial active',   color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  trialing:  { label: 'Trial active',   color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  active:    { label: 'Active',         color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' },
  past_due:  { label: 'Past due',       color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
  paused:    { label: 'Paused',         color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400' },
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
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('billing_subscriptions')
        .select('plan,status,trial_ends_at,renews_at,ends_at,subscription_id,customer_portal_url')
        .eq('user_id', user.id)
        .maybeSingle();
      setRow(data as BillingRow | null);
      setLoading(false);
    })();
  }, [user]);

  const effectivePlan = (row?.plan ?? plan) || 'free';
  const effectiveStatus = row?.status ?? status;
  const statusInfo = STATUS_LABEL[effectiveStatus] ?? { label: effectiveStatus || 'Unknown', color: 'bg-muted text-muted-foreground' };
  const trial = row?.trial_ends_at ?? (trialEndsAt ? trialEndsAt.toISOString() : null);
  const renews = row?.renews_at ?? null;
  const ends = row?.ends_at ?? null;

  const PlanIcon = effectivePlan === 'elite' ? Crown : effectivePlan === 'pro' ? Sparkles : Zap;
  const hasSubscription = !!row?.subscription_id;
  const isCancelling = effectiveStatus === 'cancelled' || effectiveStatus === 'canceled';

  const handlePortal = async () => {
    try {
      setOpening(true);
      await openCustomerPortal();
    } catch (e: any) {
      toast({
        title: 'Could not open billing portal',
        description: e?.message ?? 'Try again later',
        variant: 'destructive',
      });
    } finally {
      setOpening(false);
    }
  };

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

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold">Subscription</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your TradeNova plan and billing.</p>
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
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    effectivePlan === 'elite' ? 'bg-amber-500/15 text-amber-500'
                      : effectivePlan === 'pro' ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    <PlanIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Current Plan</div>
                    <div className="text-xl font-bold capitalize">{effectivePlan}</div>
                  </div>
                </div>
                <Badge className={`${statusInfo.color} border-0 px-3 py-1`}>{statusInfo.label}</Badge>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">Trial ends</div>
                  <div className="font-semibold mt-1">{isTrialing || trial ? fmtDate(trial) : '—'}</div>
                </div>
                <div className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">Next billing date</div>
                  <div className="font-semibold mt-1">{fmtDate(renews)}</div>
                </div>
                <div className="rounded-lg border border-border bg-background/40 p-4">
                  <div className="text-xs text-muted-foreground">Subscription ends</div>
                  <div className="font-semibold mt-1">{fmtDate(ends)}</div>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {effectivePlan !== 'elite' && (
                  <Button asChild className="rounded-xl bg-violet-600 hover:bg-violet-500 text-white">
                    <Link to="/pricing">Upgrade Plan</Link>
                  </Button>
                )}
                {hasSubscription ? (
                  <>
                    <Button onClick={handlePortal} disabled={opening} variant="outline" className="rounded-xl">
                      {opening
                        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Opening…</>
                        : <><CreditCard className="h-4 w-4 mr-2" /> Manage Subscription <ExternalLink className="h-3 w-3 ml-2 opacity-60" /></>}
                    </Button>
                    {!isCancelling && (
                      <Button onClick={handlePortal} disabled={opening} variant="ghost" className="rounded-xl text-muted-foreground hover:text-foreground">
                        Cancel Subscription
                      </Button>
                    )}
                  </>
                ) : (
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link to="/pricing">View Plans</Link>
                  </Button>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground flex items-center gap-2">
              <Shield className="h-3.5 w-3.5" />
              Cancel or update payment in the secure Lemon Squeezy portal. Your access continues until the end of the paid period.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
