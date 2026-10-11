import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import TradePlanV2, { normalizePair, normalizeLayoutOrder, FULL_LAYOUT_DEFAULT, DAILY_LAYOUT_DEFAULT, WEEKLY_LAYOUT_DEFAULT } from './TradePlanV2';

const fake = vi.hoisted(() => ({ user: { id: 'user-one' }, account: 'account-a', rows: new Map<string, any>(), writes: [] as any[], fail: false }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: fake.user }) }));
vi.mock('@/contexts/ActiveAccountContext', () => ({ useActiveAccount: () => ({ activeAccountId: fake.account, activeAccount: { account_name: fake.account } }) }));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { storage: { from: () => ({ createSignedUrl: async (p: string) => ({ data: { signedUrl: `https://signed/${p}` }, error: null }) }) }, from: (table: string) => {
  const filters: Record<string, any> = {};
  let many = true; let del = false;
  const query: any = {
    delete: () => { del = true; return query; },
    select: () => query, eq: (k: string, v: any) => { filters[k] = v; return query; },
    order: () => query, limit: () => query,
    maybeSingle: () => { many = false; return query; },
    then: (resolve: any, reject: any) => {
      const matches = [...fake.rows.values()].filter(r => r.table === table && Object.entries(filters).every(([k,v]) => r[k] === v));
      if (del) { for (const [k, r] of [...fake.rows.entries()]) if (matches.includes(r)) fake.rows.delete(k); fake.writes.push({ table, deleted: { ...filters } }); return Promise.resolve({ error: null }).then(resolve, reject); }
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

describe('Editable field layout', () => {
  it('normalizes a saved order: drops unknown ids, dedupes and appends missing defaults', () => {
    expect(normalizeLayoutOrder(['risk', 'nope', 'bias_price', 'risk', 'scenario'], DAILY_LAYOUT_DEFAULT))
      .toEqual(['risk', 'bias_price', 'scenario', 'charts', 'news', 'psychology', 'rules', 'main_idea']);
    expect(normalizeLayoutOrder(null, WEEKLY_LAYOUT_DEFAULT)).toEqual(WEEKLY_LAYOUT_DEFAULT);
    expect(normalizeLayoutOrder([99, { bad: true }], WEEKLY_LAYOUT_DEFAULT)).toEqual(WEEKLY_LAYOUT_DEFAULT);
  });
  it('applies the saved per-user layout to every pair and saves it to workspace_layouts', async () => {
    const order = ['risk', 'bias_price', 'scenario', 'charts', 'news', 'psychology', 'rules', 'main_idea'];
    fake.rows.set('workspace_layouts|user-one', { table: 'workspace_layouts', user_id: 'user-one', page: 'daily_plan', layout: { order } });
    render(<TradePlanV2 />); await ready();
    const checkOrder = () => {
      const risk = screen.getByText('Risk Management');
      const bias = screen.getByText('Market Bias');
      expect(risk.compareDocumentPosition(bias) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    };
    await waitFor(checkOrder);
    await switchPair('XAUUSD');
    await waitFor(checkOrder);
    // Edit Layout saves explicitly to workspace_layouts (keyed user_id + page), never autosaved
    fireEvent.click(screen.getByRole('button', { name: 'Edit Layout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Layout' }));
    await waitFor(() => expect(fake.writes.some(w => w.table === 'workspace_layouts')).toBe(true));
    const saved = fake.writes.find(w => w.table === 'workspace_layouts')!;
    expect(saved.payload).toMatchObject({ user_id: 'user-one', page: 'daily_plan' });
    expect(saved.payload.layout.order).toEqual(order);
  });
});

describe('Weekly Outlook pair scoping', () => {
  const wk = () => { const d = new Date(); const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const area = () => screen.getByPlaceholderText('Write your weekly scenario...') as HTMLTextAreaElement;
  const openWeekly = async () => { const btn = await screen.findByRole('button', { name: 'Weekly Outlook' }); if (btn.getAttribute('aria-pressed') !== 'true') fireEvent.click(btn); await waitFor(() => area()); };
  const toPair = async (name: string) => { fireEvent.click(screen.getByRole('button', { name })); await waitFor(() => expect(screen.getByRole('heading', { name: `Daily Plan — ${name}` })).toBeInTheDocument()); await waitFor(() => area()); };
  const weeklyRows = () => [...fake.rows.values()].filter(r => r.table === 'trade_plan_checklists' && r.checklist_type === 'weekly_outlook');
  const seed = (account: string, pair: string, period: string, data: any) => fake.rows.set(`trade_plan_checklists|user-one|${account}|${period}|${pair}|weekly_outlook`, { table: 'trade_plan_checklists', user_id: 'user-one', account_key: account, pair, checklist_type: 'weekly_outlook', period_date: period, data });

  it('normalizes pairs and never yields a blank pair', () => {
    expect(normalizePair(' xau/usd ')).toBe('XAUUSD');
    expect(normalizePair('us30.cash')).toBe('US30.CASH');
    expect(normalizePair('')).toBe('EURUSD');
    expect(normalizePair(null)).toBe('EURUSD');
  });

  it('EURUSD -> XAUUSD -> EURUSD keeps each pair\'s outlook and screenshots separate after save and reload', async () => {
    seed('account-a', 'EURUSD', wk(), { scenario: 'seed', before: 'u/eur-before.png', after: 'u/eur-after.png' });
    const view = render(<TradePlanV2 />); await openWeekly();
    expect(area().value).toBe('seed');
    fireEvent.change(area(), { target: { value: 'EUR story' } });
    await toPair('XAUUSD');
    expect(area().value).toBe('');
    fireEvent.change(area(), { target: { value: 'Gold story' } });
    await toPair('EURUSD');
    expect(area().value).toBe('EUR story');
    const eur = weeklyRows().find(r => r.pair === 'EURUSD')!, xau = weeklyRows().find(r => r.pair === 'XAUUSD')!;
    expect(eur).toMatchObject({ account_key: 'account-a', account_id: 'account-a', period_date: wk() });
    expect(eur.data).toMatchObject({ scenario: 'EUR story', before: 'u/eur-before.png', after: 'u/eur-after.png' });
    expect(xau.data).toMatchObject({ scenario: 'Gold story', before: '', after: '' });
    expect(fake.writes.filter(w => w.table === 'trade_plan_checklists' && w.payload.checklist_type === 'weekly_outlook').every(w => w.payload.pair !== '' && w.options.onConflict === 'user_id,account_key,checklist_type,period_date,pair')).toBe(true);
    view.unmount(); render(<TradePlanV2 />); await openWeekly();
    expect(area().value).toBe('EUR story');
    await toPair('XAUUSD'); expect(area().value).toBe('Gold story');
  });

  it('isolates accounts and weeks', async () => {
    seed('account-a', 'EURUSD', wk(), { scenario: 'A only' });
    seed('account-a', 'EURUSD', '2000-01-03', { scenario: 'old week' });
    const view = render(<TradePlanV2 />); await openWeekly();
    expect(area().value).toBe('A only');
    fake.account = 'account-b'; view.rerender(<TradePlanV2 />);
    await waitFor(() => expect(area().value).toBe(''));
  });

  it('shows the legacy pair-less outlook only under EURUSD and never rewrites it', async () => {
    seed('all', '', wk(), { scenario: 'legacy', before: 'u/legacy.png' });
    render(<TradePlanV2 />); await openWeekly();
    expect(area().value).toBe('legacy');
    await toPair('XAUUSD'); expect(area().value).toBe('');
    await toPair('EURUSD'); expect(area().value).toBe('legacy');
    fireEvent.change(area(), { target: { value: 'legacy edited' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Plan' }));
    await waitFor(() => expect(weeklyRows().some(r => r.pair === 'EURUSD' && r.account_key === 'account-a')).toBe(true));
    const legacy = weeklyRows().find(r => r.pair === '')!;
    expect(legacy.data).toEqual({ scenario: 'legacy', before: 'u/legacy.png' });
    expect(weeklyRows().find(r => r.pair === 'EURUSD')!.data).toMatchObject({ scenario: 'legacy edited', before: 'u/legacy.png' });
  });

  it('scopes custom pairs and ignores edits while a pair is still loading', async () => {
    render(<TradePlanV2 />); await openWeekly();
    fireEvent.change(screen.getByLabelText('Custom pair'), { target: { value: 'btc-usd' } });
    fireEvent.keyDown(screen.getByLabelText('Custom pair'), { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Daily Plan — BTCUSD' })).toBeInTheDocument());
    await waitFor(() => area());
    fireEvent.change(area(), { target: { value: 'BTC story' } });
    fireEvent.click(screen.getByRole('button', { name: 'XAUUSD' }));
    // Typing while the switch is in flight belongs to the still-visible BTCUSD scope, never XAUUSD
    const maybe = screen.queryByPlaceholderText('Write your weekly scenario...');
    if (maybe) fireEvent.change(maybe, { target: { value: 'racing edit' } });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Daily Plan — XAUUSD' })).toBeInTheDocument());
    await waitFor(() => area());
    await waitFor(() => expect(area().value).toBe(''));
    expect(['BTC story', 'racing edit']).toContain(weeklyRows().find(r => r.pair === 'BTCUSD')!.data.scenario);
    expect(weeklyRows().some(r => r.pair === 'XAUUSD' && r.data.scenario)).toBe(false);
    expect(weeklyRows().some(r => r.pair === '')).toBe(false);
  });
});

describe('Edit Layout on every pair and tab', () => {
  const tabBtn = (n: string) => fireEvent.click(screen.getByRole('button', { name: n }));
  it('offers Edit Layout with Save/Cancel/Reset on EURUSD, XAUUSD and a custom pair in all tabs', async () => {
    render(<TradePlanV2 />); await ready();
    const check = async () => {
      for (const t of ['Weekly Outlook', 'Daily Plan', 'Full View']) {
        tabBtn(t);
        await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Layout' })).toBeInTheDocument());
        fireEvent.click(screen.getByRole('button', { name: 'Edit Layout' }));
        expect(screen.getByRole('button', { name: 'Save Layout' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      }
      tabBtn('Daily Plan'); await ready();
    };
    await check();
    await switchPair('XAUUSD'); await check();
    fireEvent.change(screen.getByLabelText('Custom pair'), { target: { value: 'ger40' } });
    fireEvent.keyDown(screen.getByLabelText('Custom pair'), { key: 'Enter' });
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Daily Plan — GER40' })).toBeInTheDocument());
    await ready(); await check();
    expect(fake.writes.filter(w => w.table === 'trade_plans')).toHaveLength(0);
  }, 20000);
  it('persists Full View order under page full_view and Reset restores the defaults', async () => {
    const order = ['main_idea', 'weekly', 'daily', 'charts', 'news', 'risk', 'psychology', 'rules'];
    fake.rows.set('workspace_layouts|user-one|full', { table: 'workspace_layouts', user_id: 'user-one', page: 'full_view', layout: { order } });
    render(<TradePlanV2 />); await ready();
    tabBtn('Full View');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Edit Layout' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Edit Layout' }));
    const pos = () => { const items = [...document.querySelectorAll('[draggable="true"]')] as HTMLElement[]; return items.map(i => Number(i.style.order)); };
    await waitFor(() => expect(pos()).toHaveLength(8));
    fireEvent.click(screen.getByRole('button', { name: 'Save Layout' }));
    await waitFor(() => expect(fake.writes.some(w => w.table === 'workspace_layouts')).toBe(true));
    expect(fake.writes.at(-1)!.payload).toMatchObject({ user_id: 'user-one', page: 'full_view', layout: { order } });
    fireEvent.click(screen.getByRole('button', { name: 'Edit Layout' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save Layout' }));
    await waitFor(() => expect(fake.writes.at(-1)!.payload.layout.order).toEqual(FULL_LAYOUT_DEFAULT));
  });
});

describe('Delete Daily Plan and calendar persistence', () => {
  const k = () => { const d = new Date(); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };
  const seed = (pair: string, date: string, account = 'account-a') => fake.rows.set(`trade_plans|user-one|${account}|${date}|${pair}|`, { table: 'trade_plans', user_id: 'user-one', account_key: account, plan_date: date, pair, ai_analysis: { daily_v2: { scenario: `${pair} ${date} ${account}` } } });
  const openDelete = async () => {
    const trigger = await screen.findByRole('button', { name: 'More plan actions' });
    fireEvent.pointerDown(trigger, { button: 0, pointerType: 'mouse' }); fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.click(await screen.findByRole('menuitem', { name: /Delete Daily Plan/ }));
  };
  it('cancel keeps the plan; confirm deletes only the selected user/account/date/pair row', async () => {
    const t = k();
    seed('EURUSD', t); seed('XAUUSD', t); seed('EURUSD', '2020-01-06'); seed('EURUSD', t, 'account-b');
    fake.rows.set('weekly', { table: 'trade_plan_checklists', user_id: 'user-one', account_key: 'account-a', checklist_type: 'weekly_outlook', pair: 'EURUSD', data: { bias: 'Bullish' } });
    render(<TradePlanV2 />); await ready();
    await openDelete();
    expect(await screen.findByText(/delete your EURUSD Daily Plan for/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(fake.rows.size).toBe(5);
    await openDelete();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete Plan' }));
    await waitFor(() => expect(fake.rows.size).toBe(4));
    const del = fake.writes.find(w => w.deleted);
    expect(del.deleted).toEqual({ user_id: 'user-one', account_key: 'account-a', plan_date: t, pair: 'EURUSD' });
    expect(fake.rows.has(`trade_plans|user-one|account-a|${t}|XAUUSD|`)).toBe(true);
    expect(fake.rows.has('trade_plans|user-one|account-a|2020-01-06|EURUSD|')).toBe(true);
    expect(fake.rows.has(`trade_plans|user-one|account-b|${t}|EURUSD|`)).toBe(true);
    expect(fake.rows.has('weekly')).toBe(true);
    await waitFor(() => expect(screen.queryByRole('button', { name: 'More plan actions' })).toBeNull());
  });
  it('remembers selected date and calendar open state', async () => {
    seed('EURUSD', '2020-01-06');
    localStorage.setItem('tn-checklist-date:user-one', '2020-01-06'); localStorage.setItem('tn-checklist-cal-open:user-one', '1');
    render(<TradePlanV2 />);
    expect(await screen.findByText(/January 6, 2020/)).toBeInTheDocument();
    const bar = screen.getByRole('button', { name: /^Calendar$/ });
    expect(bar).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(bar);
    expect(localStorage.getItem('tn-checklist-cal-open:user-one')).toBe('0');
    expect(bar).toHaveAttribute('aria-expanded', 'false');
  });
  it('restores the stored date once the user is known and keeps users separate', async () => {
    seed('EURUSD', '2026-10-12');
    localStorage.setItem('tn-checklist-date:user-one', '2026-10-12');
    localStorage.setItem('tn-checklist-date:user-two', '2026-10-05');
    localStorage.setItem('tn-checklist-date:bad', 'not-a-date');
    const real = fake.user; (fake as any).user = null;
    const view = render(<TradePlanV2 />);
    (fake as any).user = real; view.rerender(<TradePlanV2 />);
    expect(await screen.findByText(/October 12, 2026/)).toBeInTheDocument();
    for (const name of ['Weekly Outlook', 'Full View', 'Daily Plan']) fireEvent.click(screen.getByRole('button', { name }));
    await waitFor(() => expect(screen.getByText(/October 12, 2026/)).toBeInTheDocument());
    expect(localStorage.getItem('tn-checklist-date:user-one')).toBe('2026-10-12');
    expect(localStorage.getItem('tn-checklist-date:user-two')).toBe('2026-10-05');
  });
  it('remembers the active tab per user, restores it after remount and falls back to Daily Plan', async () => {
    seed('EURUSD', '2026-10-12');
    localStorage.setItem('tn-checklist-date:user-one', '2026-10-12');
    localStorage.setItem('tn-checklist-tab:user-two', 'full');
    const view = render(<TradePlanV2 />); await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Weekly Outlook' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Weekly Outlook' })).toHaveAttribute('aria-pressed', 'true'));
    expect(localStorage.getItem('tn-checklist-tab:user-one')).toBe('weekly');
    view.unmount();
    render(<TradePlanV2 />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Weekly Outlook' })).toHaveAttribute('aria-pressed', 'true'));
    expect(screen.getByText(/October 12, 2026/)).toBeInTheDocument();
    cleanup();
    (fake as any).user = { id: 'user-two' };
    render(<TradePlanV2 />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Full View' })).toHaveAttribute('aria-pressed', 'true'));
    expect(localStorage.getItem('tn-checklist-tab:user-one')).toBe('weekly');
    cleanup();
    (fake as any).user = { id: 'user-three' };
    render(<TradePlanV2 />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Daily Plan' })).toHaveAttribute('aria-pressed', 'true'));
  });
});
