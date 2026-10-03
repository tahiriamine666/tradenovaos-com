import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "NAS100"];

const TV_SYMBOL: Record<string, string> = {
  EURUSD: "OANDA:EURUSD",
  GBPUSD: "OANDA:GBPUSD",
  USDJPY: "OANDA:USDJPY",
  XAUUSD: "OANDA:XAUUSD",
  NAS100: "OANDA:NAS100USD",
};

function pickDefault(currency?: string | null): string {
  switch ((currency ?? "").toUpperCase()) {
    case "EUR": return "EURUSD";
    case "GBP": return "GBPUSD";
    case "JPY": return "USDJPY";
    case "XAU": return "XAUUSD";
    case "USD":
    default:
      return "EURUSD";
  }
}

export function SymbolChart({ currency, height = 360 }: { currency?: string | null; height?: number }) {
  const [symbol, setSymbol] = useState<string>(pickDefault(currency));

  const src = useMemo(() => {
    const params = new URLSearchParams({
      symbol: TV_SYMBOL[symbol] ?? TV_SYMBOL.EURUSD,
      interval: "60",
      theme: "dark",
      style: "1",
      locale: "en",
      hide_top_toolbar: "1",
      hide_legend: "0",
      withdateranges: "1",
      saveimage: "0",
      toolbarbg: "#0b0f14",
    });
    return `https://www.tradingview.com/widgetembed/?${params.toString()}`;
  }, [symbol]);

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
          >
            {s}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
        <iframe
          key={symbol}
          title={`${symbol} chart`}
          src={src}
          className="block w-full border-0"
          style={{ height }}
          loading="lazy"
          allowFullScreen
        />
      </div>
    </div>
  );
}
