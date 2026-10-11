import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({ rows: new Map<string, any>(), delay: new Map<string, Promise<void>>() }));
const authUser = vi.hoisted(() => ({ id: 'u1' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: authUser }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  storage: { from: () => ({ createSignedUrl: async (p: string) => ({ data: { signedUrl: `https://signed/${p}` } }) }) },
  from: (table: string) => {
    const f: Record<string, any> = {};
    const q: any = { select: () => q, eq: (k: string, v: any) => { f[k] = v; return q; }, maybeSingle: () => q,
      then: async (res: any) => {
        if (table === 'trading_accounts') return res({ data: f.user_id === 'u1' ? { account_name: 'FTMO 100k' } : null });
        if (table === 'playbooks') return res({ data: { title: 'London Sweep' } });
        await (fake.delay.get(f.id) ?? Promise.resolve());
        const row = fake.rows.get(f.id); return res({ data: row && row.user_id === f.user_id ? row : null, error: null });
      } };
    return q;
  },
} }));

import { TradeLogDetailModal, tradeLogSections, outcomeLabel } from './TradeLogDetailModal';

const full = { id: 't1', user_id: 'u1', pair: 'EURUSD', side: 'long', outcome: 'loss', result: -25, trade_date: '2026-10-01', session: 'London', rr: 2,
  setup: 'FVG', trading_account_id: 'a1', playbook_id: 'p1', exit_price: 1.09, entry_price: 1.1, entry_reason: 'Sweep', notes: 'n', tags: [],
  screenshot_url: 'u1/after.png', before_screenshot_url: 'u1/before.png', fomo: true, mistakes: ['late'] };
const get = (s: ReturnType<typeof tradeLogSections>, id: string, k: string) => s.find(x => x.id === id)!.rows.find(r => r[0] === k)?.[1];

afterEach(() => { cleanup(); fake.rows.clear(); fake.delay.clear(); });

describe('Trade Logs detail', () => {
  it('maps every field once, with account, playbook and exit price', () => {
    const s = tradeLogSections(full, { accountName: 'FTMO 100k', playbookName: 'London Sweep' });
    expect(get(s, 'overview', 'Account')).toBe('FTMO 100k');
    expect(get(s, 'overview', 'Playbook')).toBe('London Sweep');
    expect(get(s, 'overview', 'P&L')).toBe('-$25.00');
    expect(get(s, 'risk', 'Exit price')).toBe('1.09');
    expect(get(s, 'psychology', 'FOMO')).toBe('Yes');
    expect(get(s, 'risk', 'Stop loss')).toBe('Not recorded');
    const labels = s.flatMap(x => x.rows.map(r => r[0]));
    expect(new Set(labels).size).toBe(labels.length);
  });
  it('derives outcome from result when outcome is missing', () => {
    expect(outcomeLabel({ result: 10 })).toBe('Win');
    expect(outcomeLabel({ result: 0 })).toBe('Breakeven');
    expect(outcomeLabel({})).toBe('Not recorded');
  });
  it('opens centered modal with full record and before/after in correct slots', async () => {
    fake.rows.set('t1', full);
    render(<TradeLogDetailModal tradeId="t1" onClose={() => {}} onEdit={() => {}} />);
    expect(await screen.findByText('EURUSD — LONG')).toBeTruthy();
    expect(screen.getByText('LOSS · -$25.00')).toBeTruthy();
    await waitFor(() => expect(screen.getByText('FTMO 100k')).toBeTruthy());
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Screenshots' }));
    expect((await screen.findByAltText('EURUSD before trade')).getAttribute('src')).toBe('https://signed/u1/before.png');
    expect(screen.getByAltText('EURUSD after trade').getAttribute('src')).toBe('https://signed/u1/after.png');
  });
  it('never shows another user trade and ignores stale results when switching', async () => {
    let release!: () => void;
    fake.delay.set('t1', new Promise<void>(r => { release = r; }));
    fake.rows.set('t1', full); fake.rows.set('t2', { ...full, id: 't2', pair: 'XAUUSD' }); fake.rows.set('t3', { ...full, id: 't3', user_id: 'u2', pair: 'GBPUSD' });
    const { rerender } = render(<TradeLogDetailModal tradeId="t1" onClose={() => {}} onEdit={() => {}} />);
    rerender(<TradeLogDetailModal tradeId="t2" onClose={() => {}} onEdit={() => {}} />);
    expect(await screen.findByText('XAUUSD — LONG')).toBeTruthy();
    release(); await new Promise(r => setTimeout(r, 0));
    expect(screen.queryByText('EURUSD — LONG')).toBeNull();
    rerender(<TradeLogDetailModal tradeId="t3" onClose={() => {}} onEdit={() => {}} />);
    expect(await screen.findByText(/could not be loaded/)).toBeTruthy();
  });
  it('Edit passes the exact loaded trade', async () => {
    fake.rows.set('t1', full); const onEdit = vi.fn();
    render(<TradeLogDetailModal tradeId="t1" onClose={() => {}} onEdit={onEdit} />);
    fireEvent.click(await screen.findByRole('button', { name: /Edit/ }));
    expect(onEdit.mock.calls[0][0].id).toBe('t1');
  });
});
