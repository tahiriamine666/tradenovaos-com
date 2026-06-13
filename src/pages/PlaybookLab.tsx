import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  Plus, Search, X, Edit3, Trash2, Layers, Check,
  Save, RefreshCw, BarChart2,
} from 'lucide-react';

interface Playbook {
  id: string;
  user_id: string;
  title: string;
  name?: string;
  description?: string;
  strategy_type?: string;
  emoji?: string;
  color?: string;
  tags?: string[];
  pairs?: string[];
  sessions?: string[];
  rules?: string;
  entry_rules?: string;
  exit_rules?: string;
  risk_rules?: string;
  invalidation?: string;
  conditions?: string;
  target_rr?: number;
  risk_percent?: number;
  rules_array?: string[];
  entry_checklist?: any[];
  exit_checklist?: any[];
  status?: string;
  created_at: string;
  updated_at?: string;
}

const EMOJIS   = ['🎯','📈','⚡','🛡️','🔥','💎','🏆','🌊','⚔️','🎲'];
const COLORS   = ['violet','emerald','blue','amber','red','teal'];
const TYPES    = ['ICT','SMC','Price Action','Scalping','Swing','Breakout','Reversal','Custom'];
const SESSIONS = ['London','New York','Asian','LDN/NY Overlap'];
const PAIRS    = ['NAS100','XAUUSD','EURUSD','GBPUSD','US30','ES','USDJPY'];

const dotColor = (c?: string) =>
  c==='violet'?'bg-violet-500':c==='emerald'?'bg-emerald-500':c==='blue'?'bg-blue-500':
  c==='amber'?'bg-amber-500':c==='red'?'bg-red-500':c==='teal'?'bg-teal-500':'bg-violet-500';

// ── Empty state ───────────────────────────────────────────────────────────────
function PlaybookEmpty({ onNew }: { onNew: ()=>void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-border flex items-center justify-center mb-4">
        <Layers className="h-6 w-6 text-muted-foreground/30" strokeWidth={1.5}/>
      </div>
      <p className="text-sm font-semibold text-foreground mb-1">Select a playbook</p>
      <p className="text-xs text-muted-foreground mb-5 max-w-[240px] leading-relaxed">
        Choose a playbook from the sidebar or create a new one to define your trading system.
      </p>
      <button onClick={onNew}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold shadow-sm shadow-violet-500/20 transition-all">
        <Plus className="h-3.5 w-3.5"/> New Playbook
      </button>
    </div>
  );
}

// ── Detail view ───────────────────────────────────────────────────────────────
function PlaybookDetail({ pb, trades, onEdit, onDelete }: {
  pb: Playbook; trades: any[]; onEdit: ()=>void; onDelete: (id:string)=>void;
}) {
  const [tab, setTab] = useState<'overview'|'rules'|'checklist'|'stats'>('overview');

  const linkedTrades = trades.filter(t =>
    t.playbook_id === pb.id ||
    (t.setup && pb.title && t.setup.toLowerCase().includes(pb.title.toLowerCase().split(' ')[0]))
  );
  const wins = linkedTrades.filter(t => (t.result ?? t.pnl ?? 0) > 0);
  const winRate = linkedTrades.length > 0 ? Math.round((wins.length / linkedTrades.length) * 100) : 0;
  const totalPnl = linkedTrades.reduce((s,t) => s + (t.result ?? t.pnl ?? 0), 0);
  const rrTrades = linkedTrades.filter(t => t.rr > 0);
  const avgRR = rrTrades.length > 0 ? (rrTrades.reduce((s,t)=>s+(t.rr??0),0)/rrTrades.length).toFixed(1) : '—';

  const rules = (pb.rules_array ?? []) as string[];
  const entryChecklist = (pb.entry_checklist ?? []) as any[];
  const exitChecklist  = (pb.exit_checklist  ?? []) as any[];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl flex-shrink-0">{pb.emoji ?? '🎯'}</span>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{pb.title ?? pb.name}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[pb.strategy_type, pb.sessions?.[0]].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
              <Edit3 className="h-3.5 w-3.5"/> Edit
            </button>
            <button onClick={()=>onDelete(pb.id)}
              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all">
              <Trash2 className="h-3.5 w-3.5"/>
            </button>
          </div>
        </div>

        <div className="flex gap-2 mt-3 flex-wrap">
          {pb.target_rr && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400">
              1:{pb.target_rr} R:R
            </span>
          )}
          {pb.risk_percent && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              {pb.risk_percent}% risk
            </span>
          )}
          {pb.pairs?.map(p => (
            <span key={p} className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted border border-border text-muted-foreground">
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="flex border-b border-border px-6 flex-shrink-0">
        {(['overview','rules','checklist','stats'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)}
            className={`px-3 py-3 text-xs font-semibold capitalize border-b-2 transition-all -mb-px mr-1 ${
              tab===t ? 'border-violet-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <AnimatePresence mode="wait">
          {tab === 'overview' && (
            <motion.div key="ov" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  {label:'Trades',  val: linkedTrades.length > 0 ? String(linkedTrades.length) : '—', color: 'text-foreground'},
                  {label:'Win rate',val: linkedTrades.length > 0 ? `${winRate}%` : '—', color: winRate>=50?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400'},
                  {label:'Avg R:R', val: avgRR==='—'?'—':`1:${avgRR}`, color:'text-foreground'},
                ].map(s => (
                  <div key={s.label} className="rounded-xl border border-border bg-muted/20 p-3.5 text-center">
                    <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {pb.description && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-foreground/75 leading-relaxed">{pb.description}</p>
                </div>
              )}

              {pb.conditions && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Market Conditions</p>
                  <p className="text-sm text-foreground/75 leading-relaxed">{pb.conditions}</p>
                </div>
              )}

              {pb.invalidation && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Invalidation</p>
                  <div className="rounded-xl bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 px-4 py-3">
                    <p className="text-sm text-red-700 dark:text-red-400 leading-relaxed">{pb.invalidation}</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {tab === 'rules' && (
            <motion.div key="ru" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-5">
              {pb.entry_rules && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Entry rules</p>
                  <div className="rounded-xl border border-border bg-muted/10 px-4 py-3">
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-mono">{pb.entry_rules}</p>
                  </div>
                </div>
              )}
              {pb.exit_rules && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Exit rules</p>
                  <div className="rounded-xl border border-border bg-muted/10 px-4 py-3">
                    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap font-mono">{pb.exit_rules}</p>
                  </div>
                </div>
              )}
              {rules.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rule list</p>
                  <div className="space-y-0">
                    {rules.map((rule, i) => (
                      <div key={i} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                        <div className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-violet-600 dark:text-violet-400" strokeWidth={3}/>
                        </div>
                        <p className="text-sm text-foreground/80 leading-snug">{rule}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!pb.entry_rules && !pb.exit_rules && rules.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No rules defined yet.</p>
                  <button onClick={onEdit} className="mt-2 text-xs text-violet-500 hover:opacity-70">+ Add rules</button>
                </div>
              )}
            </motion.div>
          )}

          {tab === 'checklist' && (
            <motion.div key="ch" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-5">
              {[{label:'Entry checklist', items: entryChecklist},{label:'Exit checklist', items: exitChecklist}].map(sec => (
                sec.items.length > 0 && (
                  <div key={sec.label}>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{sec.label}</p>
                    <div className="space-y-0">
                      {sec.items.map((item: any, i: number) => (
                        <div key={i} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                          <div className="w-4 h-4 rounded border-2 border-border flex-shrink-0"/>
                          <p className="text-sm text-foreground/80">{item.text ?? item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              ))}
              {entryChecklist.length === 0 && exitChecklist.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No checklist items yet.</p>
                </div>
              )}
            </motion.div>
          )}

          {tab === 'stats' && (
            <motion.div key="st" initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-5">
              {linkedTrades.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart2 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" strokeWidth={1.5}/>
                  <p className="text-sm text-muted-foreground">No trades linked to this playbook yet.</p>
                  <p className="text-xs text-muted-foreground mt-1">Tag trades with this setup name to see stats.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {label:'Total trades', val:String(linkedTrades.length)},
                      {label:'Win rate',     val:`${winRate}%`, color:winRate>=50?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400'},
                      {label:'Total P&L',    val:`${totalPnl>=0?'+':'-'}$${Math.abs(totalPnl).toFixed(0)}`, color:totalPnl>=0?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400'},
                      {label:'Avg R:R',      val:avgRR==='—'?'—':`1:${avgRR}`},
                    ].map(s => (
                      <div key={s.label} className="rounded-xl border border-border bg-muted/20 p-4">
                        <p className={`text-2xl font-bold ${s.color ?? 'text-foreground'}`}>{s.val}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent trades</p>
                    <div className="space-y-0">
                      {linkedTrades.slice(0,8).map(t => {
                        const pnl = t.result ?? t.pnl ?? 0;
                        return (
                          <div key={t.id} className="flex items-center gap-3 py-2.5 border-b border-border last:border-0">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${pnl>0?'bg-emerald-500':pnl<0?'bg-red-500':'bg-muted-foreground'}`}/>
                            <span className="text-xs font-medium text-foreground w-16 flex-shrink-0">{t.pair ?? t.symbol}</span>
                            <span className="text-xs text-muted-foreground flex-1">{t.trade_date}</span>
                            <span className={`text-xs font-bold tabular-nums ${pnl>0?'text-emerald-600 dark:text-emerald-400':'text-red-600 dark:text-red-400'}`}>
                              {pnl>0?'+':''}{pnl.toFixed(0)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Checklist editor field (own component so useState isn't called in a loop) ─
function ChecklistField({ field, form, setForm }: {
  field: 'entry_checklist'|'exit_checklist';
  form: Partial<Playbook>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Playbook>>>;
}) {
  const items = (form[field] as any[]) ?? [];
  const [inp, setInp] = useState('');
  const addItem = () => {
    if (!inp.trim()) return;
    setForm(f => ({ ...f, [field]: [...((f[field] as any[]) ?? []), { text: inp.trim() }] }));
    setInp('');
  };
  return (
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {field==='entry_checklist'?'Entry checklist':'Exit checklist'}
      </p>
      <div className="flex gap-2 mb-2">
        <input value={inp} onChange={e=>setInp(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addItem()}
          placeholder="Add item..."
          className="flex-1 text-sm bg-background border border-border rounded-xl px-4 py-2 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-violet-500/50"/>
        <button onClick={addItem} className="px-3 rounded-xl bg-muted border border-border hover:bg-muted/70 transition-colors">
          <Plus className="h-4 w-4 text-muted-foreground"/>
        </button>
      </div>
      <div className="space-y-1">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/10 text-xs">
            <div className="w-4 h-4 rounded border-2 border-border flex-shrink-0"/>
            <span className="flex-1 text-foreground/80">{item.text ?? item}</span>
            <button onClick={()=>setForm(f=>({...f,[field]:((f[field] as any[])??[]).filter((_,idx)=>idx!==i)}))}
              className="text-muted-foreground/40 hover:text-red-500 transition-colors">
              <X className="h-3 w-3"/>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Create / edit form ────────────────────────────────────────────────────────
function PlaybookForm({ pb, onSave, onCancel }: {
  pb: Playbook | null; onSave: (d: Partial<Playbook>)=>Promise<void>; onCancel: ()=>void;
}) {
  const [form, setForm] = useState<Partial<Playbook>>(pb ?? {
    emoji:'🎯', color:'violet', strategy_type:'ICT',
    rules_array:[], tags:[], pairs:[], sessions:[],
    entry_checklist:[], exit_checklist:[],
    target_rr:2, risk_percent:0.5,
  });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'overview'|'rules'|'checklist'>('overview');
  const [ruleInput, setRuleInput] = useState('');

  const isNew = !pb?.id;

  const save = async () => {
    if (!form.title?.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const addRule = () => {
    if (!ruleInput.trim()) return;
    setForm(f=>({...f, rules_array:[...(f.rules_array??[]), ruleInput.trim()]}));
    setRuleInput('');
  };

  const toggle = (field: keyof Playbook, val: string) => {
    const cur = (form[field] as string[]) ?? [];
    setForm(f=>({...f, [field]: cur.includes(val) ? cur.filter(v=>v!==val) : [...cur, val]}));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl">{form.emoji}</span>
          <p className="text-sm font-bold text-foreground">{form.title || (isNew ? 'New Playbook' : 'Edit Playbook')}</p>
        </div>
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors">
          <X className="h-4 w-4"/>
        </button>
      </div>

      <div className="flex border-b border-border px-6 flex-shrink-0">
        {(['overview','rules','checklist'] as const).map(t => (
          <button key={t} onClick={()=>setTab(t)}
            className={`px-3 py-3 text-xs font-semibold capitalize border-b-2 transition-all -mb-px mr-1 ${tab===t?'border-violet-500 text-foreground':'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {tab === 'overview' && (<>
          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Icon</p>
              <div className="flex flex-wrap gap-1.5">
                {EMOJIS.map(e=>(
                  <button key={e} onClick={()=>setForm(f=>({...f,emoji:e}))}
                    className={`w-9 h-9 rounded-xl border text-base flex items-center justify-center transition-all ${form.emoji===e?'border-violet-400 dark:border-violet-500/50 bg-violet-50 dark:bg-violet-500/10':'border-border hover:border-border/70 bg-background'}`}>
                    {e}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c=>(
                  <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                    className={`w-7 h-7 rounded-lg border-2 transition-all ${form.color===c?'border-foreground scale-110':'border-transparent opacity-70 hover:opacity-100'} ${dotColor(c)}`}/>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Title *</p>
            <input value={form.title??''} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
              placeholder="e.g. London FVG Reversal"
              className="w-full text-sm bg-background border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-violet-500/50"/>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</p>
            <textarea value={form.description??''} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
              placeholder="When and why you use this setup..." rows={3}
              className="w-full text-sm bg-background border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-violet-500/50 resize-none"/>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Strategy type</p>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map(t=>(
                <button key={t} onClick={()=>setForm(f=>({...f,strategy_type:t}))}
                  className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${form.strategy_type===t?'bg-violet-600 border-violet-600 text-white':'border-border text-muted-foreground hover:text-foreground'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Target R:R</p>
              <input type="number" step="0.5" min="0.5" value={form.target_rr??''} onChange={e=>setForm(f=>({...f,target_rr:parseFloat(e.target.value)||0}))}
                placeholder="2.0"
                className="w-full text-sm bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-violet-500/50"/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Risk %</p>
              <input type="number" step="0.25" min="0.1" value={form.risk_percent??''} onChange={e=>setForm(f=>({...f,risk_percent:parseFloat(e.target.value)||0}))}
                placeholder="0.5"
                className="w-full text-sm bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-violet-500/50"/>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Sessions</p>
            <div className="flex flex-wrap gap-1.5">
              {SESSIONS.map(s=>(
                <button key={s} onClick={()=>toggle('sessions',s)}
                  className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${(form.sessions??[]).includes(s)?'bg-violet-600 border-violet-600 text-white':'border-border text-muted-foreground hover:text-foreground'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Instruments</p>
            <div className="flex flex-wrap gap-1.5">
              {PAIRS.map(p=>(
                <button key={p} onClick={()=>toggle('pairs',p)}
                  className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${(form.pairs??[]).includes(p)?'bg-violet-600 border-violet-600 text-white':'border-border text-muted-foreground hover:text-foreground'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        </>)}

        {tab === 'rules' && (<>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Entry rules</p>
            <textarea value={form.entry_rules??''} onChange={e=>setForm(f=>({...f,entry_rules:e.target.value}))}
              placeholder={"1. Wait for liquidity sweep\n2. Confirm MSS on 5M\n3. Enter at 50% of FVG..."} rows={5}
              className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:border-violet-500/50 resize-none font-mono"/>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Exit rules</p>
            <textarea value={form.exit_rules??''} onChange={e=>setForm(f=>({...f,exit_rules:e.target.value}))}
              placeholder={"1. TP at next liquidity pool\n2. Move to BE at 1R\n3. Trail stop above OBs..."} rows={4}
              className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:border-violet-500/50 resize-none font-mono"/>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Invalidation</p>
            <textarea value={form.invalidation??''} onChange={e=>setForm(f=>({...f,invalidation:e.target.value}))}
              placeholder="Setup is invalid if..." rows={3}
              className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:border-violet-500/50 resize-none"/>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Quick rule builder</p>
            <div className="flex gap-2 mb-2">
              <input value={ruleInput} onChange={e=>setRuleInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addRule()}
                placeholder="Type a rule and press Enter..."
                className="flex-1 text-sm bg-background border border-border rounded-xl px-4 py-2 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-violet-500/50"/>
              <button onClick={addRule} className="px-3 rounded-xl bg-muted border border-border hover:bg-muted/70 transition-colors">
                <Plus className="h-4 w-4 text-muted-foreground"/>
              </button>
            </div>
            <div className="space-y-1">
              {((form.rules_array??[]) as string[]).map((r,i)=>(
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/20 border border-border text-xs">
                  <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" strokeWidth={3}/>
                  <span className="flex-1 text-foreground/80">{r}</span>
                  <button onClick={()=>setForm(f=>({...f,rules_array:(f.rules_array??[]).filter((_,idx)=>idx!==i)}))} className="text-muted-foreground/40 hover:text-red-500 transition-colors">
                    <X className="h-3 w-3"/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {tab === 'checklist' && (
          <div className="space-y-5">
            {(['entry_checklist','exit_checklist'] as const).map(field => (
              <ChecklistField key={field} field={field} form={form} setForm={setForm} />
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-border flex-shrink-0 flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted transition-all">
          Cancel
        </button>
        <button onClick={save} disabled={saving||!form.title?.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold shadow-md shadow-violet-500/20 transition-all disabled:opacity-40">
          {saving?<><RefreshCw className="h-4 w-4 animate-spin"/> Saving...</>:<><Save className="h-4 w-4"/> {isNew?'Create':'Save'}</>}
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlaybookLab() {
  const { user } = useAuth();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [trades,    setTrades]    = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState<Playbook|null>(null);
  const [mode,      setMode]      = useState<'idle'|'view'|'edit'|'new'>('idle');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [pbRes, trRes] = await Promise.all([
      supabase.from('playbooks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('trades').select('id,pair,symbol,result,pnl,rr,trade_date,setup,playbook_id').eq('user_id', user.id),
    ]);
    if (!pbRes.error) setPlaybooks((pbRes.data ?? []) as unknown as Playbook[]);
    if (!trRes.error) setTrades(trRes.data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setSelected(null); setMode('new'); };

  const handleSave = async (form: Partial<Playbook>) => {
    if (!user) return;
    if (selected?.id && mode === 'edit') {
      const { error } = await supabase.from('playbooks')
        .update({ ...form, updated_at: new Date().toISOString() } as any)
        .eq('id', selected.id).eq('user_id', user.id);
      if (error) { toast({ title:'Save failed', description:error.message, variant:'destructive' }); return; }
      toast({ title:'✅ Playbook updated' });
      setMode('view');
    } else {
      const { data, error } = await supabase.from('playbooks')
        .insert([{ ...form, user_id: user.id, rules_array: form.rules_array ?? [] } as any])
        .select().single();
      if (error) { toast({ title:'Create failed', description:error.message, variant:'destructive' }); return; }
      toast({ title:'✅ Playbook created' });
      setSelected(data as unknown as Playbook);
      setMode('view');
    }
    load();
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Delete this playbook?')) return;
    await supabase.from('playbooks').delete().eq('id', id).eq('user_id', user.id);
    setSelected(null); setMode('idle');
    load();
    toast({ title:'Deleted' });
  };

  const filtered = playbooks.filter(pb =>
    !search || [pb.title, pb.name, pb.description, pb.strategy_type]
      .filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full min-h-[600px] rounded-2xl border border-border overflow-hidden bg-card">
      {/* LEFT — sidebar */}
      <aside className="w-[240px] flex-shrink-0 border-r border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <p className="text-sm font-bold text-foreground">Playbooks</p>
          <button onClick={openNew} className="w-7 h-7 rounded-lg border border-border bg-background flex items-center justify-center hover:bg-muted transition-colors">
            <Plus className="h-3.5 w-3.5 text-muted-foreground"/>
          </button>
        </div>

        <div className="px-3 py-2.5 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/40 pointer-events-none"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40"/>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1.5 px-2">
          {loading ? (
            <div className="space-y-1 p-1">
              {[1,2,3].map(i=><div key={i} className="h-12 bg-muted/30 rounded-lg animate-pulse"/>)}
            </div>
          ) : filtered.length === 0 && !search ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <Layers className="h-8 w-8 text-muted-foreground/20 mb-2" strokeWidth={1.5}/>
              <p className="text-xs text-muted-foreground">No playbooks yet</p>
              <button onClick={openNew} className="mt-3 text-xs text-violet-500 hover:opacity-70 transition-opacity">
                + Create first
              </button>
            </div>
          ) : (
            filtered.map(pb => (
              <button key={pb.id}
                onClick={() => { setSelected(pb); setMode('view'); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5 ${
                  selected?.id === pb.id
                    ? 'bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20'
                    : 'hover:bg-muted/50'
                }`}>
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColor(pb.color)}`}/>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold truncate ${selected?.id===pb.id?'text-violet-700 dark:text-violet-400':'text-foreground'}`}>
                    {pb.title ?? pb.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                    {[pb.strategy_type, pb.pairs?.[0]].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* RIGHT — detail / edit panel */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {selected && mode === 'view' ? (
          <PlaybookDetail pb={selected} trades={trades} onEdit={()=>setMode('edit')} onDelete={handleDelete}/>
        ) : (selected && mode === 'edit') || mode === 'new' ? (
          <PlaybookForm pb={mode==='new'?null:selected} onSave={handleSave} onCancel={()=>setMode(selected?'view':'idle')}/>
        ) : (
          <PlaybookEmpty onNew={openNew}/>
        )}
      </main>
    </div>
  );
}
