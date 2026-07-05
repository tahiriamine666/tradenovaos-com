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

export interface EventFilters {
  from: Date;
  to: Date;
  country: string | "all";
  currency: string | "all";
  impact: ImpactLevel | "all";
  category: string | "all";
  search: string;
}

export type CalendarViewMode = "list" | "calendar" | "timeline";
