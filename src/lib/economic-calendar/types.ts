// Economic Calendar shared types

export type ImpactLevel = "low" | "medium" | "high";

export type EventCategory =
  | "Inflation"
  | "Interest Rates"
  | "Employment"
  | "GDP"
  | "Manufacturing"
  | "Consumer Confidence"
  | "Trade"
  | "Retail"
  | "Housing"
  | "Central Bank"
  | "Other";

export interface EconomicEvent {
  id: string;
  event_time: string;         // ISO timestamptz
  country: string;            // ISO-2, e.g. "US"
  currency: string;           // e.g. "USD"
  title: string;
  category: string | null;
  impact: ImpactLevel;
  forecast: string | null;
  previous: string | null;
  actual: string | null;
  unit: string | null;
  source: string | null;
  description: string | null;
  volatility_score: number | null;
  affected_symbols: string[] | null;
  external_id: string | null;
  source_provider: string | null;
}

export type RangePreset = "today" | "tomorrow" | "this_week" | "next_week" | "this_month" | "next_month";
export type RangeMode = "day" | "week" | "month" | "custom";

/** Serializable date range. `preset` stays relative to "now" (so a saved "This Week" always means the current week). */
export interface DateRangeSpec {
  mode: RangeMode;
  preset?: RangePreset;
  anchor?: string; // YYYY-MM-DD for day/week/month navigation
  from?: string;   // YYYY-MM-DD for custom
  to?: string;
}

/** Empty array = "All". */
export interface EventFilters {
  range: DateRangeSpec;
  currencies: string[];
  impacts: ImpactLevel[];
  categories: string[];
  countries: string[];
  search: string;
}

export type CalendarViewMode = "list" | "calendar" | "timeline";
