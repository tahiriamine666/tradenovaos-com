// Platform adapter architecture for trading account integrations.
// Add a new platform = add one file in this folder + register it in ./index.ts.

export type PlatformId = 'mt5' | 'mt4' | 'ctrader' | 'dxtrade' | 'tradelocker' | 'alpha_trader';

export interface PlatformField {
  key: string;                       // stored in credentials, unless mappedTo is set
  label: string;
  type?: 'text' | 'password';
  placeholder?: string;
  required?: boolean;
  /** If set, this field maps to a top-level column instead of credentials jsonb. */
  mappedTo?: 'account_number' | 'server' | 'broker';
}

export interface PlatformAdapter {
  id: PlatformId;
  label: string;
  icon: string;              // emoji or short glyph
  description: string;
  /** All fields shown in the Add/Edit dialog, in order. */
  fields: PlatformField[];
}

export interface TradingAccountRecord {
  id: string;
  user_id: string;
  platform: PlatformId;
  account_name: string;
  account_number: string | null;
  server: string | null;
  broker: string | null;
  login: string | null;
  password: string | null;
  credentials: Record<string, unknown>;
  status: 'pending' | 'connecting' | 'connected' | 'disconnected' | 'error';
  is_default: boolean;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
  account_type?: 'broker' | 'prop_firm';
  firm?: string | null;
  metaapi_account_id?: string | null;
  currency?: string | null;
  balance?: number | null;
  equity?: number | null;
  margin?: number | null;
  free_margin?: number | null;
  initial_balance?: number | null;
  metrics?: Record<string, unknown> | null;
  challenge?: Record<string, unknown> | null;
  sync_error?: string | null;
  last_synced_at?: string | null;
}
