// In-memory illustrative examples only; never mix with real account records.
export const demoTrades = [
  { id: 1, pair: 'EURUSD', side: 'Long', pnl: -180, rr: 2, date: '05 Oct', setup: 'London pullback', note: 'Entered before confirmation. Review entry timing.' },
  { id: 2, pair: 'GBPUSD', side: 'Short', pnl: 320, rr: 2.4, date: '05 Oct', setup: 'Range rejection', note: 'Waited for the planned level; risk defined before entry.' },
  { id: 3, pair: 'EURUSD', side: 'Long', pnl: 260, rr: 2, date: '06 Oct', setup: 'Structure retest', note: 'Followed checklist and left the stop unchanged.' },
  { id: 4, pair: 'XAUUSD', side: 'Short', pnl: -200, rr: 2.5, date: '06 Oct', setup: 'Range rejection', note: 'Planned loss. No additional position taken.' },
  { id: 5, pair: 'GBPUSD', side: 'Long', pnl: 420, rr: 3, date: '07 Oct', setup: 'London pullback', note: 'Patient entry after the retest.' },
  { id: 6, pair: 'EURUSD', side: 'Short', pnl: 180, rr: 1.8, date: '08 Oct', setup: 'Structure retest', note: 'Exited at the premarked target.' },
  { id: 7, pair: 'XAUUSD', side: 'Long', pnl: -240, rr: 2, date: '08 Oct', setup: 'Breakout retest', note: 'Stop reached. No second position taken.' },
  { id: 8, pair: 'EURUSD', side: 'Long', pnl: 300, rr: 2.5, date: '09 Oct', setup: 'London pullback', note: 'Completed checklist; avoided chasing the first move.' },
  { id: 9, pair: 'GBPUSD', side: 'Short', pnl: 220, rr: 2, date: '12 Oct', setup: 'Range rejection', note: 'Risk stayed within the planned amount.' },
  { id: 10, pair: 'EURUSD', side: 'Short', pnl: -160, rr: 1.8, date: '13 Oct', setup: 'Structure retest', note: 'Entry was valid, outcome was a loss.' },
  { id: 11, pair: 'XAUUSD', side: 'Long', pnl: 280, rr: 2.4, date: '14 Oct', setup: 'Breakout retest', note: 'Waited for confirmation before entering.' },
  { id: 12, pair: 'EURUSD', side: 'Long', pnl: 280, rr: 2, date: '15 Oct', setup: 'London pullback', note: 'Calm execution. Plan followed from entry to exit.' },
] as const;
export const demoMetrics = {
  netPnl: demoTrades.reduce((sum, trade) => sum + trade.pnl, 0),
  winRate: demoTrades.filter(trade => trade.pnl > 0).length / demoTrades.length * 100,
  averageRR: demoTrades.reduce((sum, trade) => sum + trade.rr, 0) / demoTrades.length,
  totalTrades: demoTrades.length,
};
export const demoEquity = [{ trade: 0, pnl: 0 }, ...demoTrades.map((trade, index) => ({
  trade: index + 1, pnl: demoTrades.slice(0, index + 1).reduce((sum, item) => sum + item.pnl, 0),
}))];
export const demoPsychology = [68, 71, 70, 76, 79, 82];
export const demoAccounts = [{ name: 'Demo account · A', opening: 10000, pnl: 980 }, { name: 'Demo account · B', opening: 5000, pnl: 500 }];
export const demoEvents = [
  { time: '08:30', currency: 'GBP', title: 'Consumer Price Index', impact: 'High', forecast: '3.1%', previous: '3.2%' },
  { time: '13:30', currency: 'USD', title: 'Initial Jobless Claims', impact: 'Medium', forecast: '220K', previous: '225K' },
  { time: '15:00', currency: 'EUR', title: 'Consumer Confidence', impact: 'Low', forecast: '−14.0', previous: '−14.5' },
] as const;
export function demoMoney(value: number) {
  return `${value < 0 ? '−' : value > 0 ? '+' : ''}$${Math.abs(value).toLocaleString('en-US')}`;
}
