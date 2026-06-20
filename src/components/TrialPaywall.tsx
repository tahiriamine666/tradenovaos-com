import { Lock, Sparkles, Crown, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/hooks/usePlan";

export default function TrialPaywall() {
  const { signOut } = useAuth() as any;
  const { trialEndsAt } = usePlan();

  const expiredOn = trialEndsAt
    ? trialEndsAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-card border border-border rounded-3xl p-8 md:p-12 shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
              Your free trial has ended
            </h1>
            <p className="text-muted-foreground max-w-md">
              {expiredOn
                ? `Your 7-day Pro trial ended on ${expiredOn}. Pick a plan to keep your data, analytics, and AI coach.`
                : "Your 7-day Pro trial has ended. Pick a plan to keep your data, analytics, and AI coach."}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full pt-2">
            <div className="rounded-2xl border border-border p-4 text-left">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">Pro</span>
              </div>
              <p className="text-xs text-muted-foreground">Unlimited trades, AI insights, full analytics.</p>
            </div>
            <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 text-left">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-4 h-4 text-primary" />
                <span className="font-semibold text-foreground">Elite</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-primary font-bold">Best</span>
              </div>
              <p className="text-xs text-muted-foreground">Replay studio, priority support, API access.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
            <Button asChild className="flex-1" size="lg">
              <Link to="/pricing">
                <Sparkles className="w-4 h-4 mr-2" />
                View Plans
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => signOut?.()}
              className="flex-1"
            >
              Sign out
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-2">
            Already paid? <Link to="/billing/success" className="text-primary hover:underline">Refresh your plan</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
