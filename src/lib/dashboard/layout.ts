export type WidgetId = "kpis" | "equity" | "today" | "trader" | "psych" | "recent" | "setups";

export const WIDGETS: { id: WidgetId; label: string; core: boolean; span: string }[] = [
  { id: "kpis", label: "KPI Cards", core: true, span: "lg:col-span-6" },
  { id: "equity", label: "Equity Curve", core: true, span: "lg:col-span-4" },
  { id: "today", label: "Today Focus", core: false, span: "lg:col-span-2" },
  { id: "trader", label: "Trader Score", core: false, span: "lg:col-span-3" },
  { id: "psych", label: "Psychology", core: false, span: "lg:col-span-3" },
  { id: "recent", label: "Recent Trades", core: false, span: "lg:col-span-3" },
  { id: "setups", label: "Best Setups", core: false, span: "lg:col-span-3" },
];

export interface DashboardLayout { order: WidgetId[]; hidden: WidgetId[] }

export const DEFAULT_LAYOUT: DashboardLayout = { order: WIDGETS.map((w) => w.id), hidden: [] };

const IDS = new Set<string>(WIDGETS.map((w) => w.id));
const CORE = new Set<string>(WIDGETS.filter((w) => w.core).map((w) => w.id));

/** Validate a stored layout; unknown ids dropped, missing ids appended, core never hidden. */
export function normalizeLayout(raw: unknown): DashboardLayout {
  const r = (raw ?? {}) as { order?: unknown; hidden?: unknown };
  const order: WidgetId[] = [];
  if (Array.isArray(r.order)) for (const id of r.order) if (typeof id === "string" && IDS.has(id) && !order.includes(id as WidgetId)) order.push(id as WidgetId);
  for (const w of WIDGETS) if (!order.includes(w.id)) order.push(w.id);
  const hidden = Array.isArray(r.hidden)
    ? (r.hidden.filter((id) => typeof id === "string" && IDS.has(id) && !CORE.has(id)) as WidgetId[])
    : [];
  return { order, hidden: [...new Set(hidden)] };
}

export function moveWidget(order: WidgetId[], from: WidgetId, to: WidgetId): WidgetId[] {
  const a = order.filter((x) => x !== from);
  const i = a.indexOf(to);
  const src = order.indexOf(from), dst = order.indexOf(to);
  a.splice(src < dst ? i + 1 : i, 0, from);
  return a;
}
