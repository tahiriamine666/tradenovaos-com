import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, RefreshCw, AlertCircle } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function BillingSuccess() {
  const { refresh, isPro, isElite, loading } = usePlan();
  const [phase, setPhase] = useState<"waiting" | "confirmed" | "timeout">("waiting");

  useEffect(() => {
    let cancelled = false;
    let syncCalled = false;
    let attempts = 0;

    const tick = async () => {
      if (cancelled) return;
      attempts++;
      await refresh();

      // After ~6s, if webhook hasn't landed, ask the server to query Paddle
      // directly and sync. Safe to call multiple times; idempotent.
      if (attempts === 3 && !syncCalled) {
        syncCalled = true;
        try {
          await supabase.functions.invoke("paddle-sync-subscription", { method: "POST" });
          await refresh();
        } catch (e) {
          console.warn("paddle-sync-subscription failed", e);
        }
      }
    };

    tick();
    const interval = setInterval(async () => {
      if (cancelled) return;
      await tick();
      if (attempts >= 15) {
        clearInterval(interval);
        setPhase((p) => (p === "confirmed" ? p : "timeout"));
      }
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [refresh]);

  useEffect(() => {
    if (!loading && (isPro || isElite)) setPhase("confirmed");
  }, [isPro, isElite, loading]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        {phase === "waiting" && (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-heading text-foreground">Confirming your subscription…</h1>
              <p className="text-sm text-muted-foreground">
                Payment received. We're unlocking your premium features now.
              </p>
            </div>
          </>
        )}

        {phase === "confirmed" && (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-heading text-foreground">You're all set 🎉</h1>
              <p className="text-sm text-muted-foreground">
                Your {isElite ? "Elite" : "Pro"} plan is active.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button asChild className="rounded-xl">
                <Link to="/app">Continue to dashboard</Link>
              </Button>
              <Button asChild variant="ghost" className="rounded-xl">
                <Link to="/app?tab=settings">Manage billing</Link>
              </Button>
            </div>
          </>
        )}

        {phase === "timeout" && (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-amber-500" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold font-heading text-foreground">Payment received</h1>
              <p className="text-sm text-muted-foreground">
                Your subscription is still finalizing. This can take up to a minute.
                Refresh in a bit, or contact support if your plan hasn't updated within 5 minutes.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => window.location.reload()} className="rounded-xl">
                Refresh now
              </Button>
              <Button asChild variant="ghost" className="rounded-xl">
                <Link to="/app">Go to dashboard</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
