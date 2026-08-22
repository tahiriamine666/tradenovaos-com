// Broker / prop-firm registry, MT server suggestions and challenge rule presets.

export type AccountType = 'broker' | 'prop_firm';
export type MtPlatform = 'mt5' | 'mt4';

export interface ProviderDef {
  id: string;
  name: string;
  type: AccountType;
  /** Server name suggestions shown in the smart server picker. */
  servers: string[];
  /** Extra search keywords. */
  aliases?: string[];
}

const b = (id: string, name: string, servers: string[], aliases?: string[]): ProviderDef =>
  ({ id, name, type: 'broker', servers, aliases });
const p = (id: string, name: string, servers: string[], aliases?: string[]): ProviderDef =>
  ({ id, name, type: 'prop_firm', servers, aliases });

export const BROKERS: ProviderDef[] = [
  b('icmarkets', 'IC Markets', ['ICMarketsSC-MT5', 'ICMarketsSC-MT5-2', 'ICMarketsSC-Demo', 'ICMarkets-Live01', 'ICMarkets-Live02', 'ICMarkets-Demo']),
  b('pepperstone', 'Pepperstone', ['Pepperstone-Edge01', 'Pepperstone-Edge02', 'Pepperstone-Live', 'Pepperstone-Demo']),
  b('eightcap', 'Eightcap', ['Eightcap-Live', 'Eightcap-Live 2', 'Eightcap-Demo']),
  b('exness', 'Exness', ['Exness-MT5Real', 'Exness-MT5Real2', 'Exness-MT5Trial', 'Exness-Real', 'Exness-Trial']),
  b('fusion', 'Fusion Markets', ['FusionMarkets-Live', 'FusionMarkets-Live2', 'FusionMarkets-Demo']),
  b('blackbull', 'BlackBull Markets', ['BlackBull-Live', 'BlackBull-Live2', 'BlackBull-Demo']),
  b('oanda', 'OANDA', ['OANDA-Live-1', 'OANDA-Live-2', 'OANDA-Demo-1']),
];

export const PROP_FIRMS: ProviderDef[] = [
  p('ftmo', 'FTMO', ['FTMO-Server', 'FTMO-Server2', 'FTMO-Server3', 'FTMO-Demo']),
  p('alphacapital', 'Alpha Capital Group', ['AlphaCapital-Live', 'AlphaCapitalGroup-Server', 'AlphaCapital-Demo'], ['alpha']),
  p('goatfunded', 'Goat Funded Trader', ['GoatFunded-Server1', 'GoatFunded-Server2', 'GoatFunded-Live', 'GoatFunded-Demo'], ['goat']),
  p('fundingpips', 'Funding Pips', ['FundingPips-Server', 'FundingPips-Live', 'FundingPips-Demo']),
  p('fundednext', 'FundedNext', ['FundedNext-Server', 'FundedNext-Live', 'FundedNext-Demo']),
  p('the5ers', 'The5ers', ['The5ers-Live', 'The5ers-Server', 'The5ers-Demo'], ['5ers']),
  p('e8', 'E8 Markets', ['E8Markets-Live', 'E8-Server', 'E8Markets-Demo'], ['e8']),
  p('myfundedfx', 'MyFundedFX', ['MyFundedFX-Live', 'MyFundedFX-Server', 'MyFundedFX-Demo']),
  p('topstep', 'Topstep', ['Topstep-Live', 'Topstep-Demo']),
  p('apex', 'Apex Trader Funding', ['Apex-Live', 'Apex-Demo'], ['apex trader']),
  p('elitetrader', 'Elite Trader Funding', ['EliteTrader-Live', 'EliteTrader-Demo']),
  p('takeprofit', 'Take Profit Trader', ['TakeProfit-Live', 'TakeProfit-Demo']),
  p('tradeify', 'Tradeify', ['Tradeify-Live', 'Tradeify-Demo']),
  p('bulenox', 'Bulenox', ['Bulenox-Live', 'Bulenox-Demo']),
];

export const ALL_PROVIDERS = [...BROKERS, ...PROP_FIRMS];

export function providersFor(type: AccountType): ProviderDef[] {
  return type === 'broker' ? BROKERS : PROP_FIRMS;
}

export function findProvider(name: string | null | undefined): ProviderDef | undefined {
  if (!name) return undefined;
  const n = name.toLowerCase().trim();
  return ALL_PROVIDERS.find(x => x.name.toLowerCase() === n || x.id === n);
}

/** Smart server suggestions: match against the chosen provider first, then everything. */
export function suggestServers(query: string, provider?: ProviderDef | null): string[] {
  const q = query.toLowerCase().replace(/[\s_-]/g, '');
  const score = (s: string) => (s.toLowerCase().replace(/[\s_-]/g, '').includes(q) ? 1 : 0);
  const pool = provider ? provider.servers : [];
  const rest = ALL_PROVIDERS.flatMap(pr =>
    (!provider || pr.id !== provider.id)
      ? (score(pr.name) || pr.aliases?.some(a => a.replace(/\s/g, '').includes(q)) ? pr.servers : pr.servers.filter(score))
      : [],
  );
  const matched = q ? [...pool.filter(score), ...rest] : pool;
  return Array.from(new Set(matched.length ? matched : pool)).slice(0, 8);
}

/** Challenge rule presets, applied by prop firm + detected account size. */
export interface ChallengeRules {
  firm: string;
  accountSize: number;
  phase: string;
  dailyDrawdownPct: number;
  maxDrawdownPct: number;
  profitTargetPct: number;
}

const FIRM_RULES: Record<string, { daily: number; max: number; target: number }> = {
  ftmo:          { daily: 5,  max: 10, target: 10 },
  alphacapital:  { daily: 5,  max: 10, target: 8 },
  goatfunded:    { daily: 5,  max: 10, target: 8 },
  fundingpips:   { daily: 5,  max: 10, target: 8 },
  fundednext:    { daily: 5,  max: 10, target: 8 },
  the5ers:       { daily: 4,  max: 6,  target: 6 },
  e8:            { daily: 5,  max: 8,  target: 8 },
  myfundedfx:    { daily: 5,  max: 12, target: 8 },
  topstep:       { daily: 3,  max: 4,  target: 6 },
  apex:          { daily: 3,  max: 5,  target: 6 },
  elitetrader:   { daily: 3,  max: 5,  target: 6 },
  takeprofit:    { daily: 4,  max: 5,  target: 6 },
  tradeify:      { daily: 4,  max: 6,  target: 8 },
  bulenox:       { daily: 4,  max: 5,  target: 6 },
};

const SIZES = [5000, 10000, 25000, 50000, 100000, 200000, 250000, 300000, 400000, 500000];

export function detectAccountSize(balance: number | null | undefined): number | null {
  if (!balance || balance <= 0) return null;
  let best = SIZES[0], diff = Infinity;
  for (const s of SIZES) {
    const d = Math.abs(s - balance) / s;
    if (d < diff) { diff = d; best = s; }
  }
  return diff <= 0.25 ? best : Math.round(balance / 1000) * 1000;
}

export function resolveChallengeRules(
  firmName: string | null | undefined,
  balance: number | null | undefined,
): ChallengeRules | null {
  const prov = findProvider(firmName);
  if (!prov || prov.type !== 'prop_firm') return null;
  const rules = FIRM_RULES[prov.id];
  const size = detectAccountSize(balance);
  if (!rules || !size) return null;
  return {
    firm: prov.name,
    accountSize: size,
    phase: 'Phase 1',
    dailyDrawdownPct: rules.daily,
    maxDrawdownPct: rules.max,
    profitTargetPct: rules.target,
  };
}

export function formatAccountSize(n: number): string {
  return n >= 1000 ? `${Math.round(n / 1000)}K` : `${n}`;
}
