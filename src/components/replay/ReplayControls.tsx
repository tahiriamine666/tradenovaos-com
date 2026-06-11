import * as React from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Direction, Execution } from "./types";

interface Props {
  onExecute: (e: Omit<Execution, "id" | "time">) => void;
  disabled?: boolean;
}

export function ReplayControls({ onExecute, disabled }: Props) {
  const [direction, setDirection] = React.useState<Direction>("long");
  const [entry, setEntry] = React.useState("");
  const [sl, setSl] = React.useState("");
  const [tp, setTp] = React.useState("");
  const [account, setAccount] = React.useState("10000");
  const [riskPct, setRiskPct] = React.useState("1");

  const e = parseFloat(entry);
  const s = parseFloat(sl);
  const t = parseFloat(tp);
  const acct = parseFloat(account);
  const rp = parseFloat(riskPct);

  const riskDollars = isFinite(acct) && isFinite(rp) ? (acct * rp) / 100 : null;
  const stopDist = isFinite(e) && isFinite(s) ? Math.abs(e - s) : null;
  const size = riskDollars && stopDist ? riskDollars / stopDist : null;
  const rr = isFinite(e) && isFinite(s) && isFinite(t) && stopDist ? Math.abs(t - e) / stopDist : null;

  const valid = isFinite(e) && isFinite(s) && stopDist! > 0;

  const submit = () => {
    if (!valid) return;
    onExecute({
      direction,
      action: "entry",
      price: e,
      size: Math.round((size ?? 0) * 100) / 100,
      rr: rr ? Math.round(rr * 100) / 100 : null,
      pnl_r: null,
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div>
        <Label className="text-xs uppercase tracking-wider text-muted-foreground">Direction</Label>
        <div className="mt-1.5 grid grid-cols-2 gap-1.5">
          <button
            onClick={() => setDirection("long")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              direction === "long"
                ? "border-success bg-success/10 text-success"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowUp className="h-4 w-4" /> Long
          </button>
          <button
            onClick={() => setDirection("short")}
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
              direction === "short"
                ? "border-danger bg-danger/10 text-danger"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            <ArrowDown className="h-4 w-4" /> Short
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Field label="Entry" value={entry} onChange={setEntry} />
        <Field label="Stop" value={sl} onChange={setSl} />
        <Field label="Target" value={tp} onChange={setTp} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Account ($)" value={account} onChange={setAccount} />
        <Field label="Risk (%)" value={riskPct} onChange={setRiskPct} />
      </div>

      <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-muted/30 p-3 text-center tabular-nums">
        <Stat label="Risk" value={riskDollars != null ? `$${riskDollars.toFixed(0)}` : "—"} />
        <Stat label="Size" value={size != null ? size.toFixed(2) : "—"} />
        <Stat
          label="R:R"
          value={rr != null ? `${rr.toFixed(2)}` : "—"}
          tone={rr != null && rr >= 2 ? "success" : rr != null && rr < 1 ? "danger" : "neutral"}
        />
      </div>

      <Button onClick={submit} disabled={!valid || disabled} className="w-full">
        <Plus className="h-4 w-4" />
        Execute {direction === "long" ? "Long" : "Short"}
      </Button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 h-9 tabular-nums"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "danger";
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 font-heading text-sm font-semibold",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </p>
    </div>
  );
}
