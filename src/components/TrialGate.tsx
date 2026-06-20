import { usePlan } from "@/hooks/usePlan";
import { useAuth } from "@/contexts/AuthContext";
import TrialPaywall from "./TrialPaywall";

const ADMIN_EMAILS = ["tahiria740@gmail.com"];

/**
 * Blocks app access when the user's 7-day trial has expired and they have
 * no active paid subscription. Renders the upgrade paywall instead.
 */
export default function TrialGate({ children }: { children: React.ReactNode }) {
  const { loading, status, trialEndsAt, isPro, isElite, plan } = usePlan();
  const { user } = useAuth() as any;

  // Admins always bypass the paywall.
  if (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
