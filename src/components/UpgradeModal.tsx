import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Short feature title shown at the top. */
  feature: string;
  /** One-sentence description of what the feature does. */
  description: string;
  /** 2-4 short bullets explaining value. */
  benefits?: string[];
  /** Which plan unlocks the feature. Defaults to Pro. */
  requiredPlan?: "pro" | "elite";
}

const PLAN_LABEL = { pro: "Pro", elite: "Elite" } as const;

/**
 * Single canonical upgrade modal. Used by every ProGate click. Keep
 * copy short, transparent, no aggressive scarcity. Routes to /app
 * pricing on CTA.
 */
export function UpgradeModal({
  open,
  onOpenChange,
  feature,
  description,
  benefits,
  requiredPlan = "pro",
}: UpgradeModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-3 flex items-center gap-2">
            <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
              <Sparkles className="mr-1 h-3 w-3" />
              {PLAN_LABEL[requiredPlan]} feature
            </Badge>
          </div>
          <DialogTitle className="font-heading text-xl">{feature}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {benefits && benefits.length > 0 && (
          <ul className="space-y-2 py-2">
            {benefits.map((b, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-success" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              navigate("/app?view=pricing");
            }}
          >
            Upgrade to {PLAN_LABEL[requiredPlan]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
