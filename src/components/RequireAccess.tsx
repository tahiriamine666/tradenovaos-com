import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessState } from "@/hooks/useAccessState";
import { Button } from "@/components/ui/button";

const Spinner = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

/** Centralized gate for the main app: auth → onboarding → plan → billing → access. */
export default function RequireAccess({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { state, loading, error, refresh } = useAccessState();
  if (authLoading || (user && loading)) return <Spinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!state) return <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4" role="alert"><p className="text-muted-foreground">{error || 'Unable to verify access. Please try again.'}</p><Button onClick={() => void refresh()}>Try again</Button></div>;
  if (state.internal || state.has_access) return <>{children}</>;
  if (!state.onboarding_completed) return <Navigate to="/onboarding" replace />;
  // Onboarding done but no active trial/subscription: billing step, or Billing if previously subscribed.
  if (state.billing_status === "past_due" || state.billing_status === "canceled") return <Navigate to="/billing" replace />;
  return <Navigate to="/onboarding?step=plan" replace />;
}
