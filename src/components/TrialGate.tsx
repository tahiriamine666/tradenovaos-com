import { useEffect, useState } from "react";
import { usePlan } from "@/hooks/usePlan";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import TrialPaywall from "./TrialPaywall";

const ADMIN_EMAILS = ["tahiria740@gmail.com"];

/**
 * Blocks app access when the user's 7-day trial has expired and they have
 * no active paid subscription. Renders the upgrade paywall instead.
 */
export default function TrialGate({ children }: { children: React.ReactNode }) {
  const { loading, status, trialEndsAt, isPro, isElite, plan } = usePlan();
  const { user, loading: authLoading } = useAuth() as any;
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  // Verify admin status against the admin_users table (more robust than email).
  useEffect(() => {
    let cancelled = false;
    if (!user?.id) {
      setIsAdmin(false);
      return;
    }
    // Fast-path email allowlist while DB check resolves.
    if (
      user?.email &&
      ADMIN_EMAILS.includes(String(user.email).toLowerCase())
    ) {
      setIsAdmin(true);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("admin_users")
        .select("id")
        .eq("id", user.id)
        .maybeSingle();
      if (!cancelled) setIsAdmin(!!data);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.email]);

  // Wait for auth + admin check + plan so we don't flash the paywall.
  if (authLoading || loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Admins always bypass the paywall.
  if (isAdmin) return <>{children}</>;

  // Paid users always pass.
  if (status === "active" && (isPro || isElite) && plan !== "free") {
    return <>{children}</>;
  }

  // Trial users with time remaining pass.
  if (status === "trialing" && trialEndsAt && trialEndsAt.getTime() > Date.now()) {
    return <>{children}</>;
  }

  // Everything else (expired trial, inactive, canceled, past_due) → paywall.
  return <TrialPaywall />;
}
