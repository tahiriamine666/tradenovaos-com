import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  TrendingUp, TrendingDown, Minus, BarChart2,
  Check, Plus, GripVertical, Edit3, Save,
  Brain, Shield, Zap, AlertTriangle, Clock,
  ChevronDown, ChevronUp, Sparkles,
  Moon, Sun, Coffee, Battery, Activity,
  X,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChecklistItem {
  id: string; text: string; done: boolean;
  category: 'execution' | 'psychology' | 'risk' | 'news' | 'prep';
}

interface NewsEvent {
  id: string; name: string; time: string; impact: 'high' | 'medium' | 'low'; currency: string;
}

interface TradePlan {
  id?: string;
  market_bias: string; focus: string; secondary_setup: string;
  setups_to_trade: string[]; session: string; confidence: number;
  volatility: string; news_impact: string;
  checklist: ChecklistItem[];
  news_events: NewsEvent[];
  avoid_before_news: boolean; wait_after_news: number;
  max_daily_loss: number | null; max_risk_per_trade: number | null;
  daily_target: number | null; max_trades: number | null;
  max_consec_losses: number; account_protection: boolean;
  stop_on_rule_break: boolean;
  emotion: string; mental_state: string; sleep_quality: string;
  discipline_score: number; psych_notes: string;
  notes: string; ai_analysis: Record<string, any>;
  updated_at?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const BIAS_OPTIONS = [
  { value:'bullish', label:'Bullish', icon:TrendingUp,   color:'text-emerald-400', bg:'bg-emerald-500/10', border:'border-emerald-500/25', dot:'bg-emerald-500' },
  { value:'bearish', label:'Bearish', icon:TrendingDown, color:'text-red-400',     bg:'bg-red-500/10',     border:'border-red-500/25',     dot:'bg-red-500' },
  { value:'neutral', label:'Neutral', icon:Minus,        color:'text-white/60',    bg:'bg-white/5',         border:'border-white/15',        dot:'bg-white/40' },
  { value:'ranging', label:'Ranging', icon:BarChart2,    color:'text-amber-400',   bg:'bg-amber-500/10',   border:'border-amber-500/25',    dot:'bg-amber-500' },
];

const SESSIONS = ['London','New York','Asia','London/NY Overlap','Pre-Market'];

const EMOTIONS = [
  { value:'focused',    label:'Focused',    icon:'🎯', color:'text-emerald-400' },
  { value:'confident',  label:'Confident',  icon:'💪', color:'text-blue-400' },
  { value:'anxious',    label:'Anxious',    icon:'😰', color:'text-amber-400' },
  { value:'tired',      label:'Tired',      icon:'😴', color:'text-slate-400' },
  { value:'excited',    label:'Excited',    icon:'🔥', color:'text-orange-400' },
  { value:'uncertain',  label:'Uncertain',  icon:'🤔', color:'text-purple-400' },
  { value:'calm',       label:'Calm',       icon:'🧘', color:'text-cyan-400' },
  { value:'frustrated', label:'Frustrated', icon:'😤', color:'text-red-400' },
];

const CAT_CONFIG = {
  execution:  { label:'Execution',  color:'text-violet-400',  bg:'bg-violet-500/10',  border:'border-violet-500/20' },
  psychology: { label:'Psychology', color:'text-pink-400',    bg:'bg-pink-500/10',    border:'border-pink-500/20' },
  risk:       { label:'Risk',       color:'text-red-400',     bg:'bg-red-500/10',     border:'border-red-500/20' },
  news:       { label:'News',       color:'text-amber-400',   bg:'bg-amber-500/10',   border:'border-amber-500/20' },
  prep:       { label:'Prep',       color:'text-blue-400',    bg:'bg-blue-500/10',    border:'border-blue-500/20' },
};

const DEFAULT_CHECKLIST: ChecklistItem[] = [
  { id:'1', text:'Define market bias and key levels',   done:false, category:'prep' },
  { id:'2', text:'Set max daily loss limit',            done:false, category:'risk' },
  { id:'3', text:'Wait for setup confirmation signal',  done:false, category:'execution' },
  { id:'4', text:'Check economic calendar for news',    done:false, category:'news' },
  { id:'5', text:'Review yesterday\'s mistakes',        done:false, category:'psychology' },
];

const IMPACT_NEWS = [
  { name:'NFP',            impact:'high'   as const, currency:'USD', defaultTime:'13:30' },
  { name:'CPI',            impact:'high'   as const, currency:'USD', defaultTime:'13:30' },
  { name:'FOMC',           impact:'high'   as const, currency:'USD', defaultTime:'19:00' },
  { name:'Interest Rates', impact:'high'   as const, currency:'USD', defaultTime:'14:00' },
  { name:'GDP',            impact:'medium' as const, currency:'USD', defaultTime:'13:30' },
  { name:'Unemployment',   impact:'medium' as const, currency:'USD', defaultTime:'13:30' },
  { name:'Retail Sales',   impact:'medium' as const, currency:'USD', defaultTime:'13:30' },
  { name:'PMI',            impact:'medium' as const, currency:'USD', defaultTime:'14:45' },
];

const IMPACT_COLOR = {
  high:'text-red-400 bg-red-500/10 border-red-500/20',
  medium:'text-amber-400 bg-amber-500/10 border-amber-500/20',
  low:'text-blue-400 bg-blue-500/10 border-blue-500/20',
};

const EMPTY_PLAN: TradePlan = {
  market_bias:'neutral', focus:'', secondary_setup:'',
  setups_to_trade:['',''], session:'', confidence:60,
  volatility:'normal', news_impact:'none',
  checklist: DEFAULT_CHECKLIST, news_events:[],
  avoid_before_news:false, wait_after_news:15,
  max_daily_loss:null, max_risk_per_trade:null,
  daily_target:null, max_trades:null, max_consec_losses:2,
  account_protection:true, stop_on_rule_break:true,
  emotion:'focused', mental_state:'', sleep_quality:'good',
  discipline_score:7, psych_notes:'', notes:'', ai_analysis:{},
};

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, icon: Icon, color='text-violet-400', children, defaultOpen=true }: {
  title: string; icon: React.ElementType; color?: string;
  children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-white/[0.06] last:border-0">
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-6 py-4 hover:bg-white/[0.02] transition-colors group">
        <div className="flex items-center gap-2.5">
          <div className={`w-6 h-6 rounded-lg bg-white/[0.04] flex items-center justify-center`}>
            <Icon className={`h-3.5 w-3.5 ${color}`} />
          </div>
          <p className="text-xs font-black text-white/70 uppercase tracking-widest">{title}</p>
        </div>
        {open ? <ChevronUp className="h-3.5 w-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
               : <ChevronDown className="h-3.5 w-3.5 text-white/20 group-hover:text-white/40 transition-colors" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }}
            exit={{ height:0, opacity:0 }} transition={{ duration:0.22, ease:[0.22,1,0.36,1] }}
            className="overflow-hidden">
            <div className="px-6 pb-5">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }: { value:boolean; onChange:(v:boolean)=>void; label:string }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`flex items-center gap-2.5 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-all ${
        value ? 'bg-violet-500/12 border-violet-500/25 text-violet-300' : 'border-white/[0.08] text-white/35 hover:text-white/55 hover:border-white/15'
      }`}>
      <div className={`w-8 h-4 rounded-full border transition-all ${value ? 'bg-violet-600 border-violet-500' : 'bg-white/10 border-white/15'}`}>
        <div className={`w-3 h-3 rounded-full bg-white shadow transition-transform mt-0.5 ${value ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
      </div>
      {label}
    </button>
  );
}

// ── AI Analysis (via Lovable AI edge function) ────────────────────────────────
async function generateAIAnalysis(plan: TradePlan): Promise<Record<string,any>> {
  try {
    const { data, error } = await supabase.functions.invoke('trade-plan-analysis', {
      body: { plan },
    });
    if (error) throw error;
    return data ?? {};
  } catch (e) {
    return {
      readiness_score: 65, discipline_score: 70, risk_score: 60,
      warnings: ['Could not generate AI analysis'],
      suggestions: ['Ensure risk management is set', 'Complete the checklist before trading'],
      verdict: 'Proceed with caution',
    };
  }
}

// ── Score circle ──────────────────────────────────────────────────────────────
function ScoreCircle({ value, label, color }: { value:number; label:string; color:string }) {
  const r = 22; const circ = 2*Math.PI*r;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-14 h-14 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
          <circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={circ} strokeDashoffset={circ*(1-value/100)} strokeLinecap="round"
            style={{ transition:'stroke-dashoffset 1s ease' }} />
        </svg>
        <span className="text-sm font-black text-white">{value}</span>
      </div>
      <p className="text-[9px] font-semibold text-white/30 uppercase tracking-wider">{label}</p>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TradePlanWorkspace() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];

  const [plan,      setPlan]      = useState<TradePlan>(EMPTY_PLAN);
  const [planId,    setPlanId]    = useState<string|null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [newTask,   setNewTask]   = useState('');
  const [newTaskCat,setNewTaskCat]= useState<ChecklistItem['category']>('execution');
  const [addingTask,setAddingTask]= useState(false);
  const [dragItem,  setDragItem]  = useState<string|null>(null);
  const [newsFilter,setNewsFilter]= useState<'high'|'medium'|'low'|'all'>('all');
  const autoSaveTimer = useRef<any>(null);

  // ── Session info ──────────────────────────────────────────────────────────
  const sessionInfo = (() => {
    const h = new Date().getUTCHours();
    if (h >= 8  && h < 12) return { label:'London Open',    dot:'bg-emerald-400', active:true };
    if (h >= 12 && h < 17) return { label:'NY Session',     dot:'bg-violet-400',  active:true };
    if (h >= 17 && h < 22) return { label:'NY Close',       dot:'bg-amber-400',   active:true };
    if (h >= 22 || h < 3)  return { label:'Asia Open',      dot:'bg-blue-400',    active:true };
    return { label:'Market Closed', dot:'bg-white/20', active:false };
  })();

  const dateLabel = new Date().toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('trade_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_date', today)
        .maybeSingle();
      if (data) {
        setPlanId(data.id);
        const checklist = Array.isArray((data as any).checklist) && (data as any).checklist.length
          ? (data as any).checklist
          : DEFAULT_CHECKLIST;
        const setups = Array.isArray(data.setups_to_trade) && data.setups_to_trade.length >= 2
          ? data.setups_to_trade
          : [data.setups_to_trade?.[0] ?? '', data.setups_to_trade?.[1] ?? ''];
        setPlan({ ...EMPTY_PLAN, ...(data as any), checklist, setups_to_trade: setups });
      }
      setLoading(false);
    };
    load();
  }, [user, today]);

  // ── Update helper ─────────────────────────────────────────────────────────
  const set = useCallback(<K extends keyof TradePlan>(key: K, value: TradePlan[K]) => {
    setPlan(p => ({ ...p, [key]: value }));
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const save = useCallback(async (planData: TradePlan) => {
    if (!user) return;
    setSaving(true);
    try {
      const { id, updated_at, ...rest } = planData;
      const payload: any = {
        ...rest, user_id: user.id, plan_date: today,
        name: planData.market_bias,
        updated_at: new Date().toISOString(),
      };
      if (planId) {
        await supabase.from('trade_plans').update(payload).eq('id', planId);
      } else {
        const { data } = await supabase.from('trade_plans').insert(payload).select('id').single();
        if (data?.id) setPlanId(data.id);
      }
    } finally {
      setSaving(false);
    }
  }, [user, today, planId]);

  // ── Auto-save (debounced) ─────────────────────────────────────────────────
  useEffect(() => {
    if (loading) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => save(plan), 2000);
    return () => clearTimeout(autoSaveTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, loading]);

  // ── Checklist ─────────────────────────────────────────────────────────────
  const toggleTask = (id: string) => {
    set('checklist', plan.checklist.map(i => i.id===id ? {...i, done:!i.done} : i));
  };
  const deleteTask = (id: string) => {
    set('checklist', plan.checklist.filter(i => i.id!==id));
  };
  const addTask = () => {
    if (!newTask.trim()) return;
    const item: ChecklistItem = { id: crypto.randomUUID(), text:newTask.trim(), done:false, category:newTaskCat };
    set('checklist', [...plan.checklist, item]);
    setNewTask(''); setAddingTask(false);
  };

  const doneCount  = plan.checklist.filter(i=>i.done).length;
  const totalCount = plan.checklist.length;
  const progress   = totalCount > 0 ? Math.round((doneCount/totalCount)*100) : 0;

  // ── AI analysis ───────────────────────────────────────────────────────────
  const runAI = async () => {
    setAnalyzing(true);
    const result = await generateAIAnalysis(plan);
    const next = { ...plan, ai_analysis: result };
    setPlan(next);
    await save(next);
    setAnalyzing(false);
    toast({ title:'AI analysis complete' });
  };

  // ── Drag reorder ──────────────────────────────────────────────────────────
  const handleDragStart = (id: string) => setDragItem(id);
  const handleDrop      = (id: string) => {
    if (!dragItem || dragItem===id) return;
    const from = plan.checklist.findIndex(i=>i.id===dragItem);
    const to   = plan.checklist.findIndex(i=>i.id===id);
    const next = [...plan.checklist];
    next.splice(to, 0, next.splice(from,1)[0]);
    set('checklist', next);
    setDragItem(null);
  };

  const bias    = BIAS_OPTIONS.find(b=>b.value===plan.market_bias) ?? BIAS_OPTIONS[2];
  const ai      = plan.ai_analysis as any;

  if (loading) return (
    <div className="max-w-3xl mx-auto space-y-3">
      {[1,2,3,4].map(i=><div key={i} className="h-20 rounded-2xl bg-white/[0.03] animate-pulse"/>)}
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-0">

      {/* ── TOP HEADER ── */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-white">Trade Plan</h2>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-xs text-white/30">{dateLabel}</p>
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${sessionInfo.active ? 'text-white/60' : 'text-white/25'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${sessionInfo.dot} ${sessionInfo.active ? 'animate-pulse' : ''}`} />
              {sessionInfo.label}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all ${
            progress===100 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/[0.03] border-white/[0.08] text-white/40'
          }`}>
            <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:0.5,ease:[0.22,1,0.36,1]}}
                className={`h-full rounded-full ${progress===100?'bg-emerald-500':'bg-violet-500'}`}/>
            </div>
            {progress}%
          </div>

          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${bias.bg} ${bias.border} ${bias.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${bias.dot}`}/>
            {bias.label}
          </div>

          <button onClick={runAI} disabled={analyzing}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-violet-500/25 bg-violet-500/10 text-violet-400 text-xs font-bold hover:bg-violet-500/15 transition-all disabled:opacity-50">
            <Sparkles className={`h-3.5 w-3.5 ${analyzing?'animate-spin':''}`}/>
            {analyzing ? 'Analyzing...' : 'AI Analysis'}
          </button>

          <button onClick={() => save(plan)} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50">
            <Save className="h-3.5 w-3.5"/>
            {saving ? 'Saving...' : 'Save Plan'}
          </button>
        </div>
      </div>

      {/* ── MAIN CARD ── */}
      <div className="rounded-3xl border border-white/[0.08] bg-white/[0.02] overflow-hidden shadow-2xl shadow-black/30">

        {/* ── AI PANEL ── */}
        <AnimatePresence>
          {ai?.verdict && (
            <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}}
              className="overflow-hidden border-b border-violet-500/20 bg-gradient-to-r from-violet-600/8 via-violet-500/4 to-transparent">
              <div className="px-6 py-4">
                <div className="flex items-start gap-4">
                  <div className="flex items-center gap-4">
                    <ScoreCircle value={ai.readiness_score??65} label="Readiness" color="#7c3aed"/>
                    <ScoreCircle value={ai.discipline_score??70} label="Discipline" color="#10b981"/>
                    <ScoreCircle value={ai.risk_score??60}       label="Risk Mgmt"  color="#f59e0b"/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1.5 rounded-full mb-2 ${
                      ai.verdict==='Ready to trade' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : ai.verdict==='Do not trade today' ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    }`}>
                      <Sparkles className="h-3 w-3"/>
                      AI: {ai.verdict}
                    </div>
                    {(ai.warnings??[]).length > 0 && (
                      <div className="space-y-1 mb-2">
                        {(ai.warnings??[]).map((w:string,i:number) => (
                          <p key={i} className="text-[11px] text-amber-400/70 flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3 flex-shrink-0"/> {w}
                          </p>
                        ))}
                      </div>
                    )}
                    {(ai.suggestions??[]).length > 0 && (
                      <div className="space-y-1">
                        {(ai.suggestions??[]).slice(0,2).map((s:string,i:number) => (
                          <p key={i} className="text-[11px] text-violet-300/70 flex items-center gap-1.5">
                            <Zap className="h-3 w-3 flex-shrink-0"/> {s}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── SECTION 1: MARKET OVERVIEW ── */}
        <Section title="Market Overview" icon={Activity} color="text-violet-400">
          <div className="mb-5">
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2.5">Market Bias</p>
            <div className="flex gap-2 flex-wrap">
              {BIAS_OPTIONS.map(b => {
                const Icon = b.icon;
                return (
                  <button key={b.value} onClick={() => set('market_bias', b.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition-all ${
                      plan.market_bias===b.value ? `${b.bg} ${b.border} ${b.color} shadow-md` : 'border-white/[0.07] text-white/25 hover:border-white/[0.15] hover:text-white/60'
                    }`}>
                    <Icon className="h-4 w-4"/> {b.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Session Focus</p>
            <textarea value={plan.focus} onChange={e => set('focus', e.target.value)}
              placeholder="e.g. Bullish continuation on NAS100, watching key 20,000 level for pullback entry..."
              rows={2}
              className="w-full text-sm text-white/80 placeholder:text-white/20 bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 focus:outline-none focus:border-violet-500/40 resize-none transition-colors" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Main Setup</p>
              <input value={plan.setups_to_trade[0]??''} onChange={e => set('setups_to_trade',[e.target.value,plan.setups_to_trade[1]??''])}
                placeholder="e.g. Pullback to 20 EMA"
                className="w-full text-sm text-white/80 placeholder:text-white/20 bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-500/40 transition-colors" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Secondary Setup</p>
              <input value={plan.setups_to_trade[1]??''} onChange={e => set('setups_to_trade',[plan.setups_to_trade[0]??'',e.target.value])}
                placeholder="e.g. Opening Range Breakout"
                className="w-full text-sm text-white/80 placeholder:text-white/20 bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-500/40 transition-colors" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Session</p>
              <select value={plan.session} onChange={e => set('session',e.target.value)}
                className="w-full text-sm text-white/70 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 focus:outline-none focus:border-violet-500/40 transition-colors cursor-pointer">
                <option value="">Select...</option>
                {SESSIONS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Confidence — {plan.confidence}%</p>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-[10px] text-white/20">0</span>
                <input type="range" min="0" max="100" value={plan.confidence} onChange={e => set('confidence',Number(e.target.value))}
                  className="flex-1 accent-violet-500 h-1.5 rounded-full" />
                <span className="text-[10px] text-white/20">100</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Volatility</p>
              <div className="flex gap-1.5">
                {['low','normal','high'].map(v => (
                  <button key={v} onClick={() => set('volatility',v)}
                    className={`flex-1 py-2 rounded-xl border text-[10px] font-bold capitalize transition-all ${
                      plan.volatility===v
                        ? v==='high' ? 'bg-red-500/15 border-red-500/25 text-red-400'
                        : v==='low'  ? 'bg-blue-500/15 border-blue-500/25 text-blue-400'
                        : 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400'
                        : 'border-white/[0.07] text-white/25 hover:bg-white/[0.04]'
                    }`}>{v}</button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── SECTION 2: CHECKLIST ── */}
        <Section title="Execution Checklist" icon={Check} color="text-emerald-400">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-2 bg-white/[0.05] rounded-full overflow-hidden">
              <motion.div initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:0.5,ease:[0.22,1,0.36,1]}}
                className={`h-full rounded-full transition-colors ${progress===100?'bg-emerald-500':'bg-violet-500'}`}/>
            </div>
            <span className={`text-xs font-black flex-shrink-0 ${progress===100?'text-emerald-400':'text-white/40'}`}>{doneCount}/{totalCount}</span>
          </div>

          <div className="space-y-1.5 mb-3">
            {plan.checklist.map(item => {
              const cat = CAT_CONFIG[item.category];
              return (
                <div key={item.id}
                  draggable onDragStart={()=>handleDragStart(item.id)}
                  onDragOver={e=>e.preventDefault()} onDrop={()=>handleDrop(item.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border group transition-all cursor-grab active:cursor-grabbing ${
                    item.done ? 'bg-emerald-500/6 border-emerald-500/12' : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.10]'
                  }`}>
                  <GripVertical className="h-3.5 w-3.5 text-white/15 flex-shrink-0" />
                  <button onClick={()=>toggleTask(item.id)}
                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      item.done ? 'bg-emerald-500 border-emerald-500' : 'border-white/20 hover:border-white/40'
                    }`}>
                    <AnimatePresence>
                      {item.done && <motion.div initial={{scale:0}} animate={{scale:1}} exit={{scale:0}}>
                        <Check className="h-3 w-3 text-white" strokeWidth={3}/>
                      </motion.div>}
                    </AnimatePresence>
                  </button>
                  <span className={`flex-1 text-xs font-medium transition-all ${item.done?'text-emerald-400/60 line-through':'text-white/70'}`}>{item.text}</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${cat.bg} ${cat.border} ${cat.color} opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0`}>
                    {cat.label}
                  </span>
                  <button onClick={()=>deleteTask(item.id)} className="opacity-0 group-hover:opacity-100 text-white/15 hover:text-red-400 transition-all text-xs flex-shrink-0">
                    <X className="h-3.5 w-3.5"/>
                  </button>
                </div>
              );
            })}
          </div>

          <AnimatePresence>
            {addingTask ? (
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden">
                <div className="flex gap-2 items-start mt-2">
                  <div className="flex-1 space-y-2">
                    <input autoFocus value={newTask} onChange={e=>setNewTask(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter')addTask();if(e.key==='Escape')setAddingTask(false);}}
                      placeholder="Add task..."
                      className="w-full text-sm text-white placeholder:text-white/20 bg-white/[0.04] border border-white/[0.10] rounded-xl px-4 py-2.5 focus:outline-none focus:border-violet-500/40"/>
                    <div className="flex gap-1.5 flex-wrap">
                      {(Object.keys(CAT_CONFIG) as ChecklistItem['category'][]).map(c => {
                        const cfg = CAT_CONFIG[c];
                        return (
                          <button key={c} onClick={() => setNewTaskCat(c)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                              newTaskCat===c ? `${cfg.bg} ${cfg.border} ${cfg.color}` : 'border-white/[0.07] text-white/25 hover:bg-white/[0.04]'
                            }`}>{cfg.label}</button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={addTask} className="px-3 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-black hover:bg-violet-500 transition-colors">Add</button>
                    <button onClick={()=>setAddingTask(false)} className="px-2.5 py-2.5 rounded-xl border border-white/[0.08] text-white/30 hover:bg-white/[0.04]"><X className="h-3.5 w-3.5"/></button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <button onClick={()=>setAddingTask(true)}
                className="flex items-center gap-2 text-xs text-white/25 hover:text-white/60 transition-colors mt-1 px-1">
                <Plus className="h-3.5 w-3.5"/> Add task
              </button>
            )}
          </AnimatePresence>
        </Section>

        {/* ── SECTION 3: NEWS ── */}
        <Section title="News & Economic Events" icon={AlertTriangle} color="text-amber-400" defaultOpen={false}>
          <div className="flex flex-wrap gap-2 mb-5">
            <Toggle value={plan.avoid_before_news} onChange={v=>set('avoid_before_news',v)} label="Avoid before news" />
            {plan.avoid_before_news && (
              <div className="flex items-center gap-2 text-xs text-white/40">
                Wait <input type="number" value={plan.wait_after_news} onChange={e=>set('wait_after_news',Number(e.target.value))}
                  className="w-14 text-center bg-white/[0.04] border border-white/[0.09] rounded-lg px-2 py-1 text-white focus:outline-none focus:border-violet-500/40"
                /> min after
              </div>
            )}
          </div>

          <div className="flex gap-1.5 mb-4">
            {(['all','high','medium','low'] as const).map(f => (
              <button key={f} onClick={()=>setNewsFilter(f)}
                className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold capitalize transition-all ${
                  newsFilter===f
                    ? f==='high'   ? 'bg-red-500/15 border-red-500/25 text-red-400'
                    : f==='medium' ? 'bg-amber-500/15 border-amber-500/25 text-amber-400'
                    : f==='low'    ? 'bg-blue-500/15 border-blue-500/25 text-blue-400'
                    : 'bg-violet-500/15 border-violet-500/25 text-violet-400'
                    : 'border-white/[0.07] text-white/25 hover:bg-white/[0.04]'
                }`}>{f}</button>
            ))}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {IMPACT_NEWS.filter(n=>newsFilter==='all'||n.impact===newsFilter).map(n => {
              const isAdded = plan.news_events.some((e:any)=>e.name===n.name);
              const ic = IMPACT_COLOR[n.impact];
              return (
                <button key={n.name} onClick={()=>{
                  if (isAdded) set('news_events', plan.news_events.filter((e:any)=>e.name!==n.name));
                  else set('news_events', [...plan.news_events, {id:crypto.randomUUID(),name:n.name,time:n.defaultTime,impact:n.impact,currency:n.currency}]);
                }}
                  className={`p-3 rounded-xl border text-left transition-all ${isAdded ? ic : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                  <p className={`text-xs font-black ${isAdded ? '' : 'text-white/50'}`}>{n.name}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="h-3 w-3 text-white/25 flex-shrink-0"/>
                    <span className="text-[10px] text-white/30">{n.defaultTime} UTC</span>
                  </div>
                  <p className="text-[9px] text-white/25 mt-0.5">{n.currency}</p>
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── SECTION 4: RISK ── */}
        <Section title="Risk Management" icon={Shield} color="text-red-400">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label:'Max Daily Loss', key:'max_daily_loss',  unit:'$',    color:'text-red-400' },
              { label:'Risk/Trade',     key:'max_risk_per_trade', unit:'%', color:'text-amber-400' },
              { label:'Daily Target',   key:'daily_target',    unit:'$',    color:'text-emerald-400' },
              { label:'Max Trades',     key:'max_trades',      unit:'',     color:'text-white' },
            ].map(f => (
              <div key={f.key} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05] transition-colors">
                <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider mb-2">{f.label}</p>
                <div className="flex items-baseline gap-1">
                  <input type="number" value={(plan as any)[f.key] ?? ''}
                    onChange={e=>set(f.key as keyof TradePlan, (e.target.value ? Number(e.target.value) : null) as any)}
                    placeholder="—"
                    className={`w-full text-xl font-black bg-transparent border-0 outline-none focus:ring-0 p-0 placeholder:text-white/15 ${f.color}`}/>
                  {f.unit && <span className="text-xs text-white/25 flex-shrink-0">{f.unit}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-[9px] text-white/25 uppercase tracking-wider mb-2">Max Consec. Losses</p>
              <div className="flex items-center gap-2">
                <button onClick={()=>set('max_consec_losses',Math.max(1,(plan.max_consec_losses??2)-1))} className="w-6 h-6 rounded-lg bg-white/[0.04] text-white/40 hover:bg-white/[0.08] text-sm font-bold flex items-center justify-center">−</button>
                <span className="text-lg font-black text-white flex-1 text-center">{plan.max_consec_losses}</span>
                <button onClick={()=>set('max_consec_losses',Math.min(10,(plan.max_consec_losses??2)+1))} className="w-6 h-6 rounded-lg bg-white/[0.04] text-white/40 hover:bg-white/[0.08] text-sm font-bold flex items-center justify-center">+</button>
              </div>
            </div>
            <div className="space-y-2">
              <Toggle value={plan.account_protection} onChange={v=>set('account_protection',v)} label="Account protection" />
              <Toggle value={plan.stop_on_rule_break} onChange={v=>set('stop_on_rule_break',v)} label="Stop on rule break" />
            </div>
          </div>
        </Section>

        {/* ── SECTION 5: PSYCHOLOGY ── */}
        <Section title="Psychology & Mental State" icon={Brain} color="text-pink-400" defaultOpen={false}>
          <div className="mb-5">
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-3">Current Emotion</p>
            <div className="grid grid-cols-4 gap-2">
              {EMOTIONS.map(e => (
                <button key={e.value} onClick={()=>set('emotion',e.value)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    plan.emotion===e.value ? `bg-pink-500/10 border-pink-500/20 ${e.color}` : 'border-white/[0.06] text-white/25 hover:bg-white/[0.04] hover:border-white/[0.12]'
                  }`}>
                  <span className="text-lg">{e.icon}</span>
                  <span className="text-[9px]">{e.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Sleep Quality</p>
              <div className="flex gap-1.5">
                {[{v:'poor',icon:Moon,c:'text-red-400'},{v:'ok',icon:Coffee,c:'text-amber-400'},{v:'good',icon:Sun,c:'text-emerald-400'},{v:'great',icon:Battery,c:'text-blue-400'}].map(s => {
                  const Icon = s.icon;
                  return (
                    <button key={s.v} onClick={()=>set('sleep_quality',s.v)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border text-[9px] font-bold capitalize transition-all ${
                        plan.sleep_quality===s.v ? `bg-white/[0.06] border-white/[0.15] ${s.c}` : 'border-white/[0.06] text-white/25 hover:bg-white/[0.04]'
                      }`}>
                      <Icon className={`h-3.5 w-3.5 ${plan.sleep_quality===s.v?s.c:''}`}/>{s.v}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/25 uppercase tracking-wider mb-2">Discipline — {plan.discipline_score}/10</p>
              <div className="flex items-center gap-2 pt-2">
                <span className="text-[10px] text-white/20">1</span>
                <input type="range" min="1" max="10" value={plan.discipline_score} onChange={e=>set('discipline_score',Number(e.target.value))}
                  className="flex-1 accent-pink-500 h-1.5 rounded-full"/>
                <span className="text-[10px] text-white/20">10</span>
              </div>
            </div>
          </div>

          <textarea value={plan.psych_notes??''} onChange={e=>set('psych_notes',e.target.value)}
            placeholder="How are you feeling about today's session? Any mental blockers?"
            rows={2}
            className="w-full text-sm text-white/70 placeholder:text-white/20 bg-white/[0.03] border border-white/[0.07] rounded-xl px-4 py-3 focus:outline-none focus:border-pink-500/30 resize-none transition-colors"/>
        </Section>

        {/* ── SECTION 6: NOTES ── */}
        <Section title="Session Notes" icon={Edit3} color="text-cyan-400">
          <div className="relative">
            <textarea value={plan.notes??''} onChange={e=>set('notes',e.target.value)}
              placeholder="Key levels, trade ideas, observations, reminders for today..."
              rows={6}
              className="w-full text-sm text-white/70 placeholder:text-white/15 bg-transparent border-0 outline-none resize-none focus:ring-0 leading-relaxed"/>
            <div className="absolute bottom-0 right-0 flex items-center gap-2">
              {saving && <span className="text-[10px] text-violet-400/50 animate-pulse">Saving...</span>}
              <span className="text-[10px] text-white/10">{(plan.notes??'').length} chars</span>
            </div>
          </div>
        </Section>

      </div>

      <div className="flex items-center justify-center gap-2 pt-2 pb-4">
        <div className={`w-1.5 h-1.5 rounded-full ${saving?'bg-violet-500 animate-pulse':'bg-white/10'}`}/>
        <span className="text-[10px] text-white/15">{saving ? 'Auto-saving...' : 'All changes saved automatically'}</span>
      </div>
    </div>
  );
}
