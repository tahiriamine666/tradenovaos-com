export type WidgetId = "pnl" | "winrate" | "rr" | "trades" | "equity" | "today" | "trader" | "psych" | "recent" | "setups" | "account" | "calendar";

export const WIDGETS: { id: WidgetId; label: string; span: string }[] = [
  { id: "account", label: "Account Balances", span: "col-span-2 lg:col-span-12" },
  { id: "pnl", label: "Total P&L", span: "lg:col-span-3" },
  { id: "winrate", label: "Win Rate", span: "lg:col-span-3" },
  { id: "rr", label: "Avg R:R", span: "lg:col-span-3" },
  { id: "trades", label: "Trades", span: "lg:col-span-3" },
  { id: "equity", label: "Equity Curve", span: "col-span-2 lg:col-span-8" },
  { id: "today", label: "Today Focus", span: "col-span-2 lg:col-span-4" },
  { id: "trader", label: "Trader Score", span: "col-span-2 lg:col-span-6" },
  { id: "psych", label: "Psychology", span: "col-span-2 lg:col-span-6" },
  { id: "recent", label: "Recent Trades", span: "col-span-2 lg:col-span-6" },
  { id: "setups", label: "Best Setups", span: "col-span-2 lg:col-span-6" },
  { id: "calendar", label: "Trading Calendar", span: "col-span-2 lg:col-span-12" },
];

export interface DashboardLayout { order: WidgetId[]; hidden: WidgetId[] }

export const DEFAULT_LAYOUT: DashboardLayout = { order: WIDGETS.map((w) => w.id), hidden: [] };

const IDS = new Set<string>(WIDGETS.map((w) => w.id));

/** Validate stored preferences; expand the earlier grouped KPI id without losing order. */
export function normalizeLayout(raw: unknown): DashboardLayout {
  const r = (raw ?? {}) as { order?: unknown; hidden?: unknown };
  const order: WidgetId[] = [];
  if (Array.isArray(r.order)) for (const value of r.order) {
    for (const id of value === "kpis" ? ["pnl", "winrate", "rr", "trades"] : [value]) {
      if (typeof id === "string" && IDS.has(id) && !order.includes(id as WidgetId)) order.push(id as WidgetId);
    }
  }
  for (const w of WIDGETS) if (!order.includes(w.id)) order.push(w.id);
  const hidden = Array.isArray(r.hidden)
    ? (r.hidden.filter((id) => typeof id === "string" && IDS.has(id)) as WidgetId[])
    : [];
  return { order, hidden: [...new Set(hidden)] };
}

export function moveWidget(order: WidgetId[], from: WidgetId, to: WidgetId): WidgetId[] {
  if (from === to || !order.includes(from) || !order.includes(to)) return [...order];
  const a = order.filter((x) => x !== from);
  const i = a.indexOf(to);
  const src = order.indexOf(from), dst = order.indexOf(to);
  a.splice(src < dst ? i + 1 : i, 0, from);
  return a;
}
