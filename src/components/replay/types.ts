export type Direction = "long" | "short";

export interface Annotation {
  id: string;
  type: "line" | "arrow" | "rect" | "text";
  x1: number; // normalized 0-1
  y1: number;
  x2: number;
  y2: number;
  color?: string;
  text?: string;
}

export interface Execution {
  id: string;
  time: string; // ISO
  direction: Direction;
  action: "entry" | "exit";
  price: number;
  size: number;
  rr: number | null;
  pnl_r: number | null;
  notes?: string;
}

export interface ReplayMeta {
  chart_path?: string | null;
  annotations?: Annotation[];
}

export interface ReplaySession {
  id: string;
  user_id: string;
  title: string | null;
  pair: string | null;
  session_name: string | null;
  timeframe: string | null;
  setup: string | null;
  notes: string | null;
  what_went_well: string | null;
  mistakes: string[];
  tags: string[];
  status: string;
  outcome: string | null;
  result: number | null;
  rr: number | null;
  risk_amount: number | null;
  entry_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  discipline_score: number | null;
  execution_score: number | null;
  trades: ReplayMeta; // we store { chart_path, annotations }
  executions: Execution[];
  ai_review: Record<string, any>;
  replay_date: string;
  created_at: string;
  updated_at: string;
}

export const PAIRS = ["NAS100", "US30", "XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "SP500", "SPY"];
export const TIMEFRAMES = ["1", "5", "15", "30", "60", "240", "D"];
export const SESSIONS = ["London", "New York", "Asia", "London/NY Overlap"];
export const COMMON_MISTAKES = [
  "Early Entry",
  "No Confirmation",
  "FOMO",
  "Moved SL",
  "Oversized",
  "Chased Price",
  "Broke Rules",
  "Early Exit",
  "Revenge Trade",
];
