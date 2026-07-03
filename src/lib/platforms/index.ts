import type { PlatformAdapter, PlatformField, PlatformId, TradingAccountRecord } from './types';

const MT5: PlatformAdapter = {
  id: 'mt5', label: 'MetaTrader 5', icon: '📈',
  description: 'Connect any MT5 broker account.',
  fields: [
    { key: 'login',    label: 'Login',    mappedTo: 'account_number', required: true, placeholder: '12345678' },
    { key: 'password', label: 'Password', type: 'password',           required: true, placeholder: 'Investor or master password' },
    { key: 'server',   label: 'Server',   mappedTo: 'server',         required: true, placeholder: 'ICMarkets-Live02' },
  ],
};

const CTRADER: PlatformAdapter = {
  id: 'ctrader', label: 'cTrader', icon: '⚡',
  description: 'Connect a cTrader account via access token.',
  fields: [
    { key: 'account_id',   label: 'Account ID',   mappedTo: 'account_number', required: true },
    { key: 'access_token', label: 'Access Token', type: 'password',           required: true },
    { key: 'broker',       label: 'Broker',       mappedTo: 'broker',         required: true, placeholder: 'IC Markets' },
  ],
};

const DXTRADE: PlatformAdapter = {
  id: 'dxtrade', label: 'DXtrade', icon: '🟣',
  description: 'Connect a DXtrade broker account.',
  fields: [
    { key: 'username', label: 'Username', mappedTo: 'account_number', required: true },
    { key: 'password', label: 'Password', type: 'password',           required: true },
    { key: 'broker',   label: 'Broker',   mappedTo: 'broker',         required: true, placeholder: 'FTMO / MFF / …' },
  ],
};

const TRADELOCKER: PlatformAdapter = {
  id: 'tradelocker', label: 'TradeLocker', icon: '🔒',
  description: 'Connect a TradeLocker account.',
  fields: [
    { key: 'account_id',   label: 'Account ID',   mappedTo: 'account_number', required: true },
    { key: 'access_token', label: 'Access Token', type: 'password',           required: true },
    { key: 'server',       label: 'Server',       mappedTo: 'server',         required: true, placeholder: 'live.tradelocker.com' },
  ],
};

const ALPHA: PlatformAdapter = {
  id: 'alpha_trader', label: 'Alpha Trader', icon: '🅰️',
  description: 'Connect an Alpha Trader account.',
  fields: [
    { key: 'username', label: 'Username', mappedTo: 'account_number', required: true },
    { key: 'password', label: 'Password', type: 'password',           required: true },
    { key: 'broker',   label: 'Broker',   mappedTo: 'broker',         required: true },
  ],
};

export const PLATFORMS: PlatformAdapter[] = [MT5, CTRADER, DXTRADE, TRADELOCKER, ALPHA];

export function getPlatform(id: string | null | undefined): PlatformAdapter | undefined {
  return PLATFORMS.find(p => p.id === id);
}

export type FormValues = Record<string, string>;

/** Split form values into DB columns + credentials jsonb according to the adapter. */
export function buildRecord(
  adapter: PlatformAdapter,
  values: FormValues,
): {
  platform: PlatformId;
  account_number: string | null;
  server: string | null;
  broker: string | null;
  login: string | null;
  password: string | null;
  credentials: Record<string, string>;
} {
  const out = {
    platform: adapter.id,
    account_number: null as string | null,
    server: null as string | null,
    broker: null as string | null,
    login: null as string | null,
    password: null as string | null,
    credentials: {} as Record<string, string>,
  };
  for (const f of adapter.fields) {
    const v = (values[f.key] ?? '').toString().trim();
    if (!v) continue;
    if (f.mappedTo === 'account_number') out.account_number = v;
    else if (f.mappedTo === 'server') out.server = v;
    else if (f.mappedTo === 'broker') out.broker = v;
    else out.credentials[f.key] = v;
  }
  // Legacy MT5 compatibility: mirror into login/password columns.
  if (adapter.id === 'mt5') {
    out.login = out.account_number;
    out.password = out.credentials.password ?? null;
  }
  return out;
}

/** Pre-fill form values from a saved account for the edit dialog. */
export function toFormValues(adapter: PlatformAdapter, record: Partial<TradingAccountRecord>): FormValues {
  const v: FormValues = {};
  for (const f of adapter.fields) {
    if (f.mappedTo === 'account_number') v[f.key] = record.account_number ?? record.login ?? '';
    else if (f.mappedTo === 'server') v[f.key] = record.server ?? '';
    else if (f.mappedTo === 'broker') v[f.key] = record.broker ?? '';
    else v[f.key] = String((record.credentials as any)?.[f.key] ?? '');
  }
  return v;
}

export function summarizeAccount(record: Partial<TradingAccountRecord>): string {
  const parts: string[] = [];
  if (record.account_number) parts.push(`#${record.account_number}`);
  if (record.server) parts.push(record.server);
  if (record.broker) parts.push(record.broker);
  return parts.join(' · ');
}

export type { PlatformAdapter, PlatformField, PlatformId, TradingAccountRecord };
