import { addDays, addMonths, addWeeks, endOfDay, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, isSameWeek, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import type { DateRangeSpec, EventFilters, RangeMode, RangePreset } from "./types";

const WK = { weekStartsOn: 1 as const };
export const toKey = (d: Date) => format(d, "yyyy-MM-dd");
export const fromKey = (k: string) => { const [y, m, d] = k.split("-").map(Number); return new Date(y, m - 1, d); };

export const PRESETS: { id: RangePreset; label: string; mode: RangeMode }[] = [
  { id: "today", label: "Today", mode: "day" },
  { id: "tomorrow", label: "Tomorrow", mode: "day" },
  { id: "this_week", label: "This Week", mode: "week" },
  { id: "next_week", label: "Next Week", mode: "week" },
  { id: "this_month", label: "This Month", mode: "month" },
  { id: "next_month", label: "Next Month", mode: "month" },
];

function presetAnchor(p: RangePreset): Date {
  const now = new Date();
  switch (p) {
    case "tomorrow": return addDays(now, 1);
    case "next_week": return addWeeks(now, 1);
    case "next_month": return addMonths(now, 1);
    default: return now;
  }
}

export function resolveRange(r: DateRangeSpec): { from: Date; to: Date } {
  if (r.mode === "custom" && r.from && r.to) return { from: startOfDay(fromKey(r.from)), to: endOfDay(fromKey(r.to)) };
  const a = r.preset ? presetAnchor(r.preset) : r.anchor ? fromKey(r.anchor) : new Date();
  if (r.mode === "day") return { from: startOfDay(a), to: endOfDay(a) };
  if (r.mode === "month") return { from: startOfMonth(a), to: endOfMonth(a) };
  return { from: startOfWeek(a, WK), to: endOfWeek(a, WK) };
}

export function rangeLabel(r: DateRangeSpec): string {
  const { from, to } = resolveRange(r);
  const now = new Date();
  if (r.mode === "custom") return `${format(from, "MMM d")} – ${format(to, "MMM d")}${from.getFullYear() !== to.getFullYear() ? `, ${format(to, "yyyy")}` : ""}`;
  if (r.mode === "day") {
    if (isSameDay(from, now)) return "Today";
    if (isSameDay(from, addDays(now, 1))) return "Tomorrow";
    return format(from, "EEE, MMM d");
  }
  if (r.mode === "week") {
    if (isSameWeek(from, now, WK)) return "This Week";
    if (isSameWeek(from, addWeeks(now, 1), WK)) return "Next Week";
    return `${format(from, "MMM d")} – ${format(to, "MMM d")}`;
  }
  return format(from, "MMMM yyyy");
}

/** Step the range by one unit; custom ranges shift by their own length. */
export function shiftRange(r: DateRangeSpec, dir: 1 | -1): DateRangeSpec {
  const { from, to } = resolveRange(r);
  if (r.mode === "custom") {
    const len = Math.round((startOfDay(to).getTime() - from.getTime()) / 864e5) + 1;
    return { mode: "custom", from: toKey(addDays(from, len * dir)), to: toKey(addDays(startOfDay(to), len * dir)) };
  }
  const next = r.mode === "day" ? addDays(from, dir) : r.mode === "week" ? addWeeks(from, dir) : addMonths(from, dir);
  return { mode: r.mode, anchor: toKey(next) };
}

export const stepLabel = (m: RangeMode) => (m === "day" ? "Day" : m === "week" ? "Week" : m === "month" ? "Month" : "Period");

export const DEFAULT_FILTERS: EventFilters = {
  range: { mode: "week", preset: "this_week" },
  currencies: [], impacts: [], categories: [], countries: [], search: "",
};

/** Accept anything stored (including the older single-value localStorage shape) and return valid filters. */
export function normalizeFilters(raw: any): EventFilters {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_FILTERS };
  const arr = (v: unknown) => (Array.isArray(v) ? v.filter((x) => typeof x === "string") : []);
  const r = raw.range && typeof raw.range === "object" && ["day", "week", "month", "custom"].includes(raw.range.mode) ? raw.range : DEFAULT_FILTERS.range;
  return {
    range: r,
    currencies: arr(raw.currencies),
    impacts: arr(raw.impacts) as EventFilters["impacts"],
    categories: arr(raw.categories),
    countries: arr(raw.countries),
    search: typeof raw.search === "string" ? raw.search : "",
  };
}

export { isSameMonth };
