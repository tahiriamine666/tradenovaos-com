import { useState } from "react";
import { TradingViewChart } from "@/components/replay/TradingViewChart";
import { cn } from "@/lib/utils";

const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "NAS100"];

function pickDefault(currency?: string | null): string {
  switch ((currency ?? "").toUpperCase()) {
    case "EUR": return "EURUSD";
    case "GBP": return "GBPUSD";
    case "JPY": return "USDJPY";
    case "XAU": return "XAUUSD";
    case "USD": default: return "EURUSD";
  }
}

export function SymbolChart({ currency, height = 360 }: { currency?: string | null; height?: number }) {
  const [symbol, setSymbol] = useState<string>(pickDefault(currency));
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {SYMBOLS.map((s) => (
          <button
            key={s}
            onClick={() => setSymbol(s)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              symbol === s
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >{s}</button>
        ))}
      </div>
      <TradingViewChart symbol={symbol} height={height} />
    </div>
  );
}
