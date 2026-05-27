import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Play, Pause, SkipForward, SkipBack, ChevronFirst, ChevronLast,
  Plus, X, Check, Edit, Trash2, Save, Sparkles, RefreshCw,
  BarChart3, Target, AlertCircle, ChevronDown, ChevronUp,
  Calendar, Search, Filter, Maximize2, RotateCcw, Copy,
  TrendingUp, TrendingDown, Clock, Tag, FileText, Brain,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Execution {
  id: string; time: string; type: 'entry' | 'partial' | 'stop_loss' | 'take_profit' | 'exit';
  price: number; size: number; rr: number | null; pnl: number | null; notes: string;
}

interface ReplaySession {
  id: string; user_id: string; title: string;
  pair: string; session_name: string; replay_date: string;
  timeframe: string; setup: string; playbook_id: string | null;
  tags: string[]; mistakes: string[]; result: number; outcome: string;
  rr: number | null; risk_amount: number | null; entry_price: number | null;
  stop_loss: number | null; take_profit: number | null; duration_min: number | null;
  bias: string; volatility: string; news_context: string;
  what_went_well: string | null; notes: string | null;
  discipline_score: number; execution_score: number;
  executions: Execution[]; ai_review: Record<string, any>;
  instrument: string; status: string; created_at: string; updated_at: string;
}

interface FormData {
  title: string; pair: string; replay_date: string; session_name: string;
  timeframe: string; setup: string; playbook_id: string;
  outcome: 'win' | 'loss' | 'breakeven'; result: string; rr: string;
  entry_price: string; stop_loss: string; take_profit: string;
  risk_amount: string; duration_min: string; bias: string;
  volatility: string; news_context: string; what_went_well: string;
  notes: string; tags: string[]; mistakes: string[];
  discipline_score: number; execution_score: number;
  executions: Execution[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
const TIMEFRAMES  = ['1','3','5','15','30','60','240','D','W'];
const SESSIONS    = ['London','New York','Asia','London/NY Overlap','Pre-Market'];
const COMMON_PAIRS= ['NAS100','US30','XAUUSD','EURUSD','GBPUSD','BTCUSD','SP500','SPY'];
const SPEEDS      = ['1x','2x','5x','10x','20x','30x'];
const MISTAKES    = ['Early Entry','No BOS','No Confirmation','FOMO','Moved SL','Oversized','No Plan','Chased Price','Broke Rules','Early Exit'];
const EXEC_TYPES  = ['entry','partial','stop_loss','take_profit','exit'] as const;
const EXEC_LABELS: Record<string, { label: string; color: string }> = {
  entry:       { label:'Entry',       color:'bg-violet-600 text-white' },
  partial:     { label:'Partial',     color:'bg-emerald-600 text-white' },
  stop_loss:   { label:'Stop Loss',   color:'bg-red-600 text-white' },
  take_profit: { label:'Take Profit', color:'bg-emerald-500 text-white' },
  exit:        { label:'Exit',        color:'bg-white/20 text-white dark:text-white' },
};

const EMPTY_FORM: FormData = {
  title:'', pair:'NAS100', replay_date: new Date().toISOString().split('T')[0],
  session_name:'', timeframe:'60', setup:'', playbook_id:'', outcome:'win',
  result:'', rr:'', entry_price:'', stop_loss:'', take_profit:'',
  risk_amount:'', duration_min:'', bias:'', volatility:'', news_context:'',
  what_went_well:'', notes:'', tags:[], mistakes:[],
  discipline_score:7, execution_score:7, executions:[],
};

const ease = [0.22,1,0.36,1];

function fmtMoney(v:number){ return `${v>=0?'+':''}$${Math.abs(v).toFixed(2)}`; }
function fmtDate(d:string){ return new Date(d+'T12:00:00').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}); }

// ── TradingView Chart ─────────────────────────────────────────────────────────
function TVChart({ symbol, timeframe, fullscreen }: { symbol:string; timeframe:string; fullscreen?:boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true, symbol, interval: timeframe,
      timezone:'Etc/UTC', theme:'dark', style:'1', locale:'en',
      enable_publishing:false, hide_top_toolbar:false,
      hide_legend:false, save_image:true,
      support_host:'https://www.tradingview.com',
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
  return <div ref={ref} style={{ height:'100%', width:'100%', minHeight: fullscreen?'calc(100vh - 120px)':'400px' }}/>;
}

// ── New Session Modal ─────────────────────────────────────────────────────────
function NewSessionModal({ onClose, onSaved, editSession, playbooks }: {
  onClose:()=>void; onSaved:()=>void;
  editSession?: ReplaySession|null;
  playbooks:{id:string;title:string}[];
}) {
  const { user } = useAuth();
  const [form,   setForm]   = useState<FormData>(editSession ? {
    title:            editSession.title,
    pair:             editSession.pair ?? 'NAS100',
    replay_date:      editSession.replay_date ?? new Date().toISOString().split('T')[0],
    session_name:     editSession.session_name ?? '',
    timeframe:        editSession.timeframe ?? '60',
    setup:            editSession.setup ?? '',
    playbook_id:      editSession.playbook_id ?? '',
    outcome:          (editSession.outcome as any) ?? 'win',
    result:           editSession.result?.toString() ?? '',
    rr:               editSession.rr?.toString() ?? '',
    entry_price:      editSession.entry_price?.toString() ?? '',
    stop_loss:        editSession.stop_loss?.toString() ?? '',
    take_profit:      editSession.take_profit?.toString() ?? '',
    risk_amount:      editSession.risk_amount?.toString() ?? '',
    duration_min:     editSession.duration_min?.toString() ?? '',
    bias:             editSession.bias ?? '',
    volatility:       editSession.volatility ?? '',
    news_context:     editSession.news_context ?? '',
    what_went_well:   editSession.what_went_well ?? '',
    notes:            editSession.notes ?? '',
    tags:             editSession.tags ?? [],
    mistakes:         editSession.mistakes ?? [],
    discipline_score: editSession.discipline_score ?? 7,
    execution_score:  editSession.execution_score ?? 7,
    executions:       (editSession.executions as Execution[]) ?? [],
  } : EMPTY_FORM);
  const [saving,   setSaving]   = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [newExec,  setNewExec]  = useState<Partial<Execution>>({ type:'entry', time:'09:30', price:0, size:1 });
  const set = (k:keyof FormData, v:any) => setForm(f=>({...f,[k]:v}));

  const addTag = () => { const t=tagInput.trim().toLowerCase(); if(t && !form.tags.includes(t)) set('tags',[...form.tags,t]); setTagInput(''); };
  const toggleMistake = (m:string) => set('mistakes', form.mistakes.includes(m)?form.mistakes.filter(x=>x!==m):[...form.mistakes,m]);
  const addExec = () => {
    if (!newExec.price || !newExec.type) return;
    const exec:Execution = { id:crypto.randomUUID(), time:newExec.time??'09:30', type:newExec.type as any, price:Number(newExec.price), size:Number(newExec.size??1), rr:newExec.rr??null, pnl:newExec.pnl??null, notes:newExec.notes??'' };
    set('executions',[...form.executions,exec]);
    setNewExec({ type:'partial', time:'', price:0, size:1 });
  };

  const handleSave = async () => {
    if (!user || !form.pair.trim()) { toast({title:'Pair is required',variant:'destructive'}); return; }
    setSaving(true);
    try {
      const payload = {
        user_id:          user.id,
        title:            form.title || `${form.pair} Replay ${fmtDate(form.replay_date)}`,
        instrument:       form.pair,
        pair:             form.pair.trim().toUpperCase(),
        replay_date:      form.replay_date,
        session_name:     form.session_name||null,
        timeframe:        form.timeframe,
        setup:            form.setup||null,
        playbook_id:      form.playbook_id||null,
        outcome:          form.outcome,
        result:           Number(form.result)||0,
        rr:               form.rr?Number(form.rr):null,
        entry_price:      form.entry_price?Number(form.entry_price):null,
        stop_loss:        form.stop_loss?Number(form.stop_loss):null,
        take_profit:      form.take_profit?Number(form.take_profit):null,
        risk_amount:      form.risk_amount?Number(form.risk_amount):null,
        duration_min:     form.duration_min?Number(form.duration_min):null,
        bias:             form.bias||null,
        volatility:       form.volatility||null,
        news_context:     form.news_context||null,
        what_went_well:   form.what_went_well||null,
        notes:            form.notes||null,
        tags:             form.tags,
        mistakes:         form.mistakes,
        discipline_score: form.discipline_score,
        execution_score:  form.execution_score,
        executions:       form.executions,
        status:           'completed',
        updated_at:       new Date().toISOString(),
      };
      if (editSession) {
        const {error} = await supabase.from('replay_sessions').update(payload).eq('id',editSession.id);
        if (error) throw error;
        toast({title:'✅ Session updated'});
      } else {
        const {error} = await supabase.from('replay_sessions').insert({...payload,created_at:new Date().toISOString()});
        if (error) throw error;
        toast({title:'✅ Replay session saved'});
      }
      onSaved(); onClose();
    } catch(e:any){ toast({title:'Error',description:e.message,variant:'destructive'}); }
    finally { setSaving(false); }
  };

  const inputCls = "w-full text-sm bg-background border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40 transition-colors";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{opacity:0,y:32}} animate={{opacity:1,y:0}} exit={{opacity:0,y:32}}
        transition={{type:'spring',damping:28,stiffness:300}}
        className="relative w-full sm:max-w-2xl bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{maxHeight:'92vh'}} onClick={e=>e.stopPropagation()}>

        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div>
            <p className="text-sm font-black text-foreground">{editSession?'Edit Session':'Log Replay Session'}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Record a trade replay for review and AI analysis</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4"/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Pair / Symbol *</label>
              <input value={form.pair} onChange={e=>set('pair',e.target.value.toUpperCase())} placeholder="NAS100" className={inputCls}/>
              <div className="flex gap-1.5 flex-wrap mt-2">
                {COMMON_PAIRS.map(p=>(
                  <button key={p} onClick={()=>set('pair',p)}
                    className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all ${form.pair===p?'bg-violet-500/15 border-violet-500/25 text-violet-500 dark:text-violet-400':'border-border text-muted-foreground hover:bg-muted/60'}`}>{p}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Replay Date</label>
                <input type="date" value={form.replay_date} onChange={e=>set('replay_date',e.target.value)} className={inputCls}/>
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Session</label>
                <select value={form.session_name} onChange={e=>set('session_name',e.target.value)} className={inputCls+' cursor-pointer'}>
                  <option value="">Select...</option>
                  {SESSIONS.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Timeframe */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Timeframe</label>
            <div className="flex gap-2 flex-wrap">
              {TIMEFRAMES.map(tf=>(
                <button key={tf} onClick={()=>set('timeframe',tf)}
                  className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${form.timeframe===tf?'bg-violet-600 border-violet-600 text-white shadow-md':'border-border text-muted-foreground hover:bg-muted/60'}`}>
                  {tf==='60'?'1H':tf==='240'?'4H':tf==='D'?'1D':tf==='W'?'1W':`${tf}m`}
                </button>
              ))}
            </div>
          </div>

          {/* Setup + Playbook */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Setup Name</label>
              <input value={form.setup} onChange={e=>set('setup',e.target.value)} placeholder="e.g. Liquidity Sweep" className={inputCls}/>
            </div>
            <div>
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Linked Playbook</label>
              <select value={form.playbook_id} onChange={e=>set('playbook_id',e.target.value)} className={inputCls+' cursor-pointer'}>
                <option value="">None</option>
                {playbooks.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          </div>

          {/* Outcome + P&L */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Outcome</label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {[{v:'win',l:'✅ Win',c:'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400'},
                {v:'loss',l:'❌ Loss',c:'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/30 text-red-700 dark:text-red-400'},
                {v:'breakeven',l:'➖ BE',c:'bg-muted border-border text-foreground'}].map(o=>(
                <button key={o.v} onClick={()=>set('outcome',o.v)}
                  className={`py-3 rounded-xl border text-sm font-black transition-all ${form.outcome===o.v?o.c+' shadow-md':'border-border text-muted-foreground hover:bg-muted/60'}`}>{o.l}</button>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-3">
              {[{l:'P&L ($)',k:'result',ph:'-120'},{l:'R:R',k:'rr',ph:'1.5'},{l:'Entry',k:'entry_price',ph:'411.64'},{l:'Risk ($)',k:'risk_amount',ph:'120'}].map(f=>(
                <div key={f.k}>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">{f.l}</label>
                  <input type="number" value={(form as any)[f.k]} onChange={e=>set(f.k as any,e.target.value)} placeholder={f.ph} className={inputCls}/>
                </div>
              ))}
            </div>
          </div>

          {/* SL + TP + Duration */}
          <div className="grid grid-cols-3 gap-3">
            {[{l:'Stop Loss',k:'stop_loss',ph:'411.28'},{l:'Take Profit',k:'take_profit',ph:'411.85'},{l:'Duration (min)',k:'duration_min',ph:'84'}].map(f=>(
              <div key={f.k}>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">{f.l}</label>
                <input type="number" value={(form as any)[f.k]} onChange={e=>set(f.k as any,e.target.value)} placeholder={f.ph} className={inputCls}/>
              </div>
            ))}
          </div>

          {/* Market Context */}
          <div className="grid grid-cols-3 gap-3">
            {[{l:'Bias',k:'bias',opts:['Bullish','Bearish','Neutral','Ranging']},{l:'Volatility',k:'volatility',opts:['Low','Normal','High']},{l:'News',k:'news_context',opts:[]}].map(f=>(
              <div key={f.k}>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">{f.l}</label>
                {f.opts.length>0?(
                  <select value={(form as any)[f.k]} onChange={e=>set(f.k as any,e.target.value)} className={inputCls+' cursor-pointer'}>
                    <option value="">Select...</option>
                    {f.opts.map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                ):(
                  <input value={(form as any)[f.k]} onChange={e=>set(f.k as any,e.target.value)} placeholder="e.g. CPI 08:30" className={inputCls}/>
                )}
              </div>
            ))}
          </div>

          {/* Executions table */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Executions</label>
            {form.executions.length > 0 && (
              <div className="rounded-xl border border-border overflow-hidden mb-3">
                <table className="w-full">
                  <thead><tr className="border-b border-border bg-muted/30">
                    {['Time','Type','Price','Size','R','P&L',''].map(h=>(
                      <th key={h} className="px-3 py-2 text-left text-[9px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {form.executions.map((ex,i)=>{
                      const lbl = EXEC_LABELS[ex.type];
                      return (
                        <tr key={ex.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
                          <td className="px-3 py-2 text-xs text-muted-foreground font-mono">{ex.time}</td>
                          <td className="px-3 py-2"><span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${lbl?.color}`}>{lbl?.label}</span></td>
                          <td className="px-3 py-2 text-xs font-mono text-foreground">{ex.price}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{ex.size}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{ex.rr?`${ex.rr}R`:'—'}</td>
                          <td className="px-3 py-2 text-xs font-mono font-bold">{ex.pnl!=null?<span className={ex.pnl>=0?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400'}>{fmtMoney(ex.pnl)}</span>:'—'}</td>
                          <td className="px-3 py-2"><button onClick={()=>set('executions',form.executions.filter((_,j)=>j!==i))} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground/30 hover:text-red-500 transition-colors"><X className="h-3 w-3"/></button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {/* Add execution row */}
            <div className="flex gap-2 items-end flex-wrap">
              <div><label className="text-[9px] text-muted-foreground block mb-1">Time</label>
                <input value={newExec.time??''} onChange={e=>setNewExec(p=>({...p,time:e.target.value}))} placeholder="09:45" className="w-20 text-xs bg-background border border-border rounded-lg px-2.5 py-2 text-foreground focus:outline-none focus:border-violet-500/40 font-mono"/></div>
              <div><label className="text-[9px] text-muted-foreground block mb-1">Type</label>
                <select value={newExec.type} onChange={e=>setNewExec(p=>({...p,type:e.target.value as any}))} className="text-xs bg-background border border-border rounded-lg px-2.5 py-2 text-foreground focus:outline-none cursor-pointer">
                  {EXEC_TYPES.map(t=><option key={t} value={t}>{EXEC_LABELS[t]?.label}</option>)}
                </select></div>
              <div><label className="text-[9px] text-muted-foreground block mb-1">Price</label>
                <input type="number" value={newExec.price??''} onChange={e=>setNewExec(p=>({...p,price:Number(e.target.value)}))} placeholder="411.64" className="w-24 text-xs bg-background border border-border rounded-lg px-2.5 py-2 text-foreground focus:outline-none focus:border-violet-500/40 font-mono"/></div>
              <div><label className="text-[9px] text-muted-foreground block mb-1">P&L</label>
                <input type="number" value={newExec.pnl??''} onChange={e=>setNewExec(p=>({...p,pnl:Number(e.target.value)}))} placeholder="+210" className="w-20 text-xs bg-background border border-border rounded-lg px-2.5 py-2 text-foreground focus:outline-none focus:border-violet-500/40 font-mono"/></div>
              <button onClick={addExec} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-500 transition-colors"><Plus className="h-3.5 w-3.5"/>Add</button>
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-4">
            {[{l:`Discipline — ${form.discipline_score}/10`,k:'discipline_score',v:form.discipline_score},{l:`Execution — ${form.execution_score}/10`,k:'execution_score',v:form.execution_score}].map(s=>(
              <div key={s.k}><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">{s.l}</label>
                <input type="range" min="1" max="10" value={s.v} onChange={e=>set(s.k as any,Number(e.target.value))} className="w-full accent-violet-600"/></div>
            ))}
          </div>

          {/* Mistakes */}
          <div>
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2.5">Mistakes</label>
            <div className="grid grid-cols-2 gap-1.5">
              {MISTAKES.map(m=>(
                <button key={m} onClick={()=>toggleMistake(m)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium text-left transition-all ${form.mistakes.includes(m)?'bg-red-50 dark:bg-red-500/10 border-red-300 dark:border-red-500/20 text-red-700 dark:text-red-400':'border-border text-muted-foreground hover:bg-muted/60'}`}>
                  <div className={`w-3.5 h-3.5 rounded flex items-center justify-center flex-shrink-0 ${form.mistakes.includes(m)?'bg-red-500':'border border-border'}`}>
                    {form.mistakes.includes(m)&&<Check className="h-2.5 w-2.5 text-white" strokeWidth={3}/>}
                  </div>{m}
                </button>
              ))}
            </div>
          </div>

          {/* What went well + Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">What Went Well</label>
              <textarea value={form.what_went_well} onChange={e=>set('what_went_well',e.target.value)} placeholder="Good patience, waited for confirmation..." rows={3}
                className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-emerald-500/30 resize-none"/></div>
            <div><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Notes</label>
              <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} placeholder="Key observations from this replay..." rows={3}
                className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40 resize-none"/></div>
          </div>

          {/* Tags */}
          <div><label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">Tags</label>
            <div className="flex gap-2 mb-2">
              <input value={tagInput} onChange={e=>setTagInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTag()} placeholder="Add tag..." className={inputCls+' flex-1'}/>
              <button onClick={addTag} className="px-3.5 py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/20 text-violet-500 dark:text-violet-400 text-xs font-bold hover:bg-violet-500/20">+</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.tags.map(t=>(
                <span key={t} className="flex items-center gap-1 text-xs bg-muted border border-border text-muted-foreground px-2.5 py-1 rounded-full">
                  #{t}<button onClick={()=>set('tags',form.tags.filter(x=>x!==t))} className="hover:text-red-500 transition-colors">✕</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-muted transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-black transition-all shadow-lg shadow-violet-500/20 disabled:opacity-50">
            {saving?'Saving...':editSession?'✓ Update Session':'✓ Save Session'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Session Detail View ───────────────────────────────────────────────────────
function SessionDetail({ session, onBack, onEdit, onDelete, playbooks }: {
  session: ReplaySession; onBack:()=>void; onEdit:(s:ReplaySession)=>void;
  onDelete:(s:ReplaySession)=>void;
  playbooks:{id:string;title:string;entry_rules?:string}[];
}) {
  const [speed,       setSpeed]       = useState('1x');
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [activeTab,   setActiveTab]   = useState<'executions'|'notes'|'ai'>('executions');
  const [reviewing,   setReviewing]   = useState(false);
  const [aiReview,    setAiReview]    = useState<Record<string,any>>(session.ai_review ?? {});
  const isWin  = (session.result??0)>0;
  const isLoss = (session.result??0)<0;
  const linkedPb = playbooks.find(p=>p.id===session.playbook_id);
  const executions = (session.executions as Execution[]) ?? [];

  const runAI = async () => {
    setReviewing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-replay-review', {
        body: { sessionId: session.id },
      });
      if (error) throw error;
      const review = (data as any)?.review ?? {};
      setAiReview(review);
      toast({ title: '✅ AI review complete' });
    } catch (e: any) {
      toast({ title: 'AI review failed', description: e?.message, variant: 'destructive' });
    } finally {
      setReviewing(false);
    }
  };

  const tfLabel = (tf:string) => tf==='60'?'1H':tf==='240'?'4H':tf==='D'?'1D':tf==='W'?'1W':`${tf}m`;

  return (
    <div className="flex gap-0 h-full" style={{minHeight:'calc(100vh - 200px)'}}>

      {/* ── LEFT SIDEBAR ── */}
      <div className="w-56 flex-shrink-0 border-r border-border bg-card overflow-y-auto">
        <div className="p-4 space-y-5">
          {/* Back + title */}
          <div>
            <button onClick={onBack} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3">
              ← Back to sessions
            </button>
            <p className="text-sm font-black text-foreground leading-tight">{session.pair}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{session.replay_date?fmtDate(session.replay_date):''}</p>
          </div>

          {/* Price header */}
          <div className="rounded-xl bg-muted/40 border border-border p-3">
            <div className={`text-2xl font-black font-mono ${isWin?'text-emerald-600 dark:text-emerald-400':isLoss?'text-red-600 dark:text-red-400':'text-foreground/50'}`}>
              {session.entry_price??'—'}
            </div>
            <div className={`text-xs font-bold ${isWin?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>
              {fmtMoney(session.result??0)} ({session.rr?`${session.rr}R`:'—'})
            </div>
          </div>

          {/* Trade Details */}
          <div>
            <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest mb-2.5">Trade Details</p>
            <div className="space-y-2">
              {[
                {l:'Result',    v:<span className={`font-black text-xs ${isWin?'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-md':isLoss?'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-md':'text-muted-foreground'}`}>{session.outcome||'—'}</span>},
                {l:'Net P&L',   v:<span className={`font-black text-xs font-mono ${isWin?'text-emerald-600 dark:text-emerald-400':isLoss?'text-red-600 dark:text-red-400':'text-muted-foreground'}`}>{fmtMoney(session.result??0)}</span>},
                {l:'R Multiple',v:<span className={`font-mono text-xs ${isWin?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>{session.rr?`${session.rr>0?'+':''}${session.rr}R`:'—'}</span>},
                {l:'Risk',      v:<span className="text-xs text-foreground/70">{session.risk_amount?`$${session.risk_amount} (${session.risk_amount}%)`:'—'}</span>},
                {l:'Account',   v:<span className="text-xs text-foreground/70">Main Account</span>},
                {l:'Duration',  v:<span className="text-xs text-foreground/70">{session.duration_min?`${Math.floor(session.duration_min/60)}h ${session.duration_min%60}m`:'—'}</span>},
              ].map(row=>(
                <div key={row.l} className="flex items-start justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground flex-shrink-0">{row.l}</p>
                  <div className="text-right">{row.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Setup & Playbook */}
          <div>
            <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest mb-2.5">Setup & Playbook</p>
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] text-muted-foreground">Setup</p>
                <p className="text-xs text-foreground/80 font-semibold text-right">{session.setup||'—'}</p>
              </div>
              {linkedPb && (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground">Playbook</p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold text-right">{linkedPb.title}</p>
                </div>
              )}
              <div className="flex items-start justify-between gap-2">
                <p className="text-[10px] text-muted-foreground">Session</p>
                <p className="text-xs text-foreground/70 text-right">{session.session_name||'—'}</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          {(session.tags??[]).length>0 && (
            <div>
              <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {(session.tags??[]).map(t=>(
                  <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">#{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {session.notes && (
            <div>
              <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest mb-2">Notes</p>
              <p className="text-xs text-foreground/60 leading-relaxed">{session.notes}</p>
            </div>
          )}

          {/* Market Context */}
          {(session.bias||session.volatility||session.news_context) && (
            <div>
              <p className="text-[9px] font-black text-muted-foreground/50 uppercase tracking-widest mb-2.5">Market Context</p>
              <div className="space-y-1.5">
                {session.bias && <div className="flex justify-between"><p className="text-[10px] text-muted-foreground">Bias</p><p className={`text-xs font-bold ${session.bias==='Bullish'?'text-emerald-600 dark:text-emerald-400':session.bias==='Bearish'?'text-red-600 dark:text-red-400':'text-muted-foreground'}`}>{session.bias}</p></div>}
                {session.volatility && <div className="flex justify-between"><p className="text-[10px] text-muted-foreground">Volatility</p><p className="text-xs text-foreground/70">{session.volatility}</p></div>}
                {session.news_context && <div className="flex justify-between"><p className="text-[10px] text-muted-foreground">News</p><p className="text-xs text-foreground/70">{session.news_context}</p></div>}
              </div>
            </div>
          )}

          {/* Edit + Delete */}
          <div className="flex gap-2 pt-2">
            <button onClick={()=>onEdit(session)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-muted transition-colors"><Edit className="h-3.5 w-3.5"/>Edit</button>
            <button onClick={()=>onDelete(session)} className="p-2 rounded-xl border border-red-200 dark:border-red-500/20 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><Trash2 className="h-3.5 w-3.5"/></button>
          </div>
        </div>
      </div>

      {/* ── MAIN CENTER ── */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Replay Controls */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0 flex-wrap">
          {/* Playback buttons */}
          <div className="flex items-center gap-1">
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><ChevronFirst className="h-4 w-4"/></button>
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><SkipBack className="h-4 w-4"/></button>
            <button onClick={()=>setIsPlaying(v=>!v)}
              className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg shadow-violet-500/20 transition-all">
              {isPlaying?<Pause className="h-4 w-4"/>:<Play className="h-4 w-4 ml-0.5"/>}
            </button>
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><SkipForward className="h-4 w-4"/></button>
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><ChevronLast className="h-4 w-4"/></button>
          </div>

          {/* Speed */}
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            {SPEEDS.map(s=>(
              <button key={s} onClick={()=>setSpeed(s)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all ${speed===s?'bg-violet-600 text-white shadow':'text-muted-foreground hover:text-foreground'}`}>
                {s}
              </button>
            ))}
          </div>

          {/* Progress scrubber */}
          <div className="flex-1 flex items-center gap-3 min-w-0">
            <input type="range" min="0" max="100" defaultValue="45"
              className="flex-1 accent-violet-600 min-w-0"/>
            <span className="text-xs font-mono text-muted-foreground flex-shrink-0">
              {session.replay_date?new Date(session.replay_date+'T09:45:39').toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'09:45:39'} / {session.duration_min?`${Math.floor(session.duration_min/60)}:${String(session.duration_min%60).padStart(2,'0')}:00`:'—'}
            </span>
          </div>

          {/* Date + Timeframe */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 border border-border rounded-xl px-3 py-2 text-xs text-foreground/70">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground"/>
              {session.replay_date?fmtDate(session.replay_date):'—'}
            </div>
            <span className="text-xs font-bold text-muted-foreground bg-muted border border-border px-2.5 py-2 rounded-xl">{tfLabel(session.timeframe??'60')}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 bg-[#131722] relative" style={{minHeight:'380px'}}>
          <TVChart symbol={session.pair??'NASDAQ:NDX'} timeframe={session.timeframe??'60'}/>
        </div>

        {/* Bottom: executions table + market context */}
        <div className="flex-shrink-0 border-t border-border bg-card">
          <div className="flex gap-0">

            {/* Tabs + table */}
            <div className="flex-1 min-w-0">
              <div className="flex gap-0 border-b border-border">
                {(['executions','notes','ai'] as const).map(t=>(
                  <button key={t} onClick={()=>setActiveTab(t)}
                    className={`px-5 py-3 text-xs font-bold capitalize border-b-2 transition-all -mb-px ${activeTab===t?'border-violet-500 text-violet-600 dark:text-violet-400':'border-transparent text-muted-foreground hover:text-foreground'}`}>
                    {t==='ai'?'AI Review':t==='executions'?'Executions':'Notes'}
                  </button>
                ))}
              </div>

              <div className="p-3" style={{maxHeight:'200px',overflowY:'auto'}}>
                {activeTab==='executions' && (
                  executions.length>0?(
                    <table className="w-full">
                      <thead><tr>{['Time','Type','Price','Size','R','P&L','Notes'].map(h=>(
                        <th key={h} className="px-3 py-2 text-left text-[9px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}</tr></thead>
                      <tbody>
                        {executions.map(ex=>{
                          const lbl=EXEC_LABELS[ex.type];
                          return(
                            <tr key={ex.id} className="border-t border-border/40 hover:bg-muted/20 transition-colors">
                              <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{ex.time}</td>
                              <td className="px-3 py-2"><span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${lbl?.color}`}>{lbl?.label}</span></td>
                              <td className="px-3 py-2 text-xs font-mono text-foreground font-bold">{ex.price}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground">{ex.size}</td>
                              <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{ex.rr?`${ex.rr>0?'+':''}${ex.rr}R`:'—'}</td>
                              <td className="px-3 py-2 text-xs font-mono font-bold">{ex.pnl!=null?<span className={ex.pnl>=0?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400'}>{fmtMoney(ex.pnl)}</span>:'—'}</td>
                              <td className="px-3 py-2 text-xs text-muted-foreground max-w-[150px] truncate">{ex.notes||'—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ):(
                    <p className="text-xs text-muted-foreground text-center py-6">No executions logged for this session</p>
                  )
                )}
                {activeTab==='notes' && (
                  <div className="space-y-3">
                    {session.what_went_well&&<div className="rounded-xl border border-emerald-200 dark:border-emerald-500/15 bg-emerald-50 dark:bg-emerald-500/5 p-3"><p className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400/60 uppercase tracking-wider mb-1.5 flex items-center gap-1"><Check className="h-3 w-3"/>What Went Well</p><p className="text-xs text-foreground/70 leading-relaxed">{session.what_went_well}</p></div>}
                    {(session.mistakes??[]).length>0&&<div className="rounded-xl border border-red-200 dark:border-red-500/15 bg-red-50 dark:bg-red-500/5 p-3"><p className="text-[9px] font-bold text-red-600 dark:text-red-400/60 uppercase tracking-wider mb-1.5 flex items-center gap-1"><AlertCircle className="h-3 w-3"/>Mistakes</p><div className="flex flex-wrap gap-1.5">{(session.mistakes??[]).map(m=><span key={m} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/20">{m}</span>)}</div></div>}
                    {session.notes&&<p className="text-xs text-foreground/60 leading-relaxed">{session.notes}</p>}
                  </div>
                )}
                {activeTab==='ai' && (
                  <div className="space-y-3">
                    {aiReview?.verdict?(
                      <>
                        <div className="flex items-start gap-4 flex-wrap">
                          {[{l:'Discipline',v:aiReview.discipline_score},{l:'Execution',v:aiReview.execution_score},{l:'Setup Quality',v:aiReview.setup_quality},{l:'Risk Mgmt',v:aiReview.risk_management}].filter(x=>x.v!=null).map(sc=>(
                            <div key={sc.l} className="text-center">
                              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-1">{sc.l}</p>
                              <div className="h-1 w-24 bg-muted rounded-full overflow-hidden mb-1">
                                <div className={`h-full rounded-full ${sc.v>=70?'bg-emerald-500':sc.v>=40?'bg-violet-500':'bg-red-500'}`} style={{width:`${sc.v}%`}}/>
                              </div>
                              <p className={`text-xs font-black ${sc.v>=70?'text-emerald-600 dark:text-emerald-400':sc.v>=40?'text-violet-600 dark:text-violet-400':'text-red-600 dark:text-red-400'}`}>{sc.v}%</p>
                            </div>
                          ))}
                        </div>
                        {aiReview.ai_suggestion&&<div className="rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/5 p-3"><p className="text-[9px] font-bold text-violet-600 dark:text-violet-400/60 uppercase tracking-wider mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3"/>AI Suggestion</p><p className="text-xs text-foreground/70 leading-relaxed">{aiReview.ai_suggestion}</p></div>}
                      </>
                    ):(
                      <div className="flex items-center justify-between py-3">
                        <p className="text-xs text-muted-foreground">No AI review yet</p>
                        <button onClick={runAI} disabled={reviewing} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-black hover:bg-violet-500 transition-colors disabled:opacity-50">
                          <Sparkles className={`h-3.5 w-3.5 ${reviewing?'animate-spin':''}`}/>{reviewing?'Analyzing...':'Run AI Review'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* AI Panel (right side of bottom) */}
            {aiReview?.verdict && (
              <div className="w-64 flex-shrink-0 border-l border-border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-foreground flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-violet-500"/>AI Replay Review</p>
                  <button onClick={runAI} disabled={reviewing} className="text-[9px] text-violet-500 dark:text-violet-400 hover:opacity-70 disabled:opacity-40 flex items-center gap-1">
                    <RefreshCw className={`h-3 w-3 ${reviewing?'animate-spin':''}`}/>{reviewing?'...':'Refresh'}
                  </button>
                </div>

                {/* Score circle */}
                <div className="flex items-center gap-3">
                  {(() => {
                    const v=aiReview.discipline_score??0; const r=22; const circ=2*Math.PI*r;
                    const color=v>=70?'#10b981':v>=40?'#7c3aed':'#ef4444';
                    return (
                      <div className="relative w-14 h-14 flex-shrink-0">
                        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 56 56">
                          <circle cx="28" cy="28" r={r} fill="none" strokeWidth="4" className="stroke-muted"/>
                          <motion.circle cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="4"
                            strokeDasharray={circ} initial={{strokeDashoffset:circ}} animate={{strokeDashoffset:circ*(1-v/100)}}
                            transition={{duration:1,ease}} strokeLinecap="round"/>
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-sm font-black text-foreground">{v}</span>
                        </div>
                      </div>
                    );
                  })()}
                  <div>
                    <p className="text-xs font-black text-foreground">Discipline Score</p>
                    <p className={`text-[11px] font-bold ${(aiReview.discipline_score??0)>=70?'text-emerald-600 dark:text-emerald-400':(aiReview.discipline_score??0)>=40?'text-muted-foreground':'text-red-600 dark:text-red-400'}`}>
                      {(aiReview.discipline_score??0)>=70?'Good progress!':(aiReview.discipline_score??0)>=40?'Needs work':'Struggling'}
                    </p>
                  </div>
                </div>

                {(aiReview.what_went_well??[]).length>0&&(
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">What Went Well</p>
                    {(aiReview.what_went_well??[]).map((w:string,i:number)=>(
                      <p key={i} className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-start gap-1.5"><Check className="h-3 w-3 flex-shrink-0 mt-0.5"/>{w}</p>
                    ))}
                  </div>
                )}
                {(aiReview.what_to_improve??[]).length>0&&(
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">What To Improve</p>
                    {(aiReview.what_to_improve??[]).map((w:string,i:number)=>(
                      <p key={i} className="text-[10px] text-red-600 dark:text-red-400 flex items-start gap-1.5"><X className="h-3 w-3 flex-shrink-0 mt-0.5"/>{w}</p>
                    ))}
                  </div>
                )}
                {aiReview.ai_suggestion&&(
                  <div className="rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/5 p-3">
                    <p className="text-[9px] font-bold text-violet-600 dark:text-violet-400/60 uppercase tracking-wider mb-1 flex items-center gap-1"><Sparkles className="h-3 w-3"/>AI Suggestion</p>
                    <p className="text-[10px] text-foreground/70 leading-relaxed">{aiReview.ai_suggestion}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Session Card ──────────────────────────────────────────────────────────────
function SessionCard({ session, onView, onEdit, onDelete }: {
  session:ReplaySession; onView:(s:ReplaySession)=>void;
  onEdit:(s:ReplaySession)=>void; onDelete:(s:ReplaySession)=>void;
}) {
  const isWin  = (session.result??0)>0;
  const isLoss = (session.result??0)<0;
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
      whileHover={{y:-2,transition:{duration:0.15}}}
      className="rounded-2xl border border-border bg-card overflow-hidden hover:border-border/60 hover:shadow-md transition-all cursor-pointer group"
      onClick={()=>onView(session)}>
      {/* Color bar */}
      <div className={`h-0.5 ${isWin?'bg-emerald-500':isLoss?'bg-red-500':'bg-muted-foreground/30'}`}/>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-sm font-black text-foreground">{session.pair}</p>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md capitalize ${isWin?'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400':isLoss?'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400':'bg-muted text-muted-foreground'}`}>
                {session.outcome}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{session.replay_date?fmtDate(session.replay_date):''} · {session.session_name||'—'}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className={`text-lg font-black font-mono ${isWin?'text-emerald-600 dark:text-emerald-400':isLoss?'text-red-600 dark:text-red-400':'text-muted-foreground'}`}>
              {fmtMoney(session.result??0)}
            </p>
            <p className="text-xs text-muted-foreground">{session.rr?`${session.rr}R`:'—'}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-3">
          {session.setup&&<span className="bg-muted border border-border px-2 py-0.5 rounded-md">{session.setup}</span>}
          {session.timeframe&&<span>TF: {session.timeframe==='60'?'1H':session.timeframe==='240'?'4H':session.timeframe}</span>}
          {session.duration_min&&<span className="flex items-center gap-1"><Clock className="h-3 w-3"/>{Math.floor(session.duration_min/60)}h {session.duration_min%60}m</span>}
        </div>

        {(session.mistakes??[]).length>0&&(
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(session.mistakes??[]).slice(0,3).map(m=>(
              <span key={m} className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/15 text-red-600 dark:text-red-400">{m}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {session.discipline_score>0&&(
              <div className="text-[10px] text-muted-foreground">Discipline: <span className={`font-black ${session.discipline_score>=7?'text-emerald-600 dark:text-emerald-400':session.discipline_score>=4?'text-muted-foreground':'text-red-600 dark:text-red-400'}`}>{session.discipline_score}/10</span></div>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>onEdit(session)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit className="h-3.5 w-3.5"/></button>
            <button onClick={()=>onDelete(session)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="h-3.5 w-3.5"/></button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Main ReplayStudio ─────────────────────────────────────────────────────────
export default function ReplayStudio() {
  const { user } = useAuth();
  const [sessions,    setSessions]    = useState<ReplaySession[]>([]);
  const [playbooks,   setPlaybooks]   = useState<{id:string;title:string;entry_rules?:string}[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editSession, setEditSession] = useState<ReplaySession|null>(null);
  const [viewSession, setViewSession] = useState<ReplaySession|null>(null);
  const [search,      setSearch]      = useState('');
  const [filterPair,  setFilterPair]  = useState('');
  const [filterOutcome,setFilterOutcome]=useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [sr,pb] = await Promise.all([
      supabase.from('replay_sessions').select('*').eq('user_id',user.id).order('created_at',{ascending:false}),
      supabase.from('playbooks').select('id,title,entry_rules').eq('user_id',user.id),
    ]);
    setSessions((sr.data as ReplaySession[])??[]);
    setPlaybooks(pb.data??[]);
    setLoading(false);
  },[user]);

  useEffect(()=>{load();},[load]);

  const handleDelete = async (s:ReplaySession) => {
    await supabase.from('replay_sessions').delete().eq('id',s.id);
    toast({title:'Session deleted'}); if(viewSession?.id===s.id) setViewSession(null); load();
  };
  const openEdit = (s:ReplaySession) => { setEditSession(s); setModalOpen(true); setViewSession(null); };

  const stats = useMemo(()=>{
    const wins=sessions.filter(s=>(s.result??0)>0);
    const total=sessions.reduce((sum,s)=>sum+(s.result??0),0);
    return { count:sessions.length, winRate:sessions.length>0?Math.round((wins.length/sessions.length)*100):0, total };
  },[sessions]);

  const uniquePairs = useMemo(()=>[...new Set(sessions.map(s=>s.pair).filter(Boolean))].sort(),[sessions]);
  const filtered = useMemo(()=>sessions.filter(s=>{
    const q=search.toLowerCase();
    if(q && !s.pair?.toLowerCase().includes(q) && !(s.setup??'').toLowerCase().includes(q) && !(s.session_name??'').toLowerCase().includes(q)) return false;
    if(filterPair && s.pair!==filterPair) return false;
    if(filterOutcome && s.outcome!==filterOutcome) return false;
    return true;
  }),[sessions,search,filterPair,filterOutcome]);

  if (viewSession) return (
    <SessionDetail session={viewSession} onBack={()=>setViewSession(null)} onEdit={openEdit} onDelete={handleDelete} playbooks={playbooks}/>
  );

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-black text-foreground">Replay Studio</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Review executions. Find your edge. Build discipline.</p>
        </div>
        <motion.button onClick={()=>{setEditSession(null);setModalOpen(true);}}
          whileHover={{scale:1.02}} whileTap={{scale:0.98}}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-violet-500/20 transition-all">
          <Plus className="h-4 w-4"/> Log Session
        </motion.button>
      </div>

      {!loading && sessions.length>0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {l:'Total Sessions',v:`${stats.count}`,c:'text-foreground'},
            {l:'Win Rate',      v:`${stats.winRate}%`,c:stats.winRate>=50?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400'},
            {l:'Total P&L',     v:fmtMoney(stats.total),c:stats.total>=0?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400'},
          ].map((s,i)=>(
            <div key={s.l} className="rounded-2xl border border-border bg-card px-4 py-3.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{s.l}</p>
              <p className={`text-xl font-black ${s.c}`}>{s.v}</p>
            </div>
          ))}
        </div>
      )}

      {sessions.length>0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search pair, setup, session..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40"/>
          </div>
          <select value={filterPair} onChange={e=>setFilterPair(e.target.value)} className="text-xs text-muted-foreground bg-background border border-border rounded-xl px-3 py-2 focus:outline-none cursor-pointer">
            <option value="">All Pairs</option>
            {uniquePairs.map(p=><option key={p} value={p}>{p}</option>)}
          </select>
          <select value={filterOutcome} onChange={e=>setFilterOutcome(e.target.value)} className="text-xs text-muted-foreground bg-background border border-border rounded-xl px-3 py-2 focus:outline-none cursor-pointer">
            <option value="">All Results</option>
            <option value="win">Win</option>
            <option value="loss">Loss</option>
            <option value="breakeven">Breakeven</option>
          </select>
          {(search||filterPair||filterOutcome)&&(
            <button onClick={()=>{setSearch('');setFilterPair('');setFilterOutcome('');}} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground text-xs font-semibold hover:bg-muted transition-colors">
              <RotateCcw className="h-3.5 w-3.5"/> Reset
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i=><div key={i} className="h-40 bg-muted/30 rounded-2xl animate-pulse"/>)}
        </div>
      ) : sessions.length===0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="relative mb-6">
            <div className="w-20 h-20 rounded-3xl bg-violet-500/10 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center">
              <Play className="h-9 w-9 text-violet-500 dark:text-violet-400 ml-1"/>
            </div>
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-violet-600 border-2 border-background flex items-center justify-center">
              <Plus className="h-3 w-3 text-white"/>
            </div>
          </div>
          <h3 className="text-xl font-black text-foreground mb-2">Start Your First Replay Session</h3>
          <p className="text-sm text-muted-foreground max-w-xs mb-8 leading-relaxed">Log a trade replay to review your execution, identify mistakes, and get AI-powered coaching.</p>
          <motion.button onClick={()=>setModalOpen(true)} whileHover={{scale:1.02}} whileTap={{scale:0.98}}
            className="flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500 text-white px-7 py-3.5 rounded-2xl font-black text-sm shadow-lg shadow-violet-500/20 transition-all">
            <Play className="h-4 w-4 ml-0.5"/> Log First Session
          </motion.button>
        </div>
      ) : filtered.length===0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border bg-muted/20">
          <Search className="h-8 w-8 text-muted-foreground/20 mb-3"/>
          <p className="text-sm font-bold text-foreground mb-1">No sessions match your filters</p>
          <button onClick={()=>{setSearch('');setFilterPair('');setFilterOutcome('');}} className="mt-3 text-xs text-violet-500 dark:text-violet-400 hover:opacity-70 transition-opacity">Clear filters →</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s=>(
            <SessionCard key={s.id} session={s} onView={setViewSession} onEdit={openEdit} onDelete={handleDelete}/>
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen&&(
          <NewSessionModal onClose={()=>{setModalOpen(false);setEditSession(null);}} onSaved={load} editSession={editSession} playbooks={playbooks}/>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
