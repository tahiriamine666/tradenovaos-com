// Platform adapter architecture for trading account integrations.
// Add a new platform = add one file in this folder + register it in ./index.ts.

export type PlatformId = 'mt5' | 'ctrader' | 'dxtrade' | 'tradelocker' | 'alpha_trader';

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
  status: 'connected' | 'syncing' | 'disconnected' | 'error';
  is_default: boolean;
  last_connected_at: string | null;
  created_at: string;
  updated_at: string;
}
