import type { TradeFields } from '@/lib/dataTypes';
type MockResult = { data?: unknown; error?: null };
interface TradeQuery {
 select(): TradeQuery; order(): TradeQuery; eq(k: string, v: string): TradeQuery;
 update(p: TradeFields): TradeQuery; maybeSingle(): TradeQuery;
 then(res: (value: MockResult) => unknown): Promise<unknown>;
}
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fake = vi.hoisted(() => ({ rows: new Map<string, TradeFields>(), updates: [] as { filters: Record<string, string>; patch: TradeFields }[], delay: new Map<string, Promise<void>>() }));
const authUser = vi.hoisted(() => ({ id: 'u1' }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: authUser }) }));
vi.mock('@/contexts/ActiveAccountContext', () => ({ useActiveAccount: () => ({ activeAccountId: 'acc-1' }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  storage: { from: () => ({ createSignedUrl: async (p: string) => ({ data: { signedUrl: `https://signed/${p}` } }), upload: async () => ({ error: null }) }) },
  from: (table: string) => {
    const f: Record<string, string> = {}; let patch: TradeFields | null = null;
    const q: TradeQuery = {
      select: () => q, order: () => q, eq: (k: string, v: string) => { f[k] = v; return q; },
      update: (p: TradeFields) => { patch = p; return q; },
      maybeSingle: () => q,
      then: async (res: (value: MockResult) => unknown) => {
        if (table !== 'trades') return res({ data: [], error: null });
        if (patch) { fake.updates.push({ filters: { ...f }, patch }); return res({ error: null }); }
        await (fake.delay.get(f.id) ?? Promise.resolve());
        const row = fake.rows.get(f.id); return res({ data: row && row.user_id === f.user_id ? row : null, error: null });
      },
    }; return q;
  },
} }));

import { TradeDetailDialog, tradeDetailSections } from './TradeDetailDialog';
import AddTradeModal from '@/components/AddTradeModal';

const complete = {
  id: 't1', user_id: 'u1', pair: 'EURUSD', side: 'long', outcome: 'win', result: 150, trade_date: '2026-10-01', session: 'London', timeframe: 'M15',
  setup: 'FVG', notes: 'Clean', weekly_context: 'Bullish weekly', daily_bias: 'bullish', rr: 2.5, tags: ['a'], trading_account_id: 'acc-1', playbook_id: null,
  entry_price: 1.1, stop_loss: 1.095, take_profit: 1.12, risk_amount: 50, risk_percent: 0.5, entry_reason: 'Sweep', exit_reason: 'TP hit',
  mistakes: ['late'], rule_violations: ['size'], planned_trade: true, checklist_completed: false, late_entry: true, early_exit: false, moved_stop: false,
  emotion_before: 'Calm', emotion_after: 'Focused', confidence_score: 8, discipline_score: 6, execution_score: 10, stress_score: 2, patience_score: 4,
  followed_plan: true, plan_status: 'partial', impulsive_entry: false, fomo: true, revenge_trade: false, hesitation: true, overconfidence: false, psychology_note: 'Stayed patient',
  screenshot_url: 'u1/after.png', before_screenshot_url: 'u1/before.png', is_starred: true, emotion: 'calm',
};
const partialList = (r: TradeFields) => ({ id: r.id, pair: r.pair, side: r.side, result: r.result, rr: r.rr, trade_date: r.trade_date, setup: r.setup, notes: r.notes, outcome: r.outcome, screenshot_url: r.screenshot_url, before_screenshot_url: r.before_screenshot_url, session: r.session, tags: r.tags ?? [], weekly_context: r.weekly_context, daily_bias: r.daily_bias, timeframe: r.timeframe, weekly: '—', daily: '—' });

beforeEach(() => { fake.rows.clear(); fake.updates = []; fake.delay.clear(); fake.rows.set('t1', complete); });
afterEach(cleanup);

describe('tradeDetailSections mapping', () => {
  it('maps every planning, risk, psychology and review field', () => {
    const m = Object.fromEntries(tradeDetailSections(complete).flatMap(s => s.rows));
    expect(m).toMatchObject({ 'Entry price': '1.1', 'Stop loss': '1.095', 'Take profit': '1.12', 'Risk amount': '50', 'Risk %': '0.5', 'R:R': '2.5', 'Entry reason': 'Sweep', 'Exit reason': 'TP hit',
      Mistakes: 'late', 'Rule violations': 'size', 'Planned trade': 'Yes', 'Checklist completed': 'No', 'Late entry': 'Yes', 'Moved stop': 'No', Patience: '4/10', Confidence: '8/10',
      'Followed plan': 'Partially', FOMO: 'Yes', Hesitation: 'Yes', 'Psychology note': 'Stayed patient', Direction: 'Long (buy)', Session: 'London' });
  });
  it('labels absent values Not recorded without inventing data', () => {
    const m = Object.fromEntries(tradeDetailSections({ id: 'x', pair: 'XAUUSD', mistakes: [] }).flatMap(s => s.rows));
    expect(m['Stop loss']).toBe('Not recorded'); expect(m.Mistakes).toBe('Not recorded'); expect(m['Followed plan']).toBe('Not recorded'); expect(m.FOMO).toBe('Not recorded');
  });
});

describe('Trade detail view', () => {
  it('loads the complete row for a partial list object and shows both screenshots by reference', async () => {
    render(<TradeDetailDialog trade={partialList(complete)} open onOpenChange={() => {}} />);
    await waitFor(() => expect(screen.getByText('Sweep')).toBeInTheDocument());
    expect(screen.getByText('TP hit')).toBeInTheDocument();
    expect(screen.getByText('Stayed patient')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByAltText('EURUSD before trade')).toHaveAttribute('src', 'https://signed/u1/before.png'));
    expect(screen.getByAltText('EURUSD after trade')).toHaveAttribute('src', 'https://signed/u1/after.png');
  });
  it('a partial saved trade shows Not recorded', async () => {
    fake.rows.set('t2', { id: 't2', user_id: 'u1', pair: 'GBPUSD', trade_date: '2026-10-02', result: -20, mistakes: [], rule_violations: [], tags: [] });
    render(<TradeDetailDialog trade={partialList(fake.rows.get('t2'))} open onOpenChange={() => {}} />);
    await waitFor(() => expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(10));
  });
  it('switching trade id never shows the previous trade\'s late response', async () => {
    let release!: () => void; fake.delay.set('t1', new Promise(r => { release = r; }));
    fake.rows.set('t3', { ...complete, id: 't3', pair: 'XAUUSD', entry_reason: 'Gold reason' });
    const v = render(<TradeDetailDialog trade={partialList(complete)} open onOpenChange={() => {}} />);
    v.rerender(<TradeDetailDialog trade={partialList(fake.rows.get('t3'))} open onOpenChange={() => {}} />);
    await waitFor(() => expect(screen.getByText('Gold reason')).toBeInTheDocument());
    release(); await new Promise(r => setTimeout(r, 20));
    expect(screen.queryByText('Sweep')).not.toBeInTheDocument();
  });
});

describe('Edit Trade', () => {
  it('prefills from the full row and saving keeps every field (no wipes, no screenshot change)', async () => {
    render(<AddTradeModal open onClose={() => {}} onSaved={() => {}} onGoToPlaybooks={() => {}} editTrade={partialList(complete)} />);
    await waitFor(() => expect(screen.getByDisplayValue('Sweep')).toBeInTheDocument());
    expect(screen.getByDisplayValue('TP hit')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1.095')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Clean'), { target: { value: 'Edited note' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Trade/ }));
    await waitFor(() => expect(fake.updates).toHaveLength(1));
    const { patch, filters } = fake.updates[0];
    expect(filters).toEqual({ id: 't1', user_id: 'u1' });
    expect(patch.notes).toBe('Edited note');
    for (const k of ['entry_price', 'stop_loss', 'take_profit', 'risk_amount', 'risk_percent', 'entry_reason', 'exit_reason', 'mistakes', 'rule_violations', 'planned_trade', 'checklist_completed', 'late_entry', 'early_exit', 'moved_stop', 'emotion_before', 'emotion_after', 'confidence_score', 'discipline_score', 'execution_score', 'stress_score', 'patience_score', 'followed_plan', 'plan_status', 'fomo', 'revenge_trade', 'hesitation', 'overconfidence', 'psychology_note', 'side', 'outcome', 'session', 'timeframe', 'weekly_context', 'rr', 'setup'] as const)
      expect(patch[k], k).toEqual((complete)[k]);
    expect(patch.result).toBe(150);
    for (const k of ['screenshot_url', 'before_screenshot_url', 'trading_account_id', 'tags', 'is_starred', 'emotion']) expect(k in patch, k).toBe(false);
  });
});
