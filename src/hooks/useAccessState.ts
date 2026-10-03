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

  const refresh = useCallback(async () => {
    if (!user) { setState(null); setLoading(false); return null; }
    const { data, error } = await (supabase.rpc as any)("get_access_state");
    if (error) console.warn("get_access_state failed", error);
    const s = (data ?? null) as AccessState | null;
    setState(s);
    setLoading(false);
    return s;
  }, [user]);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    refresh();
  }, [authLoading, refresh]);

  return { state, loading: loading || authLoading, refresh };
}
