import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Star,
  Clock,
  Palette,
  Layers,
  Settings2,
  Play,
  PenTool,
  Plus,
  Copy,
  Trash2,
  RotateCcw,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useChartPreferences,
  type ChartPreferences,
  type ChartType,
  type ChartTheme,
  type SavedLayout,
  DEFAULT_PREFS,
} from "@/hooks/useChartPreferences";
import { toast } from "@/hooks/use-toast";

const POPULAR_SYMBOLS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "XAUUSD",
  "NAS100",
  "US30",
  "SP500",
  "SPY",
  "BTCUSD",
  "ETHUSD",
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentSymbol?: string;
  currentInterval?: string;
  onSymbolChange?: (symbol: string) => void;
}

export function ChartConfigDrawer({
  open,
  onOpenChange,
  currentSymbol,
  currentInterval,
  onSymbolChange,
}: Props) {
  const { prefs, save, addRecentSymbol } = useChartPreferences();
  const [symbolQuery, setSymbolQuery] = React.useState("");

  const filteredSymbols = React.useMemo(() => {
    const q = symbolQuery.trim().toUpperCase();
    if (!q) return POPULAR_SYMBOLS;
    return Array.from(new Set([q, ...POPULAR_SYMBOLS.filter((s) => s.includes(q))]));
  }, [symbolQuery]);

  const pickSymbol = (symbol: string) => {
    onSymbolChange?.(symbol);
    addRecentSymbol(symbol);
    save({ preferred_symbol: symbol });
    toast({ title: "Symbol changed", description: symbol });
  };

  const toggleFavorite = (symbol: string) => {
    const has = prefs.favorite_symbols.includes(symbol);
    const next = has
      ? prefs.favorite_symbols.filter((s) => s !== symbol)
      : [...prefs.favorite_symbols, symbol];
    save({ favorite_symbols: next });
  };

  const saveLayout = () => {
    const name = window.prompt("Layout name (e.g. ICT, SMC, Scalping):")?.trim();
    if (!name) return;
    const layout: SavedLayout = {
      id: Math.random().toString(36).slice(2, 10),
      name,
      symbol: currentSymbol ?? prefs.preferred_symbol,
      interval: currentInterval ?? "60",
      chart_type: prefs.chart_type,
      bullish_color: prefs.bullish_color,
      bearish_color: prefs.bearish_color,
      background_color: prefs.background_color,
      grid_color: prefs.grid_color,
      created_at: new Date().toISOString(),
    };
    save({ saved_layouts: [...prefs.saved_layouts, layout], active_layout_id: layout.id });
    toast({ title: "Layout saved", description: name });
  };

  const loadLayout = (l: SavedLayout) => {
    save({
      active_layout_id: l.id,
      chart_type: l.chart_type,
      bullish_color: l.bullish_color,
      bearish_color: l.bearish_color,
      background_color: l.background_color,
      grid_color: l.grid_color,
      preferred_symbol: l.symbol,
    });
    onSymbolChange?.(l.symbol);
    toast({ title: "Layout loaded", description: l.name });
  };

  const duplicateLayout = (l: SavedLayout) => {
    const copy: SavedLayout = {
      ...l,
      id: Math.random().toString(36).slice(2, 10),
      name: `${l.name} (copy)`,
      created_at: new Date().toISOString(),
    };
    save({ saved_layouts: [...prefs.saved_layouts, copy] });
  };

  const deleteLayout = (id: string) => {
    save({
      saved_layouts: prefs.saved_layouts.filter((l) => l.id !== id),
      active_layout_id: prefs.active_layout_id === id ? null : prefs.active_layout_id,
    });
  };

  const resetLayout = () => {
    save({
      chart_type: DEFAULT_PREFS.chart_type,
      bullish_color: DEFAULT_PREFS.bullish_color,
      bearish_color: DEFAULT_PREFS.bearish_color,
      wick_color: DEFAULT_PREFS.wick_color,
      border_color: DEFAULT_PREFS.border_color,
      crosshair_color: DEFAULT_PREFS.crosshair_color,
      background_color: DEFAULT_PREFS.background_color,
      grid_color: DEFAULT_PREFS.grid_color,
      drawing_color: DEFAULT_PREFS.drawing_color,
      preferred_theme: DEFAULT_PREFS.preferred_theme,
      active_layout_id: null,
    });
    toast({ title: "Layout reset" });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-[440px]"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Chart Configuration
          </SheetTitle>
          <SheetDescription>
            Tune your trading desk — preferences sync to your account.
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="symbol" className="mt-4">
          <TabsList className="grid w-full grid-cols-5 h-9">
            <TabsTrigger value="symbol" className="px-1.5 text-[11px]">
              Symbol
            </TabsTrigger>
            <TabsTrigger value="appearance" className="px-1.5 text-[11px]">
              Style
            </TabsTrigger>
            <TabsTrigger value="layouts" className="px-1.5 text-[11px]">
              Layouts
            </TabsTrigger>
            <TabsTrigger value="replay" className="px-1.5 text-[11px]">
              Replay
            </TabsTrigger>
            <TabsTrigger value="drawing" className="px-1.5 text-[11px]">
              Drawing
            </TabsTrigger>
          </TabsList>

          {/* SYMBOL */}
          <TabsContent value="symbol" className="space-y-4 pt-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={symbolQuery}
                onChange={(e) => setSymbolQuery(e.target.value)}
                placeholder="Search symbol (EURUSD, NAS100…)"
                className="pl-9"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && symbolQuery.trim()) {
                    pickSymbol(symbolQuery.trim().toUpperCase());
                    setSymbolQuery("");
                  }
                }}
              />
            </div>

            {prefs.favorite_symbols.length > 0 && (
              <Section icon={Star} title="Favorites">
                <SymbolChips
                  symbols={prefs.favorite_symbols}
                  active={currentSymbol}
                  favorites={prefs.favorite_symbols}
                  onPick={pickSymbol}
                  onFav={toggleFavorite}
                />
              </Section>
            )}

            {prefs.recent_symbols.length > 0 && (
              <Section icon={Clock} title="Recent">
                <SymbolChips
                  symbols={prefs.recent_symbols}
                  active={currentSymbol}
                  favorites={prefs.favorite_symbols}
                  onPick={pickSymbol}
                  onFav={toggleFavorite}
                />
              </Section>
            )}

            <Section icon={Search} title="Popular">
              <SymbolChips
                symbols={filteredSymbols}
                active={currentSymbol}
                favorites={prefs.favorite_symbols}
                onPick={pickSymbol}
                onFav={toggleFavorite}
              />
            </Section>
          </TabsContent>

          {/* APPEARANCE */}
          <TabsContent value="appearance" className="space-y-5 pt-4">
            <Section icon={Palette} title="Theme">
              <div className="grid grid-cols-3 gap-2">
                {(["dark", "light", "custom"] as ChartTheme[]).map((t) => (
                  <ChoiceButton
                    key={t}
                    active={prefs.preferred_theme === t}
                    onClick={() => save({ preferred_theme: t })}
                    label={t.charAt(0).toUpperCase() + t.slice(1)}
                  />
                ))}
              </div>
            </Section>

            <Section icon={Layers} title="Chart Type">
              <div className="grid grid-cols-4 gap-2">
                {(["candles", "bars", "line", "area"] as ChartType[]).map((t) => (
                  <ChoiceButton
                    key={t}
                    active={prefs.chart_type === t}
                    onClick={() => save({ chart_type: t })}
                    label={t.charAt(0).toUpperCase() + t.slice(1)}
                  />
                ))}
              </div>
            </Section>

            <Section icon={Palette} title="Colors">
              <div className="grid grid-cols-2 gap-3">
                <ColorField
                  label="Bullish"
                  value={prefs.bullish_color}
                  onChange={(v) => save({ bullish_color: v })}
                />
                <ColorField
                  label="Bearish"
                  value={prefs.bearish_color}
                  onChange={(v) => save({ bearish_color: v })}
                />
                <ColorField
                  label="Wick"
                  value={prefs.wick_color}
                  onChange={(v) => save({ wick_color: v })}
                />
                <ColorField
                  label="Border"
                  value={prefs.border_color}
                  onChange={(v) => save({ border_color: v })}
                />
                <ColorField
                  label="Crosshair"
                  value={prefs.crosshair_color}
                  onChange={(v) => save({ crosshair_color: v })}
                />
                <ColorField
                  label="Background"
                  value={prefs.background_color}
                  onChange={(v) => save({ background_color: v })}
                />
                <ColorField
                  label="Grid"
                  value={prefs.grid_color}
                  onChange={(v) => save({ grid_color: v })}
                />
                <ColorField
                  label="Drawing"
                  value={prefs.drawing_color}
                  onChange={(v) => save({ drawing_color: v })}
                />
              </div>
            </Section>
          </TabsContent>

          {/* LAYOUTS */}
          <TabsContent value="layouts" className="space-y-4 pt-4">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={saveLayout}>
                <Plus className="h-3.5 w-3.5" />
                Save Layout
              </Button>
              <Button size="sm" variant="outline" onClick={resetLayout}>
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>

            {prefs.saved_layouts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
                No saved layouts yet. Save your current setup as ICT, SMC, Scalping, or Swing.
              </div>
            ) : (
              <div className="space-y-2">
                {prefs.saved_layouts.map((l) => (
                  <div
                    key={l.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg border bg-card/40 p-3",
                      prefs.active_layout_id === l.id
                        ? "border-primary/60 bg-primary/5"
                        : "border-border",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                        {prefs.active_layout_id === l.id && (
                          <Check className="h-3 w-3 text-primary" />
                        )}
                        {l.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {l.symbol} • {l.interval}m • {l.chart_type}
                      </div>
                    </div>
                    <div className="flex gap-0.5">
                      <IconBtn title="Load" onClick={() => loadLayout(l)}>
                        <Play className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn title="Duplicate" onClick={() => duplicateLayout(l)}>
                        <Copy className="h-3.5 w-3.5" />
                      </IconBtn>
                      <IconBtn
                        title="Delete"
                        onClick={() => deleteLayout(l.id)}
                        danger
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconBtn>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* REPLAY */}
          <TabsContent value="replay" className="space-y-5 pt-4">
            <Section icon={Play} title="Default Replay Speed">
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 5, 10, 20].map((s) => (
                  <ChoiceButton
                    key={s}
                    active={prefs.default_speed === s}
                    onClick={() => save({ default_speed: s })}
                    label={`${s}x`}
                  />
                ))}
              </div>
            </Section>

            <Section icon={Settings2} title="Display">
              <ToggleRow
                label="Show execution markers"
                checked={prefs.show_execution_markers}
                onChange={(v) => save({ show_execution_markers: v })}
              />
              <ToggleRow
                label="Show trade zones"
                checked={prefs.show_trade_zones}
                onChange={(v) => save({ show_trade_zones: v })}
              />
              <ToggleRow
                label="Show economic events"
                checked={prefs.show_economic_events}
                onChange={(v) => save({ show_economic_events: v })}
              />
              <ToggleRow
                label="Auto-center chart"
                checked={prefs.auto_center_chart}
                onChange={(v) => save({ auto_center_chart: v })}
              />
            </Section>
          </TabsContent>

          {/* DRAWING */}
          <TabsContent value="drawing" className="space-y-5 pt-4">
            <Section icon={PenTool} title="Tools">
              <ToggleRow
                label="Trendlines"
                checked={!!prefs.drawing_prefs.trendlines}
                onChange={(v) =>
                  save({ drawing_prefs: { ...prefs.drawing_prefs, trendlines: v } })
                }
              />
              <ToggleRow
                label="Horizontal lines"
                checked={!!prefs.drawing_prefs.horizontal_lines}
                onChange={(v) =>
                  save({ drawing_prefs: { ...prefs.drawing_prefs, horizontal_lines: v } })
                }
              />
              <ToggleRow
                label="FVG boxes"
                checked={!!prefs.drawing_prefs.fvg_boxes}
                onChange={(v) =>
                  save({ drawing_prefs: { ...prefs.drawing_prefs, fvg_boxes: v } })
                }
              />
              <ToggleRow
                label="Order blocks"
                checked={!!prefs.drawing_prefs.order_blocks}
                onChange={(v) =>
                  save({ drawing_prefs: { ...prefs.drawing_prefs, order_blocks: v } })
                }
              />
              <ToggleRow
                label="Text notes"
                checked={!!prefs.drawing_prefs.text_notes}
                onChange={(v) =>
                  save({ drawing_prefs: { ...prefs.drawing_prefs, text_notes: v } })
                }
              />
            </Section>

            <Section icon={Palette} title="Drawing Style">
              <ColorField
                label="Default color"
                value={prefs.drawing_prefs.line_color ?? prefs.drawing_color}
                onChange={(v) =>
                  save({ drawing_prefs: { ...prefs.drawing_prefs, line_color: v } })
                }
              />
              <div className="mt-3 space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Thickness: {prefs.drawing_prefs.line_thickness ?? 2}px
                </Label>
                <input
                  type="range"
                  min={1}
                  max={6}
                  value={prefs.drawing_prefs.line_thickness ?? 2}
                  onChange={(e) =>
                    save({
                      drawing_prefs: {
                        ...prefs.drawing_prefs,
                        line_thickness: Number(e.target.value),
                      },
                    })
                  }
                  className="w-full accent-primary"
                />
              </div>
            </Section>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {title}
      </div>
      {children}
    </div>
  );
}

function SymbolChips({
  symbols,
  active,
  favorites,
  onPick,
  onFav,
}: {
  symbols: string[];
  active?: string;
  favorites: string[];
  onPick: (s: string) => void;
  onFav: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {symbols.map((s) => {
        const isActive = active?.toUpperCase() === s.toUpperCase();
        const isFav = favorites.includes(s);
        return (
          <div
            key={s}
            className={cn(
              "group flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition",
              isActive
                ? "border-primary bg-primary/10 text-primary"
                : "border-border hover:border-primary/40 hover:bg-accent",
            )}
          >
            <button onClick={() => onPick(s)} className="font-medium">
              {s}
            </button>
            <button
              onClick={() => onFav(s)}
              className={cn(
                "opacity-50 transition hover:opacity-100",
                isFav && "text-amber-500 opacity-100",
              )}
              aria-label="Favorite"
            >
              <Star className={cn("h-3 w-3", isFav && "fill-current")} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ChoiceButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md border px-2 py-1.5 text-xs font-medium transition",
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent text-xs font-mono outline-none"
        />
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "rounded-md p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground",
        danger && "hover:bg-red-500/10 hover:text-red-500",
      )}
    >
      {children}
    </button>
  );
}
