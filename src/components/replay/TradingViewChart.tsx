import * as React from "react";
import { useTheme } from "next-themes";
import { Maximize2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartConfigDrawer } from "./ChartConfigDrawer";
import { useChartPreferences } from "@/hooks/useChartPreferences";

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

const CHART_TYPE_STYLE: Record<string, string> = {
  candles: "1",
  bars: "0",
  line: "2",
  area: "3",
};

function resolveSymbol(s: string): string {
  if (!s) return "OANDA:NAS100USD";
  if (s.includes(":")) return s;
  return TV_SYMBOL_MAP[s.toUpperCase()] ?? `OANDA:${s.toUpperCase()}`;
}

/**
 * Real TradingView Advanced Chart widget.
 * Theme-synced, supports drawing tools, multi-timeframe, fullscreen.
 * Honors per-user chart preferences (theme, colors, chart type).
 */
export function TradingViewChart({ symbol, interval = "60", height = 520 }: Props) {
  const { resolvedTheme } = useTheme();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const id = React.useId().replace(/:/g, "_");
  const tvId = `tv_chart_${id}`;
  const [configOpen, setConfigOpen] = React.useState(false);
  const { prefs, loading } = useChartPreferences();

  // Active symbol = explicit prop, but allow drawer override via local state
  const [activeSymbol, setActiveSymbol] = React.useState(symbol);
  React.useEffect(() => setActiveSymbol(symbol), [symbol]);

  const tvSymbol = resolveSymbol(activeSymbol);

  const themeMode: "dark" | "light" =
    prefs.preferred_theme === "light"
      ? "light"
      : prefs.preferred_theme === "dark"
        ? "dark"
        : resolvedTheme === "dark"
          ? "dark"
          : "light";
  const isDark = themeMode === "dark";

  React.useEffect(() => {
    if (loading) return;
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = `<div id="${tvId}" style="height:100%;width:100%"></div>`;

    const overrides: Record<string, string | number | boolean> = {
      "mainSeriesProperties.candleStyle.upColor": prefs.bullish_color,
      "mainSeriesProperties.candleStyle.downColor": prefs.bearish_color,
      "mainSeriesProperties.candleStyle.borderUpColor": prefs.border_color,
      "mainSeriesProperties.candleStyle.borderDownColor": prefs.border_color,
      "mainSeriesProperties.candleStyle.wickUpColor": prefs.wick_color,
      "mainSeriesProperties.candleStyle.wickDownColor": prefs.wick_color,
      "mainSeriesProperties.barStyle.upColor": prefs.bullish_color,
      "mainSeriesProperties.barStyle.downColor": prefs.bearish_color,
      "mainSeriesProperties.lineStyle.color": prefs.bullish_color,
      "mainSeriesProperties.areaStyle.color1": prefs.bullish_color,
      "mainSeriesProperties.areaStyle.color2": prefs.bullish_color,
      "paneProperties.background": prefs.background_color,
      "paneProperties.backgroundType": "solid",
      "paneProperties.vertGridProperties.color": prefs.grid_color,
      "paneProperties.horzGridProperties.color": prefs.grid_color,
      "paneProperties.crossHairProperties.color": prefs.crosshair_color,
      "scalesProperties.lineColor": prefs.grid_color,
    };

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
        style: CHART_TYPE_STYLE[prefs.chart_type] ?? "1",
        locale: "en",
        toolbar_bg: prefs.background_color,
        enable_publishing: false,
        withdateranges: true,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        details: true,
        hotlist: false,
        calendar: false,
        studies: [],
        container_id: tvId,
        overrides,
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
  }, [
    tvSymbol,
    interval,
    isDark,
    tvId,
    loading,
    prefs.chart_type,
    prefs.bullish_color,
    prefs.bearish_color,
    prefs.wick_color,
    prefs.border_color,
    prefs.crosshair_color,
    prefs.background_color,
    prefs.grid_color,
  ]);

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
          onClick={() => setConfigOpen(true)}
          title="Chart settings"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
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

      <ChartConfigDrawer
        open={configOpen}
        onOpenChange={setConfigOpen}
        currentSymbol={activeSymbol}
        currentInterval={interval}
        onSymbolChange={setActiveSymbol}
      />
    </div>
  );
}
