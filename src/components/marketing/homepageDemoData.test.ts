import { describe, expect, it } from 'vitest';
import { demoAccounts, demoEquity, demoMetrics, demoTrades } from './homepageDemoData';
describe('isolated homepage demo consistency', () => {
  it('derives displayed results from all 12 illustrative trades', () => {
    expect(demoMetrics.netPnl).toBe(1480);
    expect(demoMetrics.totalTrades).toBe(12);
    expect(demoMetrics.winRate).toBeCloseTo(66.6667, 3);
    expect(demoMetrics.averageRR).toBeCloseTo(2.2);
  });
  it('plots every execution including losses and a below-zero start', () => {
    expect(demoEquity).toHaveLength(13);
    expect(demoEquity[1].pnl).toBe(-180);
    demoTrades.forEach((trade, index) => expect(demoEquity[index + 1].pnl - demoEquity[index].pnl).toBe(trade.pnl));
    expect(demoEquity.at(-1)?.pnl).toBe(demoMetrics.netPnl);
  });
  it('reconciles account changes to demo results', () => {
    expect(demoAccounts.reduce((sum, account) => sum + account.pnl, 0)).toBe(demoMetrics.netPnl);
  });
});
