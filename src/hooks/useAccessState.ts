import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AccessState {
  authenticated: boolean;
  internal: boolean;
  onboarding_step: number;
  onboarding_completed: boolean;
  selected_plan: "pro" | "elite" | null;
  selected_billing: "monthly" | "yearly" | null;
  has_access: boolean;
  billing_status: string | null;
  trial_ends_at: string | null;
}

/** Server-derived access state (get_access_state RPC). Never trust client flags. */
export function useAccessState() {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AccessState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) { setState(null); setLoading(false); setError(null); return null; }
    setError(null);
    try {
    const { data, error } = await (supabase.rpc as any)("get_access_state");
    if (error) throw error;
    const s = (data ?? null) as AccessState | null;
    setState(s);
    setLoading(false);
    return s;
    } catch {
      setError('Access verification is temporarily unavailable.');
      setLoading(false);
      return null;
    }
  }, [user]);

  // Only show the blocking loader for the first check per user; background re-checks keep the page mounted.
  const userId = user?.id;
  useEffect(() => {
    if (authLoading) return;
    setState((prev) => { if (!prev) setLoading(true); return prev; });
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId]);

  return { state, loading: loading || authLoading, error, refresh };
}
