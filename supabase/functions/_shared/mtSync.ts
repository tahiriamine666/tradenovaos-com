// Pull live account state + trade history from MetaApi into the database.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { accountInformation, getAccount, deployAccount, historyDeals, positions } from './metaapi.ts';

export function admin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
}

const FIRM_RULES: Record<string, { daily: number; max: number; target: number }> = {
  'ftmo': { daily: 5, max: 10, target: 10 },
  'alpha capital group': { daily: 5, max: 10, target: 8 },
  'goat funded trader': { daily: 5, max: 10, target: 8 },
  'funding pips': { daily: 5, max: 10, target: 8 },
  'fundednext': { daily: 5, max: 10, target: 8 },
  'the5ers': { daily: 4, max: 6, target: 6 },
  'e8 markets': { daily: 5, max: 8, target: 8 },
  'myfundedfx': { daily: 5, max: 12, target: 8 },
  'topstep': { daily: 3, max: 4, target: 6 },
  'apex trader funding': { daily: 3, max: 5, target: 6 },
  'elite trader funding': { daily: 3, max: 5, target: 6 },
  'take profit trader': { daily: 4, max: 5, target: 6 },
  'tradeify': { daily: 4, max: 6, target: 8 },
  'bulenox': { daily: 4, max: 5, target: 6 },
};

const SIZES = [5000, 10000, 25000, 50000, 100000, 200000, 250000, 300000, 400000, 500000];

function detectSize(balance: number): number | null {
  if (!balance || balance <= 0) return null;
  let best = SIZES[0], diff = Infinity;
  for (const s of SIZES) {
    const d = Math.abs(s - balance) / s;
    if (d < diff) { diff = d; best = s; }
  }
  return diff <= 0.25 ? best : Math.round(balance / 1000) * 1000;
}

function challengeFor(firm: string | null, balance: number, initial: number | null) {
  if (!firm) return {};
  const rules = FIRM_RULES[firm.toLowerCase().trim()];
  const size = detectSize(initial ?? balance);
  if (!rules || !size) return {};
  const profitPct = ((balance - size) / size) * 100;
  return {
    firm,
    account_size: size,
    phase: profitPct >= rules.target ? 'Target reached' : 'Phase 1',
    daily_drawdown_pct: rules.daily,
    max_drawdown_pct: rules.max,
    profit_target_pct: rules.target,
    profit_pct: Number(profitPct.toFixed(2)),
    progress_pct: Number(Math.max(0, Math.min(100, (profitPct / rules.target) * 100)).toFixed(1)),
  };
}

interface AccountRow {
  id: string;
  user_id: string;
  account_name: string;
  firm: string | null;
  broker: string | null;
  account_type: string;
  metaapi_account_id: string | null;
  initial_balance: number | null;
  credentials: Record<string, unknown> | null;
}

export async function syncAccount(row: AccountRow) {
  const db = admin();
  const metaId = row.metaapi_account_id;
  if (!metaId) throw new Error('Account is not linked to MetaApi yet');

  const meta = await getAccount(metaId);
  const region: string = meta.region ?? 'new-york';
  if (meta.state !== 'DEPLOYED') {
    await deployAccount(metaId).catch(() => {});
  }
  if (meta.connectionStatus !== 'CONNECTED' && meta.state !== 'DEPLOYED') {
    await db.from('trading_accounts').update({
      status: 'syncing', sync_error: null,
    }).eq('id', row.id);
    return { status: 'syncing' as const, message: 'Account is deploying, this can take a minute.' };
  }

  const info = await accountInformation(metaId, region);
  const open = await positions(metaId, region).catch(() => []);

  const to = new Date();
  const from = new Date(to.getTime() - 365 * 24 * 3600 * 1000);
  const deals: any[] = await historyDeals(metaId, region, from.toISOString(), to.toISOString()).catch(() => []);

  const closing = (deals ?? []).filter(d =>
    (d.entryType === 'DEAL_ENTRY_OUT' || d.entryType === 'DEAL_ENTRY_OUT_BY') && d.symbol);

  const tradeRows = closing.map(d => {
    const net = Number(d.profit ?? 0) + Number(d.swap ?? 0) + Number(d.commission ?? 0);
    return {
      user_id: row.user_id,
      trading_account_id: row.id,
      external_id: String(d.id),
      pair: String(d.symbol),
      side: d.type === 'DEAL_TYPE_SELL' ? 'buy' : 'sell', // closing deal is opposite of position side
      result: Number(net.toFixed(2)),
      outcome: net > 0 ? 'win' : net < 0 ? 'loss' : 'breakeven',
      trade_date: String(d.time).slice(0, 10),
      exit_price: d.price ?? null,
      quantity: d.volume ?? null,
      notes: null,
    };
  });

  let imported = 0;
  for (let i = 0; i < tradeRows.length; i += 200) {
    const chunk = tradeRows.slice(i, i + 200);
    const { error } = await db.from('trades')
      .upsert(chunk, { onConflict: 'trading_account_id,external_id', ignoreDuplicates: true });
    if (!error) imported += chunk.length;
  }

  // Metrics
  const wins = tradeRows.filter(t => (t.result ?? 0) > 0);
  const losses = tradeRows.filter(t => (t.result ?? 0) < 0);
  const grossWin = wins.reduce((s, t) => s + (t.result ?? 0), 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + (t.result ?? 0), 0));
  const today = new Date().toISOString().slice(0, 10);
  const dailyPnl = tradeRows.filter(t => t.trade_date === today).reduce((s, t) => s + (t.result ?? 0), 0);

  // Equity curve peak -> drawdown
  let peak = 0, running = 0, maxDd = 0;
  for (const t of [...tradeRows].sort((a, b) => a.trade_date.localeCompare(b.trade_date))) {
    running += t.result ?? 0;
    peak = Math.max(peak, running);
    maxDd = Math.max(maxDd, peak - running);
  }

  const symbols = Array.from(new Set(tradeRows.map(t => t.pair))).slice(0, 20);
  const balance = Number(info.balance ?? 0);
  const equity = Number(info.equity ?? balance);
  const initial = row.initial_balance ?? (balance - tradeRows.reduce((s, t) => s + (t.result ?? 0), 0));

  const metrics = {
    trades: tradeRows.length,
    open_trades: Array.isArray(open) ? open.length : 0,
    win_rate: tradeRows.length ? Number(((wins.length / tradeRows.length) * 100).toFixed(1)) : 0,
    profit_factor: grossLoss ? Number((grossWin / grossLoss).toFixed(2)) : (grossWin ? 99 : 0),
    max_drawdown: Number(maxDd.toFixed(2)),
    daily_pnl: Number(dailyPnl.toFixed(2)),
    net_pnl: Number((grossWin - grossLoss).toFixed(2)),
    symbols,
    leverage: info.leverage ?? null,
    broker_name: info.broker ?? null,
  };

  const firm = row.account_type === 'prop_firm' ? (row.firm ?? row.broker) : null;

  await db.from('trading_accounts').update({
    status: 'connected',
    sync_error: null,
    balance,
    equity,
    margin: info.margin ?? null,
    free_margin: info.freeMargin ?? null,
    currency: info.currency ?? null,
    initial_balance: row.initial_balance ?? Number(initial.toFixed(2)),
    broker: row.broker ?? info.broker ?? null,
    metrics,
    challenge: challengeFor(firm, balance, row.initial_balance ?? initial),
    last_connected_at: new Date().toISOString(),
    last_synced_at: new Date().toISOString(),
  }).eq('id', row.id);

  return { status: 'connected' as const, imported, metrics, balance, equity };
}
