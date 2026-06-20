import * as React from "react";
import { useTheme } from "next-themes";
import { Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  symbol: string;
  interval?: string;
  height?: number | string;
}

const TV_SYMBOL_MAP: Record<string, string> = {
  NAS100: "OANDA:NAS100USD",
  US30: "OANDA:US30USD",
  SP500: "OANDA:SPX500USD",
  SPY: "AMEX:SPY",
  XAUUSD: "OANDA:XAUUSD",
  EURUSD: "OANDA:EURUSD",
  GBPUSD: "OANDA:GBPUSD",
  USDJPY: "OANDA:USDJPY",
  BTCUSD: "BITSTAMP:BTCUSD",
  ETHUSD: "BITSTAMP:ETHUSD",
};

function resolveSymbol(s: string): string {
  if (!s) return "OANDA:NAS100USD";
  if (s.includes(":")) return s;
  return TV_SYMBOL_MAP[s.toUpperCase()] ?? `OANDA:${s.toUpperCase()}`;
}

/**
 * Real TradingView Advanced Chart widget.
 * Theme-synced, supports drawing tools, multi-timeframe, fullscreen.
 */
export function TradingViewChart({ symbol, interval = "60", height = 520 }: Props) {
  const { resolvedTheme } = useTheme();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId().replace(/:/g, "_");
  const tvId = `tv_chart_${id}`;
  const tvSymbol = resolveSymbol(symbol);
  const isDark = resolvedTheme === "dark";

  React.useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = `<div id="${tvId}" style="height:100%;width:100%"></div>`;

    const init = () => {
      // @ts-expect-error TradingView is loaded from external script
      if (!window.TradingView) return;
      // @ts-expect-error global widget constructor
      new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval,
        timezone: "Etc/UTC",
        theme: isDark ? "dark" : "light",
        style: "1",
        locale: "en",
        toolbar_bg: isDark ? "#0b0f17" : "#ffffff",
        enable_publishing: false,
        withdateranges: true,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        details: true,
        hotlist: false,
        calendar: false,
        studies: [],
        container_id: tvId,
      });
    };

    // @ts-expect-error TradingView is loaded from external script
    if (window.TradingView) {
      init();
    } else {
      const s = document.createElement("script");
      s.src = "https://s3.tradingview.com/tv.js";
      s.async = true;
      s.onload = init;
      document.head.appendChild(s);
    }

    return () => {
      container.innerHTML = "";
    };
  }, [tvSymbol, interval, isDark, tvId]);

  const enterFullscreen = () => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else el.requestFullscreen?.();
  };

  return (
    <div className="relative h-full w-full overflow-hidden rounded-xl border border-border bg-card">
      <div className="absolute right-2 top-2 z-10 flex gap-1">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 bg-background/70 backdrop-blur"
          onClick={enterFullscreen}
          title="Fullscreen"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div ref={containerRef} style={{ height, width: "100%" }} />
    </div>
  );
}
