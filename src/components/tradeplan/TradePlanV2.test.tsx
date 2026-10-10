import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import TradePlanV2 from './TradePlanV2';

const fake = vi.hoisted(() => ({ user: { id: 'user-one' }, account: 'account-a', rows: new Map<string, any>(), writes: [] as any[], fail: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: fake.user }) }));
vi.mock('@/contexts/ActiveAccountContext', () => ({ useActiveAccount: () => ({ activeAccountId: fake.account, activeAccount: { account_name: fake.account } }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: (table: string) => {
  const filters: Record<string, any> = {};
  let many = true;
  const query: any = {
    select: () => query, eq: (k: string, v: any) => { filters[k] = v; return query; },
    order: () => query, limit: () => query,
    maybeSingle: () => { many = false; return query; },
    then: (resolve: any, reject: any) => {
      const matches = [...fake.rows.values()].filter(r => r.table === table && Object.entries(filters).every(([k,v]) => r[k] === v));
      return Promise.resolve({ data: many ? matches : matches[0] ?? null, error: null }).then(resolve, reject);
    },
    upsert: async (payload: any, options: any) => {
      fake.writes.push({ table, payload: structuredClone(payload), options });
      if (fake.fail) return { error: { message: 'Simulated offline save' } };
      const key = [table, payload.user_id, payload.account_key, payload.plan_date ?? payload.period_date, payload.pair, payload.checklist_type ?? ''].join('|');
      fake.rows.set(key, { ...structuredClone(payload), table });
      return { error: null };
    },
  }; return query;
} } }));
beforeEach(() => { fake.account = 'account-a'; fake.rows.clear(); fake.writes = []; fake.fail = false; localStorage.clear(); });
afterEach(() => { cleanup(); });
const ready = () => waitFor(() => expect(screen.getByPlaceholderText('Write your daily scenario...')).toBeInTheDocument());
const switchPair = async (name: string) => { fireEvent.click(screen.getByRole('button', { name })); await waitFor(() => expect(screen.getByRole('heading', {name: `Daily Plan — ${name}`})).toBeInTheDocument()); await ready(); };

describe('Daily plan isolation and failure handling', () => {
  it('saves bias and risk with null emotion, isolates EURUSD/XAUUSD and accounts, and keeps full conflict keys', async () => {
    const view = render(<TradePlanV2 />); await ready();
    fireEvent.click(screen.getByRole('button', {name:'Bullish'}));
    fireEvent.change(screen.getByPlaceholderText('1'), { target: { value: '0.5' } });
    fireEvent.click(screen.getByRole('button', {name:'Save Plan'}));
    await waitFor(() => expect(fake.writes.some(w => w.table === 'trade_plans')).toBe(true));
    const eur = fake.writes.find(w => w.table === 'trade_plans');
    expect(eur.payload).toMatchObject({ user_id:'user-one', account_id:'account-a', account_key:'account-a', pair:'EURUSD', emotion:null, max_risk_per_trade:0.5 });
    expect(eur.options.onConflict).toBe('user_id,account_key,plan_date,pair');
    fireEvent.click(screen.getAllByRole('button', {name:'Check item'})[0]);
    await switchPair('XAUUSD');
    fireEvent.click(screen.getByRole('button', {name:'Bearish'}));
    fireEvent.click(screen.getByRole('button', {name:'Calm'}));
    fireEvent.click(screen.getByRole('button', {name:'Save Plan'}));
    await waitFor(() => expect(fake.writes.some(w => w.payload.pair === 'XAUUSD' && w.payload.emotion === 'calm')).toBe(true));
    expect(screen.queryAllByRole('button', {name:'Uncheck item'})).toHaveLength(0);
    await switchPair('EURUSD');
    await waitFor(() => expect(screen.getAllByRole('button', {name:'Uncheck item'})).toHaveLength(1));
    expect(screen.getByPlaceholderText('1')).toHaveValue('0.5');
    fake.account = 'account-b'; view.rerender(<TradePlanV2 />); await ready();
    await waitFor(() => expect(screen.getByPlaceholderText('1')).toHaveValue(''));
    expect([...fake.rows.values()].filter(r => r.table === 'trade_plans')).toHaveLength(2);
  });
  it('blocks pair switches on failed save and retries the same dirty snapshot', async () => {
    render(<TradePlanV2 />); await ready();
    fireEvent.change(screen.getByPlaceholderText('Write your daily scenario...'), {target:{value:'Retain this scenario'}});
    fake.fail = true; fireEvent.click(screen.getByRole('button', {name:'XAUUSD'}));
    await waitFor(() => expect(screen.getByText('Not saved')).toBeInTheDocument());
    expect(screen.getByRole('heading', {name:'Daily Plan — EURUSD'})).toBeInTheDocument();
    fake.fail = false; await switchPair('XAUUSD');
    expect([...fake.rows.values()].find(r => r.table === 'trade_plans')?.ai_analysis.daily_v2.scenario).toBe('Retain this scenario');
  });
  it('carries daily rules over: prefills a new day from the saved set and syncs edits to it', async () => {
    const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    fake.rows.set('daily_plan_rules|user-one', { table: 'daily_plan_rules', user_id: 'user-one', rules: [{ id: 'r1', text: 'No revenge trading' }, { id: 'r2', text: 'Max 2 trades per day' }] });
    render(<TradePlanV2 />); await ready();
    expect(screen.getByDisplayValue('No revenge trading')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Max 2 trades per day')).toBeInTheDocument();
    // Editing a rule's text persists the new default set (without per-day checked state)
    fireEvent.change(screen.getByDisplayValue('Max 2 trades per day'), { target: { value: 'Max 3 trades per day' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Plan' }));
    await waitFor(() => expect(fake.writes.some(w => w.table === 'daily_plan_rules')).toBe(true));
    const savedDefaults = fake.writes.find(w => w.table === 'daily_plan_rules')!;
    expect(savedDefaults.payload).toMatchObject({ user_id: 'user-one' });
    expect(savedDefaults.payload.rules).toEqual([{ id: 'r1', text: 'No revenge trading' }, { id: 'r2', text: 'Max 3 trades per day' }]);
    // Checking/unchecking a rule is day-only: it saves the day but never rewrites the default set
    fireEvent.click(screen.getAllByRole('button', { name: 'Check item' })[0]);
    await waitFor(() => expect(fake.writes.some(w => w.table === 'trade_plans' && w.payload.ai_analysis.daily_v2.rules.some((r: any) => r.text === 'No revenge trading' && r.done))).toBe(true));
    expect(fake.writes.filter(w => w.table === 'daily_plan_rules')).toHaveLength(1);
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('keeps a saved day with its own rules intact instead of overwriting them with defaults', async () => {
    const d = new Date();
    const t = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    fake.rows.set('daily_plan_rules|user-one', { table: 'daily_plan_rules', user_id: 'user-one', rules: [{ id: 'r1', text: 'Default rule' }] });
    fake.rows.set(`trade_plans|user-one|account-a|${t}|EURUSD|`, { table: 'trade_plans', user_id: 'user-one', account_key: 'account-a', plan_date: t, pair: 'EURUSD', ai_analysis: { daily_v2: { bias: 'Bullish', rules: [{ id: 'x1', text: 'Old saved rule', done: true }] } } });
    render(<TradePlanV2 />); await ready();
    expect(screen.getByDisplayValue('Old saved rule')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Default rule')).not.toBeInTheDocument();
  });
});
