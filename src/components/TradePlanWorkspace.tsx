import React, { useState, useEffect, useRef, useCallback } from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  GripVertical, ChevronDown, ChevronUp, Lock, Unlock,
  RotateCcw, Save, Pencil, BarChart3, Target, Shield,
  FileText, List, Eye, X,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface TradePlan {
  id: string; market_bias: string; focus: string;
  max_daily_loss: number; max_risk_per_trade: number;
  setups_to_trade: string[]; notes: string; plan_date: string;
}

interface WidgetState { collapsed: boolean }

const DEFAULT_SYMBOLS = ['NAS100','US30','XAUUSD','EURUSD','GBPUSD','BTCUSD'];
const TIMEFRAMES = [
  { l:'1m', v:'1' },{ l:'5m', v:'5' },{ l:'15m', v:'15' },
  { l:'1H', v:'60' },{ l:'4H', v:'240' },{ l:'1D', v:'D' },
];
const BIAS_STYLE: Record<string,{label:string;color:string;bg:string;border:string}> = {
  bullish: { label:'Bullish',  color:'text-emerald-400', bg:'bg-emerald-500/10', border:'border-emerald-500/20' },
  bearish: { label:'Bearish',  color:'text-red-400',     bg:'bg-red-500/10',     border:'border-red-500/20' },
  neutral: { label:'Neutral',  color:'text-white/60',    bg:'bg-white/5',         border:'border-white/10' },
  ranging: { label:'Ranging',  color:'text-amber-400',   bg:'bg-amber-500/10',   border:'border-amber-500/20' },
};

const DEFAULT_LAYOUT = [
  { i:'plan-summary',  x:0, y:0,  w:6, h:5  },
  { i:'market-bias',   x:6, y:0,  w:3, h:3  },
  { i:'risk',          x:9, y:0,  w:3, h:3  },
  { i:'setups',        x:6, y:3,  w:3, h:4  },
  { i:'checklist',     x:9, y:3,  w:3, h:4  },
  { i:'notes',         x:0, y:5,  w:6, h:4  },
  { i:'watchlist',     x:6, y:7,  w:3, h:8  },
  { i:'chart',         x:0, y:9,  w:9, h:12 },
];

function Widget({
  id, title, icon: Icon, children, locked,
  widgetStates, setWidgetStates, color = 'text-violet-400',
}: {
  id: string; title: string; icon: React.ElementType; children: React.ReactNode;
  locked: boolean; widgetStates: Record<string,WidgetState>;
  setWidgetStates: React.Dispatch<React.SetStateAction<Record<string,WidgetState>>>;
  color?: string;
}) {
  const collapsed = widgetStates[id]?.collapsed ?? false;
  const toggle = () => setWidgetStates(s => ({ ...s, [id]: { ...s[id], collapsed: !collapsed } }));

  return (
    <div className={`h-full flex flex-col rounded-2xl border border-white/[0.08] bg-[#0d0d1a] overflow-hidden transition-all ${!locked ? 'hover:border-white/[0.16] hover:shadow-lg hover:shadow-violet-500/5' : ''}`}>
      <div className={`flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] flex-shrink-0 ${!locked ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}>
        {!locked && <GripVertical className="h-3.5 w-3.5 text-white/20 flex-shrink-0" />}
        <div className="w-5 h-5 rounded-md bg-white/[0.04] flex items-center justify-center flex-shrink-0">
          <Icon className={`h-3 w-3 ${color}`} />
        </div>
        <p className="text-xs font-bold text-white/80 flex-1 truncate">{title}</p>
        <button onClick={toggle} onMouseDown={e => e.stopPropagation()} className="p-1 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white transition-colors">
          {collapsed ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>
      </div>
      {!collapsed && (
        <div className="flex-1 overflow-auto p-4 min-h-0" onMouseDown={e => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

function TVChart({ symbol, timeframe }: { symbol: string; timeframe: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true, symbol, interval: timeframe,
      timezone: 'Etc/UTC', theme: 'dark', style: '1', locale: 'en',
      enable_publishing: false, hide_top_toolbar: false,
      hide_legend: false, save_image: false,
      support_host: 'https://www.tradingview.com',
    });
    const wrap = document.createElement('div');
    wrap.className = 'tradingview-widget-container';
    wrap.style.cssText = 'height:100%;width:100%;';
    const inner = document.createElement('div');
    inner.className = 'tradingview-widget-container__widget';
    inner.style.cssText = 'height:calc(100% - 32px);width:100%;';
    wrap.appendChild(inner);
    wrap.appendChild(script);
    ref.current.appendChild(wrap);
  }, [symbol, timeframe]);

  return <div ref={ref} style={{ height: '100%', width: '100%', minHeight: 300 }} />;
}

export default function TradePlanWorkspace() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [plan, setPlan]       = useState<TradePlan | null>(null);
  const [loadingPlan, setLP]  = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm]       = useState({
    market_bias:'neutral', focus:'', max_daily_loss:'',
    max_risk_per_trade:'', setups_to_trade:[] as string[], notes:'',
  });

  const [layout, setLayout]                   = useState(DEFAULT_LAYOUT);
  const [locked, setLocked]                   = useState(false);
  const [editMode, setEditMode]               = useState(false);
  const [widgetStates, setWidgetStates]       = useState<Record<string,WidgetState>>({});
  const [containerWidth, setContainerWidth]   = useState(1200);
  const containerRef                          = useRef<HTMLDivElement>(null);

  const [watchlist, setWatchlist]     = useState(DEFAULT_SYMBOLS);
  const [newSymbol, setNewSymbol]     = useState('');
  const [selectedSym, setSelectedSym] = useState('NAS100');
  const [timeframe, setTimeframe]     = useState('60');

  const CHECKLIST = [
    'Define market bias',
    'Set max daily loss',
    'Mark key S/R levels',
    'Choose top 2 setups',
    'Check economic calendar',
    "Review yesterday's mistakes",
  ];
  const [checked, setChecked] = useState<Record<string,boolean>>({});

  useEffect(() => {
    const obs = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width;
      if (w) setContainerWidth(w);
    });
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const load = async () => {
      setLP(true);
      const [planRes, layoutRes] = await Promise.all([
        supabase.from('trade_plans').select('*').eq('user_id', user.id).eq('plan_date', today).maybeSingle(),
        supabase.from('workspace_layouts').select('*').eq('user_id', user.id).eq('page','trade_plan').maybeSingle(),
      ]);
      if (cancelled) return;
      if (planRes.data) {
        const p = planRes.data as any;
        setPlan(p as TradePlan);
        setForm({
          market_bias: p.market_bias ?? 'neutral',
          focus: p.focus ?? '',
          max_daily_loss: p.max_daily_loss != null ? String(p.max_daily_loss) : '',
          max_risk_per_trade: p.max_risk_per_trade != null ? String(p.max_risk_per_trade) : '',
          setups_to_trade: p.setups_to_trade ?? [],
          notes: p.notes ?? '',
        });
      } else {
        setEditing(true);
      }
      const lr = layoutRes.data as any;
      if (lr?.layout) {
        try { setLayout(JSON.parse(JSON.stringify(lr.layout))); } catch {}
      } else {
        const local = localStorage.getItem('tradenova_plan_layout');
        if (local) { try { setLayout(JSON.parse(local)); } catch {} }
      }
      if (lr?.preferences) {
        const prefs = lr.preferences as any;
        if (prefs.watchlist) setWatchlist(prefs.watchlist);
        if (prefs.selectedSym) setSelectedSym(prefs.selectedSym);
        if (prefs.widgetStates) setWidgetStates(prefs.widgetStates);
      }
      setLP(false);
    };
    load();
    return () => { cancelled = true; };
  }, [user, today]);

  const saveLayout = useCallback(async (newLayout = layout) => {
    localStorage.setItem('tradenova_plan_layout', JSON.stringify(newLayout));
    if (!user) return;
    await supabase.from('workspace_layouts').upsert({
      user_id: user.id, page: 'trade_plan',
      layout: newLayout as any,
      preferences: { watchlist, selectedSym, widgetStates } as any,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,page' });
    toast({ title: '✅ Layout saved' });
  }, [user, layout, watchlist, selectedSym, widgetStates]);

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT);
    localStorage.removeItem('tradenova_plan_layout');
    toast({ title: 'Layout reset to default' });
  };

  const savePlan = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id, plan_date: today,
        market_bias: form.market_bias,
        focus: form.focus || null,
        max_daily_loss: form.max_daily_loss ? Number(form.max_daily_loss) : null,
        max_risk_per_trade: form.max_risk_per_trade ? Number(form.max_risk_per_trade) : null,
        setups_to_trade: form.setups_to_trade,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('trade_plans').upsert(payload, { onConflict: 'user_id,plan_date' })
        .select().single();
      if (error) throw error;
      setPlan(data as TradePlan);
      setEditing(false);
      toast({ title: '✅ Trade Plan saved!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async () => {
    if (!plan) return;
    await supabase.from('trade_plans').delete().eq('id', plan.id);
    setPlan(null); setEditing(true);
    setForm({ market_bias:'neutral', focus:'', max_daily_loss:'', max_risk_per_trade:'', setups_to_trade:[], notes:'' });
    toast({ title: 'Plan deleted' });
  };

  const addSymbol = () => {
    const s = newSymbol.trim().toUpperCase();
    if (s && !watchlist.includes(s)) setWatchlist(p => [...p, s]);
    if (s) setSelectedSym(s);
    setNewSymbol('');
  };

  if (loadingPlan) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-32 bg-white/[0.03] rounded-2xl animate-pulse" />)}
    </div>
  );

  const wProps = { locked, widgetStates, setWidgetStates };
  const bias   = BIAS_STYLE[plan?.market_bias ?? 'neutral'] ?? BIAS_STYLE.neutral;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-black text-white">Trade Plan</h2>
          <p className="text-xs text-white/30 mt-0.5">
            {new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {editMode ? (
            <>
              <button onClick={() => { saveLayout(); setEditMode(false); }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/15 transition-colors">
                <Save className="h-3.5 w-3.5" /> Save Layout
              </button>
              <button onClick={resetLayout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] text-white/40 text-xs font-bold hover:bg-white/[0.04] transition-colors">
                <RotateCcw className="h-3.5 w-3.5" /> Reset
              </button>
              <button onClick={() => setEditMode(false)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] text-white/40 text-xs font-bold hover:bg-white/[0.04] transition-colors">
                <X className="h-3.5 w-3.5" /> Done
              </button>
            </>
          ) : (
            <button onClick={() => { setEditMode(true); setLocked(false); }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/[0.08] text-white/40 text-xs font-bold hover:bg-white/[0.05] hover:text-white transition-colors">
              <Pencil className="h-3.5 w-3.5" /> Edit Layout
            </button>
          )}
          <button onClick={() => setLocked(l => !l)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-colors ${
              locked
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/15'
                : 'border-white/[0.08] text-white/40 hover:bg-white/[0.05] hover:text-white'
            }`}>
            {locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            {locked ? 'Locked' : 'Lock'}
          </button>
        </div>
      </div>

      {editMode && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/8 border border-violet-500/15">
          <GripVertical className="h-4 w-4 text-violet-400" />
          <p className="text-xs text-violet-300 font-semibold">Drag mode active — move widgets by dragging their headers. Click "Save Layout" when done.</p>
        </div>
      )}

      <div ref={containerRef} className="w-full">
        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={40}
          width={containerWidth}
          isDraggable={editMode && !locked}
          isResizable={editMode && !locked}
          draggableHandle=".drag-handle"
          onLayoutChange={newLayout => setLayout(newLayout as any)}
          margin={[12, 12]}
          containerPadding={[0, 0]}
        >

          <div key="plan-summary" className="drag-handle">
            <Widget id="plan-summary" title="Plan Summary" icon={FileText} color="text-violet-400" {...wProps}>
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-semibold text-white/35 uppercase tracking-wider block mb-2">Market Bias</label>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(BIAS_STYLE).map(([k, b]) => (
                        <button key={k} onClick={() => setForm(f => ({ ...f, market_bias: k }))}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold capitalize transition-all ${
                            form.market_bias === k ? `${b.bg} ${b.border} ${b.color}` : 'border-white/[0.08] text-white/35 hover:bg-white/[0.04]'
                          }`}>{b.label}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-white/35 uppercase tracking-wider block mb-1.5">Session Focus</label>
                    <input value={form.focus} onChange={e => setForm(f => ({ ...f, focus: e.target.value }))}
                      placeholder="e.g. Bullish continuation on NQ pullbacks..."
                      className="w-full text-xs rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-white/35 uppercase tracking-wider block mb-1.5">Max Daily Loss ($)</label>
                      <input type="number" value={form.max_daily_loss} onChange={e => setForm(f => ({ ...f, max_daily_loss: e.target.value }))}
                        className="w-full text-xs rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-white focus:outline-none focus:border-violet-500/40" />
                    </div>
                    <div>
                      <label className="text-[10px] font-semibold text-white/35 uppercase tracking-wider block mb-1.5">Risk Per Trade (%)</label>
                      <input type="number" value={form.max_risk_per_trade} onChange={e => setForm(f => ({ ...f, max_risk_per_trade: e.target.value }))}
                        className="w-full text-xs rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-white focus:outline-none focus:border-violet-500/40" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-white/35 uppercase tracking-wider block mb-1.5">Notes</label>
                    <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                      className="w-full text-xs rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
                  </div>
                  <div className="flex gap-3 pt-1">
                    <button onClick={savePlan} disabled={saving}
                      className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-colors disabled:opacity-50 shadow-lg shadow-violet-500/20">
                      {saving ? 'Saving...' : '✓ Save Plan'}
                    </button>
                    {plan && <button onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl border border-white/[0.08] text-white/35 text-xs font-bold hover:bg-white/[0.04]">Cancel</button>}
                  </div>
                </div>
              ) : plan ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${bias.bg} ${bias.border} ${bias.color}`}>{bias.label}</span>
                    <span className="text-[10px] text-white/25">{plan.plan_date}</span>
                  </div>
                  {plan.focus && <p className="text-sm text-white/70 leading-relaxed">{plan.focus}</p>}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => setEditing(true)} className="px-3 py-1.5 rounded-lg border border-white/[0.08] text-white/40 text-xs font-bold hover:bg-white/[0.05] hover:text-white transition-colors">Edit</button>
                    <button onClick={deletePlan} className="px-3 py-1.5 rounded-lg border border-red-500/20 text-red-400/60 text-xs font-bold hover:bg-red-500/10 hover:text-red-400 transition-colors">Delete</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center py-4">
                  <p className="text-xs text-white/30 mb-3">No plan for today yet</p>
                  <button onClick={() => setEditing(true)} className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-500">Create Plan</button>
                </div>
              )}
            </Widget>
          </div>

          <div key="market-bias" className="drag-handle">
            <Widget id="market-bias" title="Market Bias" icon={Eye} color="text-emerald-400" {...wProps}>
              <div className="space-y-3">
                {Object.entries(BIAS_STYLE).map(([k, b]) => (
                  <div key={k} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    (plan?.market_bias ?? form.market_bias) === k ? `${b.bg} ${b.border}` : 'border-white/[0.05] bg-white/[0.02]'
                  }`}>
                    <span className={`text-sm font-bold capitalize ${(plan?.market_bias ?? form.market_bias) === k ? b.color : 'text-white/30'}`}>{b.label}</span>
                    {(plan?.market_bias ?? form.market_bias) === k && <div className={`w-2 h-2 rounded-full ${b.color.replace('text-','bg-')}`} />}
                  </div>
                ))}
              </div>
            </Widget>
          </div>

          <div key="risk" className="drag-handle">
            <Widget id="risk" title="Risk Parameters" icon={Shield} color="text-red-400" {...wProps}>
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Max Daily Loss</p>
                  <p className="text-2xl font-black text-red-400 font-mono">{plan?.max_daily_loss ? `-$${plan.max_daily_loss}` : '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Risk Per Trade</p>
                  <p className="text-2xl font-black text-amber-400 font-mono">{plan?.max_risk_per_trade ? `${plan.max_risk_per_trade}%` : '—'}</p>
                </div>
              </div>
            </Widget>
          </div>

          <div key="setups" className="drag-handle">
            <Widget id="setups" title="Setups to Trade" icon={Target} color="text-blue-400" {...wProps}>
              <div className="space-y-2">
                {(plan?.setups_to_trade ?? []).length > 0 ? (
                  (plan?.setups_to_trade ?? []).map((s, i) => (
                    <div key={i} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-blue-500/8 border border-blue-500/15">
                      <div className="w-5 h-5 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-black text-blue-400">{i+1}</span>
                      </div>
                      <span className="text-xs font-semibold text-white/80">{s}</span>
                    </div>
                  ))
                ) : (
                  <div className="space-y-2">
                    {['Pullback','Opening Range','Liquidity Sweep'].map(s => (
                      <div key={s} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
                        <span className="text-xs text-white/20">{s}</span>
                      </div>
                    ))}
                    <p className="text-[10px] text-white/20 text-center pt-1">Add setups to your plan</p>
                  </div>
                )}
              </div>
            </Widget>
          </div>

          <div key="checklist" className="drag-handle">
            <Widget id="checklist" title="Session Checklist" icon={List} color="text-violet-400" {...wProps}>
              <div className="space-y-2">
                {CHECKLIST.map((item, i) => (
                  <button key={i} onClick={() => setChecked(c => ({ ...c, [item]: !c[item] }))}
                    className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl border text-left transition-all ${
                      checked[item]
                        ? 'bg-emerald-500/10 border-emerald-500/20'
                        : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                    }`}>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                      checked[item] ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                    }`}>
                      {checked[item] && <span className="text-[9px] text-white font-black">✓</span>}
                    </div>
                    <span className={`text-xs font-medium transition-colors ${checked[item] ? 'text-emerald-400 line-through' : 'text-white/60'}`}>
                      {item}
                    </span>
                  </button>
                ))}
                <div className="flex items-center justify-between pt-1 px-1">
                  <span className="text-[10px] text-white/25">{Object.values(checked).filter(Boolean).length}/{CHECKLIST.length} done</span>
                  <button onClick={() => setChecked({})} className="text-[10px] text-white/25 hover:text-white/50 transition-colors">Reset</button>
                </div>
              </div>
            </Widget>
          </div>

          <div key="notes" className="drag-handle">
            <Widget id="notes" title="Notes & Rules" icon={FileText} color="text-amber-400" {...wProps}>
              {plan?.notes ? (
                <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{plan.notes}</p>
              ) : (
                <p className="text-xs text-white/25 italic">No notes added to today's plan.</p>
              )}
            </Widget>
          </div>

          <div key="watchlist" className="drag-handle">
            <Widget id="watchlist" title="Watchlist" icon={BarChart3} color="text-cyan-400" {...wProps}>
              <div className="space-y-2 h-full flex flex-col">
                <div className="flex gap-2 flex-shrink-0">
                  <input value={newSymbol} onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && addSymbol()}
                    placeholder="Add symbol..."
                    className="flex-1 text-xs rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
                  <button onClick={addSymbol}
                    className="px-3 py-2 rounded-xl bg-violet-500/15 border border-violet-500/20 text-violet-400 text-xs font-black hover:bg-violet-500/20 transition-colors">+</button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1">
                  {watchlist.map(sym => (
                    <button key={sym} onClick={() => setSelectedSym(sym)}
                      className={`flex items-center justify-between w-full px-3 py-2.5 rounded-xl border transition-all group ${
                        selectedSym === sym
                          ? 'bg-violet-500/12 border-violet-500/25 shadow-sm'
                          : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.10]'
                      }`}>
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${selectedSym === sym ? 'bg-violet-400' : 'bg-white/15'}`} />
                        <span className={`text-xs font-black ${selectedSym === sym ? 'text-violet-300' : 'text-white/60'}`}>{sym}</span>
                      </div>
                      <span onClick={e => { e.stopPropagation(); setWatchlist(p => p.filter(s => s !== sym)); }}
                        className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all text-xs leading-none cursor-pointer">✕</span>
                    </button>
                  ))}
                </div>
              </div>
            </Widget>
          </div>

          <div key="chart" className="drag-handle">
            <div className="h-full flex flex-col rounded-2xl border border-white/[0.08] bg-[#0d0d1a] overflow-hidden">
              <div className={`flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] bg-white/[0.02] flex-shrink-0 ${!locked ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                {!locked && <GripVertical className="h-3.5 w-3.5 text-white/20" />}
                <div className="w-5 h-5 rounded-md bg-white/[0.04] flex items-center justify-center">
                  <BarChart3 className="h-3 w-3 text-violet-400" />
                </div>
                <p className="text-xs font-black text-white/80 flex-1">{selectedSym}</p>
                <div className="flex items-center gap-1" onMouseDown={e => e.stopPropagation()}>
                  {TIMEFRAMES.map(tf => (
                    <button key={tf.v} onClick={() => setTimeframe(tf.v)}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        timeframe === tf.v
                          ? 'bg-violet-600 text-white shadow'
                          : 'text-white/30 hover:text-white hover:bg-white/[0.05]'
                      }`}>
                      {tf.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-h-0" onMouseDown={e => e.stopPropagation()}>
                <TVChart symbol={selectedSym} timeframe={timeframe} />
              </div>
            </div>
          </div>

        </GridLayout>
      </div>

      <style>{`
        .react-grid-item.react-grid-placeholder {
          background: rgba(124, 58, 237, 0.12) !important;
          border: 2px dashed rgba(124, 58, 237, 0.4) !important;
          border-radius: 16px !important;
        }
        .react-resizable-handle {
          background: none !important;
          border-right: 2px solid rgba(124, 58, 237, 0.4);
          border-bottom: 2px solid rgba(124, 58, 237, 0.4);
          border-radius: 0 0 4px 0;
        }
        .react-resizable-handle::after {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
