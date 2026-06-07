import * as React from "react";
import { Lock } from "lucide-react";
import { usePlan } from "@/hooks/usePlan";
import { UpgradeModal, type UpgradeModalProps } from "@/components/UpgradeModal";
import { cn } from "@/lib/utils";

interface ProGateProps {
  /** Required plan to access this feature. */
  requiredPlan?: "pro" | "elite";
  /** Feature metadata shown in the upgrade modal when clicked. */
  feature: Omit<UpgradeModalProps, "open" | "onOpenChange" | "requiredPlan">;
  /** Render prop receives `locked` so the child can disable inputs / hide actions. */
  children: (args: { locked: boolean; openUpgrade: () => void }) => React.ReactNode;
  /** Position of the PRO chip overlay. */
  badgePosition?: "top-right" | "inline" | "none";
  className?: string;
}

/**
 * Wraps any Pro-only feature. On free plans: visible but interaction
 * intercepted; click anywhere inside opens the upgrade modal. On Pro/
 * Elite: passes through with `locked=false`.
 *
 * Usage:
 *   <ProGate feature={{ feature: "AI Coach", description: "..." }}>
 *     {({ locked, openUpgrade }) => (
 *       <Button disabled={locked} onClick={locked ? openUpgrade : doThing}>
 *         Ask AI
 *       </Button>
 *     )}
 *   </ProGate>
 */
export function ProGate({
  requiredPlan = "pro",
  feature,
  children,
  badgePosition = "top-right",
  className,
}: ProGateProps) {
  const plan = usePlan();
  const [open, setOpen] = React.useState(false);

  const hasAccess =
    requiredPlan === "elite" ? plan?.isElite : plan?.isPro || plan?.isElite;
  const locked = !hasAccess;

  const openUpgrade = React.useCallback(() => setOpen(true), []);

  return (
    <>
      <div
        className={cn("relative", locked && "select-none", className)}
        onClickCapture={(e) => {
          if (!locked) return;
          // Allow the inner render-prop's own onClick to be the upgrade trigger
          // by checking if it's already wired; otherwise intercept here.
          const target = e.target as HTMLElement;
          if (target.closest("[data-pro-trigger]")) return;
          e.preventDefault();
          e.stopPropagation();
          openUpgrade();
        }}
      >
        {locked && badgePosition === "top-right" && (
          <span className="pointer-events-none absolute -top-2 -right-2 z-10 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Lock className="h-2.5 w-2.5" />
            Pro
          </span>
        )}
        {children({ locked, openUpgrade })}
      </div>

      <UpgradeModal
        open={open}
        onOpenChange={setOpen}
        requiredPlan={requiredPlan}
        {...feature}
      />
    </>
  );
}
