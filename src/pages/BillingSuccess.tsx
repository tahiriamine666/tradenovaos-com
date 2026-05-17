import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { Button } from "@/components/ui/button";

export default function BillingSuccess() {
  const { refresh } = usePlan();

  useEffect(() => {
    // Webhook may take a few seconds. Poll plan info briefly.
    refresh();
    const timers = [1500, 4000, 9000].map((ms) => setTimeout(() => refresh(), ms));
    return () => timers.forEach(clearTimeout);
  }, [refresh]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold font-heading text-foreground">You're all set 🎉</h1>
          <p className="text-sm text-muted-foreground">
            Your subscription is active. It may take a few seconds for premium features to unlock.
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
      </div>
    </div>
  );
}
