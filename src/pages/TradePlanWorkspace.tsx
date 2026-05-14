import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

const BIAS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  bullish: { label: 'Bullish', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  bearish: { label: 'Bearish', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20' },
  neutral: { label: 'Neutral', color: 'text-white/60',    bg: 'bg-white/5',         border: 'border-white/10' },
  ranging: { label: 'Ranging', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
};

const TIMEFRAMES = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1H', value: '60' },
  { label: '4H', value: '240' },
  { label: '1D', value: 'D' },
];

const DEFAULT_SYMBOLS = ['NAS100', 'US30', 'XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD'];

export default function TradePlanWorkspace() {
  const { user } = useAuth();

  const [plan, setPlan] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'focus'|'risk'|'notes'>('focus');

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = React.useState<any>({
    market_bias: 'neutral',
    focus: '',
    max_daily_loss: '',
    max_risk_per_trade: '',
    setups_to_trade: [] as string[],
    notes: '',
  });

  const [watchlist, setWatchlist] = React.useState<string[]>(DEFAULT_SYMBOLS);
  const [newSymbol, setNewSymbol] = React.useState('');
  const [selectedSymbol, setSelectedSymbol] = React.useState('NAS100');
  const [timeframe, setTimeframe] = React.useState('60');

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('trade_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_date', today)
        .maybeSingle();
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

  const savePlan = async () => {
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
        .from('trade_plans')
        .upsert(payload, { onConflict: 'user_id,plan_date' })
        .select()
        .single();
      if (error) throw error;
      setPlan(data);
      setEditing(false);
    } catch (err) {
      console.error('Save plan error:', err);
    } finally {
      setSaving(false);
    }
  };

  const deletePlan = async () => {
    if (!plan) return;
    await supabase.from('trade_plans').delete().eq('id', plan.id);
    setPlan(null);
    setEditing(true);
    setForm({ market_bias: 'neutral', focus: '', max_daily_loss: '', max_risk_per_trade: '', setups_to_trade: [], notes: '' });
  };

  const addSymbol = () => {
    const s = newSymbol.trim().toUpperCase();
    if (s && !watchlist.includes(s)) {
      setWatchlist(prev => [...prev, s]);
      setSelectedSymbol(s);
    }
    setNewSymbol('');
  };

  const removeSymbol = (sym: string) => {
    setWatchlist(prev => prev.filter(s => s !== sym));
    if (selectedSymbol === sym) setSelectedSymbol(watchlist[0] ?? 'NAS100');
  };

  const SESSION_INFO = React.useMemo(() => {
    const h = new Date().getUTCHours();
    if (h >= 8 && h < 17) return { label: 'London', color: 'text-blue-400', active: true };
    if (h >= 13 && h < 22) return { label: 'New York', color: 'text-violet-400', active: true };
    if (h >= 22 || h < 8) return { label: 'Asia', color: 'text-amber-400', active: h >= 23 || h < 6 };
    return { label: 'Pre-Market', color: 'text-white/40', active: false };
  }, []);

  const chartRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!chartRef.current) return;
    chartRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: selectedSymbol,
      interval: timeframe,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      hide_volume: false,
      support_host: 'https://www.tradingview.com',
    });

    const container = document.createElement('div');
    container.className = 'tradingview-widget-container';
    container.style.height = '100%';
    container.style.width = '100%';

    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetDiv.style.height = 'calc(100% - 32px)';
    widgetDiv.style.width = '100%';

    container.appendChild(widgetDiv);
    container.appendChild(script);
    chartRef.current.appendChild(container);
  }, [selectedSymbol, timeframe]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-white/[0.04] rounded-xl animate-pulse" />
        <div className="h-48 bg-white/[0.04] rounded-2xl animate-pulse" />
        <div className="h-[500px] bg-white/[0.04] rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-heading text-foreground">Trade Plan</h2>
        <p className="text-muted-foreground text-sm">Pre-market structure before execution · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {editing ? (
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Today's Plan</p>
            {plan && (
              <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Market Bias</label>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(BIAS).map(([key, b]) => (
                <button key={key} onClick={() => setForm((f: any) => ({ ...f, market_bias: key }))}
                  className={`px-4 py-2 rounded-xl border text-xs font-semibold transition-all capitalize ${
                    form.market_bias === key ? `${b.bg} ${b.border} ${b.color}` : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}>
                  {b.label}
                </button>
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
                placeholder="250"
                className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Risk Per Trade (%)</label>
              <input type="number" value={form.max_risk_per_trade} onChange={e => setForm((f: any) => ({ ...f, max_risk_per_trade: e.target.value }))}
                placeholder="0.5"
                className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-2">Notes & Rules</label>
            <textarea value={form.notes} onChange={e => setForm((f: any) => ({ ...f, notes: e.target.value }))}
              placeholder="Key levels, rules for today, setups to trade..."
              rows={3}
              className="w-full text-sm rounded-xl border border-border bg-background px-4 py-2.5 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
          </div>

          <button onClick={savePlan} disabled={saving}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
            {saving ? 'Saving...' : 'Save Plan'}
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm font-semibold text-foreground">Today's Plan</p>
              {plan?.market_bias && (() => {
                const b = BIAS[plan.market_bias] ?? BIAS.neutral;
                return (
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${b.bg} ${b.border} ${b.color}`}>
                    {b.label}
                  </span>
                );
              })()}
              {plan?.max_daily_loss && (
                <span className="text-xs text-muted-foreground bg-muted/40 border border-border px-2.5 py-1 rounded-full">
                  Max loss: ${plan.max_daily_loss}
                </span>
              )}
              {plan?.max_risk_per_trade && (
                <span className="text-xs text-muted-foreground bg-muted/40 border border-border px-2.5 py-1 rounded-full">
                  Risk: {plan.max_risk_per_trade}%/trade
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(true)}
                className="text-xs text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-all">
                Edit
              </button>
              <button onClick={deletePlan}
                className="text-xs text-red-500 hover:text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all">
                Delete
              </button>
            </div>
          </div>

          <div className="flex border-b border-border px-5">
            {(['focus', 'risk', 'notes'] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-3 text-xs font-semibold capitalize border-b-2 transition-all -mb-px ${
                  activeTab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}>
                {t === 'focus' ? 'Session Focus' : t === 'risk' ? 'Risk Rules' : 'Notes'}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === 'focus' && (
              plan?.focus
                ? <p className="text-sm text-foreground leading-relaxed">{plan.focus}</p>
                : <p className="text-sm text-muted-foreground italic">No session focus set.</p>
            )}
            {activeTab === 'risk' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Max Daily Loss</p>
                  <p className="text-lg font-bold text-foreground">{plan?.max_daily_loss ? `-$${plan.max_daily_loss}` : '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Risk Per Trade</p>
                  <p className="text-lg font-bold text-foreground">{plan?.max_risk_per_trade ? `${plan.max_risk_per_trade}%` : '—'}</p>
                </div>
              </div>
            )}
            {activeTab === 'notes' && (
              plan?.notes
                ? <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{plan.notes}</p>
                : <p className="text-sm text-muted-foreground italic">No notes added.</p>
            )}
          </div>
        </div>
      )}

      {/* MARKET WORKSPACE */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-bold text-foreground">Market Workspace</h3>
          <p className="text-sm text-muted-foreground">Analyze markets alongside your plan</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Session</p>
            <p className={`text-sm font-bold ${SESSION_INFO.color}`}>
              {SESSION_INFO.label} {SESSION_INFO.active ? '● Live' : '○ Closed'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Selected</p>
            <p className="text-sm font-bold text-foreground">{selectedSymbol}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Timeframe</p>
            <p className="text-sm font-bold text-foreground">{TIMEFRAMES.find(t => t.value === timeframe)?.label ?? timeframe}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Bias</p>
            <p className={`text-sm font-bold capitalize ${plan ? BIAS[plan.market_bias]?.color : 'text-muted-foreground'}`}>
              {plan ? BIAS[plan.market_bias]?.label : 'No plan'}
            </p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <div className="w-full lg:w-56 flex-shrink-0 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <p className="text-xs font-semibold text-foreground">Watchlist</p>
            </div>
            <div className="p-3 border-b border-border">
              <div className="flex gap-2">
                <input
                  value={newSymbol}
                  onChange={e => setNewSymbol(e.target.value.toUpperCase())}
                  onKeyDown={e => e.key === 'Enter' && addSymbol()}
                  placeholder="Add symbol..."
                  className="flex-1 text-xs rounded-lg border border-border bg-background px-2.5 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30"
                />
                <button onClick={addSymbol}
                  className="px-2.5 py-2 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-bold hover:bg-primary/15 transition-colors">
                  +
                </button>
              </div>
            </div>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {watchlist.map(sym => (
                <div key={sym}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all group ${
                    selectedSymbol === sym
                      ? 'bg-primary/5 border-l-2 border-l-primary'
                      : 'hover:bg-muted/30 border-l-2 border-l-transparent'
                  }`}
                  onClick={() => setSelectedSymbol(sym)}
                >
                  <p className={`text-sm font-bold ${selectedSymbol === sym ? 'text-primary' : 'text-foreground'}`}>{sym}</p>
                  <button
                    onClick={e => { e.stopPropagation(); removeSymbol(sym); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all text-xs px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-bold text-foreground">{selectedSymbol}</p>
              <div className="flex items-center gap-1">
                {TIMEFRAMES.map(tf => (
                  <button key={tf.value} onClick={() => setTimeframe(tf.value)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      timeframe === tf.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}>
                    {tf.label}
                  </button>
                ))}
              </div>
            </div>
            <div ref={chartRef} className="w-full" style={{ height: '480px' }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
