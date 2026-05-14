import React from 'react';
import { motion } from 'framer-motion';
// @ts-ignore - types mismatch with runtime
import RGL from 'react-grid-layout';
const Responsive: any = (RGL as any).Responsive;
const WidthProvider: any = (RGL as any).WidthProvider;
type Layout = { i: string; x: number; y: number; w: number; h: number };
import { GripVertical, ChevronDown, ChevronUp, Lock, Unlock, Save, RotateCcw, Edit3, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const BIAS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  bullish: { label: 'Bullish', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  bearish: { label: 'Bearish', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
  neutral: { label: 'Neutral', color: 'text-muted-foreground', bg: 'bg-muted/30', border: 'border-border' },
  ranging: { label: 'Ranging', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
};

const TIMEFRAMES = [
  { label: '1m', value: '1' }, { label: '5m', value: '5' }, { label: '15m', value: '15' },
  { label: '1H', value: '60' }, { label: '4H', value: '240' }, { label: '1D', value: 'D' },
];

const DEFAULT_SYMBOLS = ['NAS100', 'US30', 'XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD'];

const WIDGETS = [
  { id: 'summary',    title: 'Plan Summary' },
  { id: 'bias',       title: 'Market Bias' },
  { id: 'setups',     title: 'Setups to Trade' },
  { id: 'risk',       title: 'Risk Parameters' },
  { id: 'notes',      title: 'Notes' },
  { id: 'watchlist',  title: 'Watchlist' },
  { id: 'chart',      title: 'TradingView Chart' },
  { id: 'market',     title: 'Quick Market Data' },
  { id: 'checklist',  title: 'Session Checklist' },
] as const;

type WidgetId = typeof WIDGETS[number]['id'];

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'summary',   x: 0, y: 0, w: 4, h: 4 },
  { i: 'bias',      x: 4, y: 0, w: 4, h: 4 },
  { i: 'risk',      x: 8, y: 0, w: 4, h: 4 },
  { i: 'setups',    x: 0, y: 4, w: 4, h: 5 },
  { i: 'notes',     x: 4, y: 4, w: 4, h: 5 },
  { i: 'checklist', x: 8, y: 4, w: 4, h: 5 },
  { i: 'watchlist', x: 0, y: 9, w: 3, h: 9 },
  { i: 'chart',     x: 3, y: 9, w: 6, h: 9 },
  { i: 'market',    x: 9, y: 9, w: 3, h: 9 },
];

const LS_LAYOUT_KEY = 'tn_plan_workspace_layout_v1';
const LS_PREFS_KEY  = 'tn_plan_workspace_prefs_v1';

const DEFAULT_CHECKLIST = [
  'Review economic calendar',
  'Mark daily/weekly key levels',
  'Define market bias',
  'Set max daily loss',
  'Pre-define entry triggers',
  'Confirm risk per trade',
];

export default function TradePlanWorkspace() {
  const { user } = useAuth();

  const [plan, setPlan] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = React.useState<any>({
    market_bias: 'neutral',
    focus: '',
    max_daily_loss: '',
    max_risk_per_trade: '',
    setups_to_trade: [] as string[],
    notes: '',
  });
  const [setupInput, setSetupInput] = React.useState('');

  // Workspace state
  const [layouts, setLayouts] = React.useState<{ lg: Layout[] }>({ lg: DEFAULT_LAYOUT });
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});
  const [hidden, setHidden] = React.useState<Record<string, boolean>>({});
  const [locked, setLocked] = React.useState(true);
  const [editLayout, setEditLayout] = React.useState(false);
  const [savedToast, setSavedToast] = React.useState(false);

  const [watchlist, setWatchlist] = React.useState<string[]>(DEFAULT_SYMBOLS);
  const [newSymbol, setNewSymbol] = React.useState('');
  const [selectedSymbol, setSelectedSymbol] = React.useState('NAS100');
  const [timeframe, setTimeframe] = React.useState('60');
  const [checklistState, setChecklistState] = React.useState<Record<string, boolean>>({});

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  // Load preferences from localStorage
  React.useEffect(() => {
    try {
      const ly = localStorage.getItem(LS_LAYOUT_KEY);
      if (ly) setLayouts(JSON.parse(ly));
      const pr = localStorage.getItem(LS_PREFS_KEY);
      if (pr) {
        const p = JSON.parse(pr);
        if (p.collapsed) setCollapsed(p.collapsed);
        if (p.hidden) setHidden(p.hidden);
        if (p.selectedSymbol) setSelectedSymbol(p.selectedSymbol);
        if (p.watchlist) setWatchlist(p.watchlist);
        if (p.checklistState) setChecklistState(p.checklistState);
        if (typeof p.locked === 'boolean') setLocked(p.locked);
      }
    } catch {/* ignore */}
  }, []);

  // Load plan
  React.useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('trade_plans').select('*').eq('user_id', user.id).eq('plan_date', today).maybeSingle();
      if (data) {
        setPlan(data);
        setForm({
          market_bias: data.market_bias ?? 'neutral',
          focus: data.focus ?? '',
          max_daily_loss: data.max_daily_loss ?? '',
          max_risk_per_trade: data.max_risk_per_trade ?? '',
          setups_to_trade: data.setups_to_trade ?? [],
          notes: data.notes ?? '',
        });
      } else {
        setEditing(true);
      }
      setLoading(false);
    })();
  }, [user, today]);

  const savePlan = React.useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        plan_date: today,
        market_bias: form.market_bias,
        focus: form.focus || null,
        max_daily_loss: form.max_daily_loss ? Number(form.max_daily_loss) : null,
        max_risk_per_trade: form.max_risk_per_trade ? Number(form.max_risk_per_trade) : null,
        setups_to_trade: form.setups_to_trade,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('trade_plans').upsert(payload, { onConflict: 'user_id,plan_date' }).select().single();
      if (error) throw error;
      setPlan(data);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }, [user, today, form]);

  const deletePlan = React.useCallback(async () => {
    if (!plan) return;
    await supabase.from('trade_plans').delete().eq('id', plan.id);
    setPlan(null);
    setEditing(true);
    setForm({ market_bias: 'neutral', focus: '', max_daily_loss: '', max_risk_per_trade: '', setups_to_trade: [], notes: '' });
  }, [plan]);

  const persistPrefs = React.useCallback((patch: Record<string, any>) => {
    try {
      const cur = JSON.parse(localStorage.getItem(LS_PREFS_KEY) || '{}');
      localStorage.setItem(LS_PREFS_KEY, JSON.stringify({ ...cur, ...patch }));
    } catch {/* ignore */}
  }, []);

  const onLayoutChange = React.useCallback((_l: Layout[], all: any) => {
    setLayouts(all);
  }, []);

  const saveLayout = React.useCallback(() => {
    try {
      localStorage.setItem(LS_LAYOUT_KEY, JSON.stringify(layouts));
      persistPrefs({ collapsed, hidden, selectedSymbol, watchlist, checklistState, locked });
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 1800);
    } catch {/* ignore */}
  }, [layouts, collapsed, hidden, selectedSymbol, watchlist, checklistState, locked, persistPrefs]);

  const resetLayout = React.useCallback(() => {
    setLayouts({ lg: DEFAULT_LAYOUT });
    setCollapsed({}); setHidden({});
    localStorage.removeItem(LS_LAYOUT_KEY);
    localStorage.removeItem(LS_PREFS_KEY);
  }, []);

  const toggleCollapse = (id: string) => setCollapsed(c => ({ ...c, [id]: !c[id] }));
  const hideWidget = (id: string) => setHidden(h => ({ ...h, [id]: true }));
  const showWidget = (id: string) => setHidden(h => { const n = { ...h }; delete n[id]; return n; });

  const addSymbol = () => {
    const s = newSymbol.trim().toUpperCase();
    if (s && !watchlist.includes(s)) {
      const next = [...watchlist, s];
      setWatchlist(next); setSelectedSymbol(s);
      persistPrefs({ watchlist: next, selectedSymbol: s });
    }
    setNewSymbol('');
  };
  const removeSymbol = (sym: string) => {
    const next = watchlist.filter(s => s !== sym);
    setWatchlist(next);
    if (selectedSymbol === sym) setSelectedSymbol(next[0] ?? 'NAS100');
    persistPrefs({ watchlist: next });
  };

  const SESSION_INFO = React.useMemo(() => {
    const h = new Date().getUTCHours();
    if (h >= 13 && h < 22) return { label: 'New York', color: 'text-violet-400', active: true };
    if (h >= 8 && h < 17) return { label: 'London', color: 'text-blue-400', active: true };
    if (h >= 22 || h < 8) return { label: 'Asia', color: 'text-amber-400', active: h >= 23 || h < 6 };
    return { label: 'Pre-Market', color: 'text-muted-foreground', active: false };
  }, []);

  // TradingView chart
  const chartRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!chartRef.current || hidden['chart'] || collapsed['chart']) return;
    chartRef.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true, symbol: selectedSymbol, interval: timeframe, timezone: 'Etc/UTC',
      theme: 'dark', style: '1', locale: 'en', enable_publishing: false,
      hide_top_toolbar: false, hide_legend: false, save_image: false, calendar: false,
      support_host: 'https://www.tradingview.com',
    });
    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.cssText = 'height:100%;width:100%';
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.cssText = 'height:calc(100% - 32px);width:100%';
    container.appendChild(widgetDiv);
    container.appendChild(script);
    chartRef.current.appendChild(container);
  }, [selectedSymbol, timeframe, hidden, collapsed, layouts]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted/40 rounded-xl animate-pulse" />
        <div className="h-48 bg-muted/40 rounded-2xl animate-pulse" />
      </div>
    );
  }

  // ==== Editing form (unchanged behavior) ====
  if (editing || !plan) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Trade Plan</h2>
          <p className="text-muted-foreground text-sm">Build today's plan to unlock the workspace · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Today's Plan</p>
            {plan && <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>}
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Market Bias</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(BIAS).map(([key, b]) => (
                <button key={key} onClick={() => setForm((f: any) => ({ ...f, market_bias: key }))}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all capitalize ${
                    form.market_bias === key ? `${b.bg} ${b.border} ${b.color}` : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}>{b.label}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Session Focus</label>
            <input value={form.focus} onChange={e => setForm((f: any) => ({ ...f, focus: e.target.value }))}
              placeholder="e.g. Bullish continuation on NQ pullbacks..."
              className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Max Daily Loss ($)</label>
              <input type="number" value={form.max_daily_loss} onChange={e => setForm((f: any) => ({ ...f, max_daily_loss: e.target.value }))}
                placeholder="250" className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Risk Per Trade (%)</label>
              <input type="number" value={form.max_risk_per_trade} onChange={e => setForm((f: any) => ({ ...f, max_risk_per_trade: e.target.value }))}
                placeholder="0.5" className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Setups to Trade</label>
            <div className="flex gap-2 mb-2">
              <input value={setupInput} onChange={e => setSetupInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && setupInput.trim()) { setForm((f: any) => ({ ...f, setups_to_trade: [...f.setups_to_trade, setupInput.trim()] })); setSetupInput(''); }}}
                placeholder="e.g. ICT FVG, ORB Breakout..."
                className="flex-1 text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div className="flex gap-2 flex-wrap">
              {form.setups_to_trade.map((s: string, i: number) => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center gap-2">
                  {s}
                  <button onClick={() => setForm((f: any) => ({ ...f, setups_to_trade: f.setups_to_trade.filter((_: any, j: number) => j !== i) }))}>×</button>
                </span>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Notes & Rules</label>
            <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
              placeholder="Key levels, rules for today, setups to trade..." rows={3}
              className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>
          <button onClick={savePlan} disabled={saving}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Plan & Open Workspace'}
          </button>
        </div>
      </motion.div>
    );
  }

  // ==== Workspace ====
  const visibleWidgets = WIDGETS.filter(w => !hidden[w.id]);
  const visibleLayout = (layouts.lg ?? DEFAULT_LAYOUT).filter(l => !hidden[l.i]);

  const Panel: React.FC<{ id: WidgetId; children: React.ReactNode }> = ({ id, children }) => {
    const w = WIDGETS.find(x => x.id === id)!;
    const isCollapsed = collapsed[id];
    return (
      <div className="h-full flex flex-col rounded-2xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/30 transition-all overflow-hidden">
        <div className="drag-handle flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20 select-none cursor-move">
          <div className="flex items-center gap-2 min-w-0">
            <GripVertical className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <p className="text-xs font-bold text-foreground truncate">{w.title}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => toggleCollapse(id)} className="p-1 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition">
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
            {editLayout && (
              <button onClick={() => hideWidget(id)} className="p-1 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {!isCollapsed && <div className="flex-1 overflow-auto">{children}</div>}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header / toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">Trade Workspace</h2>
          <p className="text-muted-foreground text-sm">Drag, resize, organize · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setEditing(true)} className="text-xs border border-border px-3 py-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition">Edit Plan</button>
          <button onClick={deletePlan} className="text-xs border border-red-500/20 text-red-500 px-3 py-2 rounded-lg hover:bg-red-500/10 transition">Delete</button>
          <div className="w-px h-6 bg-border mx-1" />
          <button onClick={() => { setEditLayout(v => !v); if (!editLayout) setLocked(false); }}
            className={`text-xs px-3 py-2 rounded-lg border transition flex items-center gap-1.5 ${editLayout ? 'bg-primary/10 border-primary/30 text-primary' : 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
            <Edit3 className="w-3.5 h-3.5" /> Edit Layout
          </button>
          <button onClick={() => setLocked(l => { const n = !l; if (n) setEditLayout(false); return n; })}
            className={`text-xs px-3 py-2 rounded-lg border transition flex items-center gap-1.5 ${locked ? 'border-border text-muted-foreground hover:text-foreground hover:bg-muted/50' : 'bg-amber-500/10 border-amber-500/30 text-amber-400'}`}>
            {locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />} {locked ? 'Locked' : 'Unlocked'}
          </button>
          <button onClick={saveLayout} className="text-xs px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition flex items-center gap-1.5">
            <Save className="w-3.5 h-3.5" /> Save Layout
          </button>
          <button onClick={resetLayout} className="text-xs px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Hidden widgets restore bar */}
      {Object.keys(hidden).length > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-2 rounded-xl border border-dashed border-border bg-muted/10">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2">Hidden:</span>
          {WIDGETS.filter(w => hidden[w.id]).map(w => (
            <button key={w.id} onClick={() => showWidget(w.id)}
              className="text-xs px-2.5 py-1 rounded-lg border border-border bg-card hover:bg-muted/50 text-muted-foreground hover:text-foreground transition">
              + {w.title}
            </button>
          ))}
        </div>
      )}

      {savedToast && (
        <div className="fixed top-6 right-6 z-50 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-lg">
          Layout saved
        </div>
      )}

      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: visibleLayout, md: visibleLayout, sm: visibleLayout, xs: visibleLayout, xxs: visibleLayout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={40}
        margin={[12, 12]}
        isDraggable={!locked && !isMobile}
        isResizable={!locked && !isMobile}
        draggableHandle=".drag-handle"
        onLayoutChange={onLayoutChange}
        compactType="vertical"
      >
        {visibleWidgets.map(w => (
          <div key={w.id}>
            <Panel id={w.id}>
              {w.id === 'summary' && (
                <div className="p-4 space-y-2">
                  <p className="text-xs text-muted-foreground">Session Focus</p>
                  <p className="text-sm text-foreground leading-relaxed">{plan.focus || <span className="italic text-muted-foreground">No focus set</span>}</p>
                  <div className="pt-2 border-t border-border mt-3 grid grid-cols-2 gap-2">
                    <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Created</p><p className="text-xs font-bold text-foreground">{new Date(plan.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p></div>
                    <div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Setups</p><p className="text-xs font-bold text-foreground">{plan.setups_to_trade?.length ?? 0}</p></div>
                  </div>
                </div>
              )}
              {w.id === 'bias' && (() => {
                const b = BIAS[plan.market_bias] ?? BIAS.neutral;
                return (
                  <div className="p-4 h-full flex flex-col items-center justify-center">
                    <div className={`px-6 py-3 rounded-2xl border ${b.bg} ${b.border}`}>
                      <p className={`text-2xl font-bold ${b.color}`}>{b.label}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">Today's directional bias</p>
                  </div>
                );
              })()}
              {w.id === 'setups' && (
                <div className="p-4 space-y-2">
                  {plan.setups_to_trade?.length ? plan.setups_to_trade.map((s: string, i: number) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                      <p className="text-xs font-medium text-foreground">{s}</p>
                    </div>
                  )) : <p className="text-xs text-muted-foreground italic">No setups defined</p>}
                </div>
              )}
              {w.id === 'risk' && (
                <div className="p-4 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/20">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Max Daily Loss</p>
                    <p className="text-lg font-bold text-red-400">{plan.max_daily_loss ? `-$${plan.max_daily_loss}` : '—'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Risk / Trade</p>
                    <p className="text-lg font-bold text-amber-400">{plan.max_risk_per_trade ? `${plan.max_risk_per_trade}%` : '—'}</p>
                  </div>
                </div>
              )}
              {w.id === 'notes' && (
                <div className="p-4">
                  {plan.notes
                    ? <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{plan.notes}</p>
                    : <p className="text-xs text-muted-foreground italic">No notes added.</p>}
                </div>
              )}
              {w.id === 'watchlist' && (
                <div className="flex flex-col h-full">
                  <div className="p-2 border-b border-border flex gap-2">
                    <input value={newSymbol} onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === 'Enter' && addSymbol()}
                      placeholder="Add symbol..."
                      className="flex-1 text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30" />
                    <button onClick={addSymbol} className="px-2.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/15">+</button>
                  </div>
                  <div className="overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/20">
                        <tr>
                          <th className="px-3 py-2 text-left">Symbol</th>
                          <th className="px-2 py-2 text-right">Price</th>
                          <th className="px-2 py-2 text-right">Chg %</th>
                          <th className="px-2 py-2 text-right">Sess</th>
                          <th className="w-6"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {watchlist.map(sym => {
                          const isSel = selectedSymbol === sym;
                          const fakeChg = ((sym.charCodeAt(0) % 7) - 3) * 0.27;
                          return (
                            <tr key={sym}
                              onClick={() => { setSelectedSymbol(sym); persistPrefs({ selectedSymbol: sym }); }}
                              className={`group cursor-pointer border-b border-border/50 hover:bg-muted/30 transition ${isSel ? 'bg-primary/5' : ''}`}>
                              <td className={`px-3 py-2 font-bold ${isSel ? 'text-primary' : 'text-foreground'}`}>{sym}</td>
                              <td className="px-2 py-2 text-right text-muted-foreground">—</td>
                              <td className={`px-2 py-2 text-right font-semibold ${fakeChg >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {fakeChg >= 0 ? '+' : ''}{fakeChg.toFixed(2)}%
                              </td>
                              <td className="px-2 py-2 text-right text-muted-foreground">{SESSION_INFO.label.slice(0,2)}</td>
                              <td className="pr-2 text-right">
                                <button onClick={e => { e.stopPropagation(); removeSymbol(sym); }} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 text-xs">✕</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {w.id === 'chart' && (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-border">
                    <p className="text-xs font-bold text-foreground">{selectedSymbol}</p>
                    <div className="flex items-center gap-1">
                      {TIMEFRAMES.map(tf => (
                        <button key={tf.value} onClick={() => setTimeframe(tf.value)}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition ${timeframe === tf.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
                          {tf.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div ref={chartRef} className="flex-1 min-h-[200px]" />
                </div>
              )}
              {w.id === 'market' && (
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Session</p>
                    <p className={`text-xs font-bold ${SESSION_INFO.color}`}>{SESSION_INFO.label} {SESSION_INFO.active ? '●' : '○'}</p>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Selected</p>
                    <p className="text-xs font-bold text-foreground">{selectedSymbol}</p>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Timeframe</p>
                    <p className="text-xs font-bold text-foreground">{TIMEFRAMES.find(t => t.value === timeframe)?.label ?? timeframe}</p>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">UTC Time</p>
                    <p className="text-xs font-bold text-foreground">{new Date().toUTCString().split(' ')[4]}</p>
                  </div>
                </div>
              )}
              {w.id === 'checklist' && (
                <div className="p-3 space-y-1.5">
                  {DEFAULT_CHECKLIST.map((item, i) => {
                    const k = `c${i}`;
                    const checked = !!checklistState[k];
                    return (
                      <label key={k} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 cursor-pointer transition">
                        <input type="checkbox" checked={checked}
                          onChange={() => setChecklistState(s => ({ ...s, [k]: !s[k] }))}
                          className="accent-primary" />
                        <span className={`text-xs ${checked ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </Panel>
          </div>
        ))}
      </ResponsiveGridLayout>

      <style>{`
        .react-grid-item.react-grid-placeholder { background: hsl(var(--primary) / 0.15) !important; border: 2px dashed hsl(var(--primary) / 0.4); border-radius: 1rem; opacity: 1; }
        .react-grid-item > .react-resizable-handle { z-index: 5; }
        .react-grid-item > .react-resizable-handle::after { border-color: hsl(var(--muted-foreground)) !important; }
      `}</style>
    </motion.div>
  );
}
