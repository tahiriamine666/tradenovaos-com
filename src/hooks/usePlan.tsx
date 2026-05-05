// usePlan — reads subscription plan from profiles table.
// Stripe billing is stubbed until Stripe is enabled.
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export type Plan = 'free' | 'pro' | 'elite';

export interface PlanInfo {
  plan: Plan;
  status: string;
  isActive: boolean;
  isPro: boolean;
  isElite: boolean;
  isFree: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  isTrialing: boolean;
}

const FREE_PLAN: PlanInfo = {
  plan: 'free', status: 'active', isActive: true,
  isPro: false, isElite: false, isFree: true,
  currentPeriodEnd: null, cancelAtPeriodEnd: false,
  trialEnd: null, isTrialing: false,
};

export const PLAN_FEATURES: Record<string, Plan[]> = {
  trades_basic:       ['free', 'pro', 'elite'],
  analytics_basic:    ['free', 'pro', 'elite'],
  calendar:           ['free', 'pro', 'elite'],
  journal:            ['free', 'pro', 'elite'],
  csv_import:         ['pro', 'elite'],
  ai_insights:        ['pro', 'elite'],
  playbooks:          ['pro', 'elite'],
  trade_plan:         ['pro', 'elite'],
  analytics_advanced: ['pro', 'elite'],
  replay:             ['elite'],
  api_access:         ['elite'],
  unlimited_trades:   ['elite'],
};

export function usePlan() {
  const { user } = useAuth();
  const [planInfo, setPlanInfo] = useState<PlanInfo>(FREE_PLAN);
  const [loading, setLoading] = useState(true);

  const fetchPlan = useCallback(async () => {
    if (!user) { setPlanInfo(FREE_PLAN); setLoading(false); return; }
    const { data } = await supabase
      .from('profiles')
      .select('subscription_plan')
      .eq('id', user.id)
      .maybeSingle();

    const plan = ((data?.subscription_plan ?? 'free') as Plan);
    setPlanInfo({
      ...FREE_PLAN,
      plan,
      isFree: plan === 'free',
      isPro: plan === 'pro',
      isElite: plan === 'elite',
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPlan(); }, [fetchPlan]);

  const canAccess = useCallback((feature: string): boolean => {
    const allowed = PLAN_FEATURES[feature] ?? [];
    return allowed.includes(planInfo.plan) && planInfo.isActive;
  }, [planInfo]);

  const checkout = useCallback(async (plan: 'pro' | 'elite', _interval: 'monthly' | 'yearly' = 'monthly') => {
    toast({
      title: 'Billing not enabled yet',
      description: `Stripe checkout for ${plan} will be available once billing is set up.`,
    });
  }, []);

  const openPortal = useCallback(async () => {
    toast({
      title: 'Billing portal unavailable',
      description: 'Stripe is not configured yet.',
    });
  }, []);

  return { ...planInfo, loading, canAccess, checkout, openPortal, refresh: fetchPlan };
}

// PlanGate — wraps gated content
import React from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function PlanGate({
  feature,
  children,
  fallback,
}: {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { canAccess, loading, checkout } = usePlan();

  if (loading) return null;
  if (canAccess(feature)) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  const requiredPlan = PLAN_FEATURES[feature]?.[0] ?? 'pro';

  return (
    <Card className="border-0 shadow-sm border-dashed border-2 border-border">
      <CardContent className="py-12 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-heading font-semibold text-foreground capitalize">{requiredPlan} Feature</p>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade to {requiredPlan} to unlock this feature.
          </p>
        </div>
        <Button
          onClick={() => checkout(requiredPlan as 'pro' | 'elite')}
          className="rounded-xl"
        >
          Upgrade to {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}
        </Button>
      </CardContent>
    </Card>
  );
}
