import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import TradePlanV2 from './TradePlanV2';

const fake = vi.hoisted(() => ({ account: 'account-a', rows: new Map<string, any>(), writes: [] as any[], fail: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-one' } }) }));
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
const ready = () => waitFor(() => expect(screen.getByPlaceholderText("Describe today's expected scenario...")).toBeInTheDocument());
const switchPair = async (name: string) => { fireEvent.click(screen.getByRole('button', { name, exact: true })); await waitFor(() => expect(screen.getByRole('heading', {name: `Daily Plan — ${name}`})).toBeInTheDocument()); await ready(); };

describe('Daily plan isolation and failure handling', () => {
  it('saves bias and risk with null emotion, isolates EURUSD/XAUUSD and accounts, and keeps full conflict keys', async () => {
    const view = render(<TradePlanV2 />); await ready();
    fireEvent.click(screen.getByRole('button', {name:'Bullish', exact:true}));
    fireEvent.change(screen.getByPlaceholderText('1'), { target: { value: '0.5' } });
    fireEvent.click(screen.getByRole('button', {name:'Save Plan'}));
    await waitFor(() => expect(fake.writes.some(w => w.table === 'trade_plans')).toBe(true));
    const eur = fake.writes.find(w => w.table === 'trade_plans');
    expect(eur.payload).toMatchObject({ user_id:'user-one', account_id:'account-a', account_key:'account-a', pair:'EURUSD', emotion:null, max_risk_per_trade:0.5 });
    expect(eur.options.onConflict).toBe('user_id,account_key,plan_date,pair');
    fireEvent.click(screen.getAllByRole('button', {name:'Check item'})[0]);
    await switchPair('XAUUSD');
    fireEvent.click(screen.getByRole('button', {name:'Bearish', exact:true}));
    fireEvent.click(screen.getByRole('button', {name:'Calm', exact:true}));
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
    fireEvent.change(screen.getByPlaceholderText("Describe today's expected scenario..."), {target:{value:'Retain this scenario'}});
    fake.fail = true; fireEvent.click(screen.getByRole('button', {name:'XAUUSD',exact:true}));
    await waitFor(() => expect(screen.getByText('Not saved')).toBeInTheDocument());
    expect(screen.getByRole('heading', {name:'Daily Plan — EURUSD'})).toBeInTheDocument();
    fake.fail = false; await switchPair('XAUUSD');
    expect([...fake.rows.values()].find(r => r.table === 'trade_plans')?.ai_analysis.daily_v2.scenario).toBe('Retain this scenario');
  });
});
