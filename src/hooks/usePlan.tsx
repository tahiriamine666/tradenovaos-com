// src/hooks/usePlan.ts
import {
  useState, useEffect, useCallback,
  createContext, useContext, ReactNode,
} from 'react';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Lock } from 'lucide-react';

export type Plan = 'pro' | 'elite';
export type Status = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'inactive';

export interface PlanState {
  plan: Plan | null;
  status: Status;
  trialEndsAt: Date | null;
  isActive: boolean;
  isTrialing: boolean;
  isPro: boolean;
  isElite: boolean;
  loading: boolean;
}

interface PlanContextValue extends PlanState {
  refresh: () => Promise<void>;
  canAccess: (feature: string) => boolean;
}

const FEATURE_PLANS: Record<string, Plan[]> = {
  csv_import: ['pro', 'elite'],
  ai_insights: ['pro', 'elite'],
  ai_reviews: ['pro', 'elite'],
  playbooks: ['pro', 'elite'],
  trade_plan: ['pro', 'elite'],
  trade_vault: ['pro', 'elite'],
  analytics_advanced: ['pro', 'elite'],
  priority_support: ['elite'],
  ai_unlimited: ['elite'],
  elite_tools: ['elite'],
  api_access: ['elite'],
  trade_plan_customize: ['elite'],
};

const EMPTY: PlanState = {
  plan: null,
  status: 'inactive',
  trialEndsAt: null,
  isActive: false,
  isTrialing: false,
  isPro: false,
  isElite: false,
  loading: true,
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [state, setState] = useState<PlanState>(EMPTY);

  const refresh = useCallback(async () => {
    if (!user) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    setState(s => ({ ...s, loading: true }));

    try {
      const { data: raw, error } = await supabase.rpc('get_user_plan_info');
      if (error || !raw) throw error ?? new Error('Missing subscription state');

      const data = raw as any;
      const plan: Plan | null =
        data.effective_plan === 'elite' ? 'elite' :
        data.effective_plan === 'pro' ? 'pro' : null;
      const status = (data.status ?? 'inactive') as Status;
      const isActive = Boolean(data.is_active && plan);

      setState({
        plan,
        status,
        trialEndsAt: data.trial_ends_at ? new Date(data.trial_ends_at) : null,
        isActive,
        isTrialing: Boolean(data.is_trial),
        isPro: isActive && (plan === 'pro' || plan === 'elite'),
        isElite: isActive && plan === 'elite',
        loading: false,
      });
    } catch (error) {
      console.error('[usePlan] failed to load canonical subscription state', error);
      setState({ ...EMPTY, loading: false });
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const canAccess = useCallback((feature: string): boolean => {
    if (state.loading || !state.isActive || !state.plan) return false;
    const allowed = FEATURE_PLANS[feature];
    return allowed ? allowed.includes(state.plan) : true;
  }, [state]);

  return (
    <PlanContext.Provider value={{ ...state, refresh, canAccess }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const ctx = useContext(PlanContext);
  if (!ctx) throw new Error('usePlan must be inside PlanProvider');
  return ctx;
}

export function PlanGate({ feature, children, fallback, onUpgrade }: {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  onUpgrade?: (plan: Plan) => void;
}) {
  const { canAccess, loading } = usePlan();

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (canAccess(feature)) return <>{children}</>;
  if (fallback) return <>{fallback}</>;

  const req = FEATURE_PLANS[feature]?.[0] ?? 'pro';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <Lock className="w-6 h-6 text-primary" />
      </div>
      <div>
        <p className="font-heading font-bold text-foreground text-lg capitalize">{req} Feature</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs">
          Upgrade to {req} to unlock this.
        </p>
      </div>
      <button
        onClick={() => onUpgrade?.(req)}
        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm hover:opacity-90 transition-opacity"
      >
        Upgrade to {req.charAt(0).toUpperCase() + req.slice(1)}
      </button>
      <p className="text-xs text-muted-foreground">Secure billing powered by Dodo Payments</p>
    </div>
  );
}
