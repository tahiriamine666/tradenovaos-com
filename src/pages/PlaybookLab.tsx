import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Search, X, ChevronRight, Edit3, Trash2,
  Target, CheckCircle2, Check, AlertCircle, Layers,
  TrendingUp, Clock, BarChart2, Save, RefreshCw,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
const COLORS   = ['violet','emerald','blue','amber','red','pink','teal','orange'];
const TYPES    = ['ICT','SMC','Price Action','Scalping','Swing','Breakout','Reversal','News','Custom'];
const SESSIONS = ['London','New York','Asian','London/NY Overlap'];
const PAIRS    = ['NAS100','XAUUSD','EURUSD','GBPUSD','US30','ES','USDJPY','BTCUSD'];

const COLOR_MAP: Record<string, string> = {
  violet:  'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/25 text-violet-700 dark:text-violet-400',
  emerald: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/25 text-emerald-700 dark:text-emerald-400',
  blue:    'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/25 text-blue-700 dark:text-blue-400',
  amber:   'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/25 text-amber-700 dark:text-amber-400',
  red:     'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/25 text-red-700 dark:text-red-400',
  pink:    'bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/25 text-pink-700 dark:text-pink-400',
  teal:    'bg-teal-50 dark:bg-teal-500/10 border-teal-200 dark:border-teal-500/25 text-teal-700 dark:text-teal-400',
  orange:  'bg-orange-50 dark:bg-orange-500/10 border-orange-200 dark:border-orange-500/25 text-orange-700 dark:text-orange-400',
};

// ── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onNew }: { onNew: ()=>void }) {
  return (
    <motion.div initial={{opacity:0,y:12}} animate={{opacity:1,y:0}}
      className="flex flex-col items-center justify-center py-24 text-center max-w-sm mx-auto">
      <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-border flex items-center justify-center mb-5">
        <Layers className="h-7 w-7 text-muted-foreground/30" strokeWidth={1.5}/>
      </div>
      <h3 className="text-base font-bold text-foreground mb-2">No playbooks yet</h3>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6">
        Define your trading setups, rules, and checklists. Turn your edge into a repeatable system.
      </p>
      <button onClick={onNew}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold shadow-md shadow-violet-500/20 transition-all">
        <Plus className="h-4 w-4"/> Create First Playbook
      </button>
    </motion.div>
  );
}

// ── Playbook card ────────────────────────────────────────────────────────────
function PlaybookCard({ pb, onOpen, onDelete }: {
  pb: Playbook; onOpen: ()=>void; onDelete: ()=>void;
}) {
  const colorCls = COLOR_MAP[pb.color ?? 'violet'] ?? COLOR_MAP.violet;
  const rules = pb.rules_array?.length
    ? pb.rules_array
    : pb.rules ? pb.rules.split('\n').filter(Boolean).slice(0,3) : [];

  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
      className="group relative rounded-2xl border border-border bg-card hover:border-violet-200 dark:hover:border-violet-500/30 hover:shadow-sm transition-all cursor-pointer overflow-hidden"
      onClick={onOpen}>

      {/* Top stripe */}
      <div className={`h-1 w-full ${pb.color==='violet'?'bg-violet-500':pb.color==='emerald'?'bg-emerald-500':pb.color==='blue'?'bg-blue-500':pb.color==='amber'?'bg-amber-500':pb.color==='red'?'bg-red-500':'bg-violet-500'}`}/>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-lg flex-shrink-0 ${colorCls}`}>
            {pb.emoji ?? '🎯'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground truncate">{pb.title ?? pb.name}</p>
            {pb.strategy_type && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{pb.strategy_type}</p>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all flex-shrink-0">
            <Trash2 className="h-3.5 w-3.5"/>
          </button>
        </div>

        {/* Description */}
        {pb.description && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{pb.description}</p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4 text-xs text-muted-foreground">
          {pb.target_rr && (
            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3"/> {pb.target_rr}R target</span>
          )}
          {pb.risk_percent && (
            <span className="flex items-center gap-1"><Target className="h-3 w-3"/> {pb.risk_percent}% risk</span>
          )}
          {pb.sessions?.length ? (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3"/> {pb.sessions[0]}</span>
          ) : null}
        </div>

        {/* Top rules preview */}
        {rules.length > 0 && (
          <div className="space-y-1 mb-4">
            {rules.slice(0,3).map((rule, i) => (
              <div key={i} className="flex items-start gap-2">
                <Check className="h-3 w-3 text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={3}/>
                <p className="text-[11px] text-foreground/65 leading-snug line-clamp-1">{rule}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tags */}
        {pb.tags?.length ? (
          <div className="flex gap-1.5 flex-wrap">
            {pb.tags.slice(0,3).map(tag => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                {tag}
              </span>
            ))}
          </div>
        ) : pb.pairs?.length ? (
          <div className="flex gap-1.5 flex-wrap">
            {pb.pairs.slice(0,3).map(pair => (
              <span key={pair} className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                {pair}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {new Date(pb.created_at).toLocaleDateString()}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40"/>
      </div>
    </motion.div>
  );
}

// ── Playbook drawer / detail ─────────────────────────────────────────────────
function PlaybookDrawer({ pb, onClose, onSave, onDelete }: {
  pb: Playbook | null; onClose: ()=>void;
  onSave: (data: Partial<Playbook>) => Promise<void>;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState<Partial<Playbook>>({});
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<'overview'|'rules'|'checklist'>('overview');
  const [ruleInput, setRuleInput] = useState('');

  useEffect(() => {
    setForm(pb ?? {
      emoji: '🎯', color: 'violet', strategy_type: 'ICT',
      rules_array: [], tags: [], pairs: [], sessions: [],
      entry_checklist: [], exit_checklist: [],
      target_rr: 2, risk_percent: 0.5,
    });
    setTab('overview');
  }, [pb?.id]);

  if (!pb && !form.emoji) return null;

  const isNew = !pb?.id;
  const rules = (form.rules_array ?? []) as string[];

  const addRule = () => {
    if (!ruleInput.trim()) return;
    setForm(f => ({ ...f, rules_array: [...(f.rules_array ?? []), ruleInput.trim()] }));
    setRuleInput('');
  };

  const removeRule = (i: number) => {
    setForm(f => ({ ...f, rules_array: (f.rules_array ?? []).filter((_,idx)=>idx!==i) }));
  };

  const handleSave = async () => {
    if (!form.title?.trim()) { toast({ title:'Title required', variant:'destructive' }); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const toggleTag = (arr: keyof Playbook, val: string) => {
    const current = (form[arr] as string[]) ?? [];
    const next = current.includes(val) ? current.filter(v=>v!==val) : [...current, val];
    setForm(f => ({ ...f, [arr]: next }));
  };

  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}}
        transition={{type:'spring',damping:28,stiffness:300}}
        className="fixed right-0 top-0 h-full w-full max-w-lg bg-background border-l border-border z-50 flex flex-col shadow-2xl"
        onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{form.emoji}</span>
            <div>
              <p className="text-sm font-bold text-foreground">{form.title || 'New Playbook'}</p>
              <p className="text-[11px] text-muted-foreground">{form.strategy_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isNew && (
              <button onClick={()=>onDelete(pb!.id)}
                className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors">
                <Trash2 className="h-4 w-4"/>
              </button>
            )}
            <button onClick={onClose}
              className="p-2 rounded-xl hover:bg-muted text-muted-foreground transition-colors">
              <X className="h-4 w-4"/>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {(['overview','rules','checklist'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)}
              className={`flex-1 py-3 text-xs font-bold capitalize border-b-2 transition-all -mb-px ${tab===t?'border-violet-500 text-foreground':'border-transparent text-muted-foreground hover:text-foreground'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {tab === 'overview' && (
            <>
              {/* Emoji + Color */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Emoji</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map(e => (
                      <button key={e} onClick={()=>setForm(f=>({...f,emoji:e}))}
                        className={`w-9 h-9 rounded-xl border text-lg flex items-center justify-center transition-all ${form.emoji===e?'border-violet-400 bg-violet-50 dark:bg-violet-500/10':'border-border hover:border-border/70'}`}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {COLORS.map(c => (
                      <button key={c} onClick={()=>setForm(f=>({...f,color:c}))}
                        className={`w-7 h-7 rounded-lg border-2 transition-all ${form.color===c?'border-foreground scale-110':'border-transparent'} ${c==='violet'?'bg-violet-500':c==='emerald'?'bg-emerald-500':c==='blue'?'bg-blue-500':c==='amber'?'bg-amber-500':c==='red'?'bg-red-500':c==='pink'?'bg-pink-500':c==='teal'?'bg-teal-500':'bg-orange-500'}`}/>
                    ))}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Title *</label>
                <input value={form.title??''} onChange={e=>setForm(f=>({...f,title:e.target.value}))}
                  placeholder="e.g. London FVG Reversal"
                  className="w-full text-sm bg-background border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-violet-500/50"/>
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
                <textarea value={form.description??''} onChange={e=>setForm(f=>({...f,description:e.target.value}))}
                  placeholder="Describe the setup and when to use it..."
                  rows={3}
                  className="w-full text-sm bg-background border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-violet-500/50 resize-none"/>
              </div>

              {/* Strategy Type */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Strategy Type</label>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map(t => (
                    <button key={t} onClick={()=>setForm(f=>({...f,strategy_type:t}))}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${form.strategy_type===t?'bg-violet-600 border-violet-600 text-white':'border-border text-muted-foreground hover:border-border/70 hover:text-foreground'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Risk params */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Target R:R</label>
                  <input type="number" step="0.5" min="0.5" value={form.target_rr??''}
                    onChange={e=>setForm(f=>({...f,target_rr:parseFloat(e.target.value)||0}))}
                    placeholder="2.0"
                    className="w-full text-sm bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-violet-500/50"/>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Risk %</label>
                  <input type="number" step="0.25" min="0.1" value={form.risk_percent??''}
                    onChange={e=>setForm(f=>({...f,risk_percent:parseFloat(e.target.value)||0}))}
                    placeholder="0.5"
                    className="w-full text-sm bg-background border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-violet-500/50"/>
                </div>
              </div>

              {/* Sessions */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Sessions</label>
                <div className="flex flex-wrap gap-2">
                  {SESSIONS.map(s => (
                    <button key={s} onClick={()=>toggleTag('sessions',s)}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${(form.sessions??[]).includes(s)?'bg-violet-600 border-violet-600 text-white':'border-border text-muted-foreground hover:text-foreground'}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pairs */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Instruments</label>
                <div className="flex flex-wrap gap-2">
                  {PAIRS.map(p => (
                    <button key={p} onClick={()=>toggleTag('pairs',p)}
                      className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all ${(form.pairs??[]).includes(p)?'bg-violet-600 border-violet-600 text-white':'border-border text-muted-foreground hover:text-foreground'}`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'rules' && (
            <>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Entry Rules</label>
                <textarea value={form.entry_rules??''} onChange={e=>setForm(f=>({...f,entry_rules:e.target.value}))}
                  placeholder="1. Wait for liquidity sweep&#10;2. Confirm MSS on 5M&#10;3. Enter on FVG retracement..."
                  rows={5}
                  className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-violet-500/50 resize-none font-mono leading-relaxed"/>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Exit Rules</label>
                <textarea value={form.exit_rules??''} onChange={e=>setForm(f=>({...f,exit_rules:e.target.value}))}
                  placeholder="1. TP at next liquidity&#10;2. Move to BE at 1R&#10;3. Close at session end..."
                  rows={5}
                  className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-violet-500/50 resize-none font-mono leading-relaxed"/>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Invalidation</label>
                <textarea value={form.invalidation??''} onChange={e=>setForm(f=>({...f,invalidation:e.target.value}))}
                  placeholder="Setup is invalid if..."
                  rows={3}
                  className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-violet-500/50 resize-none"/>
              </div>

              {/* Quick rule builder */}
              <div>
                <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Quick Rules List</label>
                <div className="flex gap-2 mb-2">
                  <input value={ruleInput} onChange={e=>setRuleInput(e.target.value)}
                    onKeyDown={e=>e.key==='Enter'&&addRule()}
                    placeholder="Add a rule and press Enter..."
                    className="flex-1 text-sm bg-background border border-border rounded-xl px-4 py-2 text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-violet-500/50"/>
                  <button onClick={addRule}
                    className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors">
                    <Plus className="h-4 w-4"/>
                  </button>
                </div>
                <div className="space-y-1.5">
                  {rules.map((rule, i) => (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/30 border border-border">
                      <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" strokeWidth={3}/>
                      <p className="text-xs text-foreground flex-1">{rule}</p>
                      <button onClick={()=>removeRule(i)} className="text-muted-foreground/50 hover:text-red-500 transition-colors">
                        <X className="h-3 w-3"/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'checklist' && (
            <>
              <p className="text-xs text-muted-foreground">
                Build your pre-trade checklist. Before every trade, all items must be checked.
              </p>

              {(['entry_checklist','exit_checklist'] as const).map(field => (
                <ChecklistField key={field} field={field} form={form} setForm={setForm} />
              ))}

            </>
          )}
        </div>

        {/* Save button */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0">
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold shadow-md shadow-violet-500/20 transition-all disabled:opacity-50">
            {saving ? <><RefreshCw className="h-4 w-4 animate-spin"/> Saving...</>
              : <><Save className="h-4 w-4"/> {isNew ? 'Create Playbook' : 'Save Changes'}</>}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PlaybookLab() {
  const { user } = useAuth();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState<Playbook | null>(null);
  const [showNew,   setShowNew]   = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('playbooks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setPlaybooks(data as Playbook[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (form: Partial<Playbook>) => {
    if (!user) return;
    if (selected?.id) {
      // Update
      const { error } = await supabase
        .from('playbooks')
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq('id', selected.id)
        .eq('user_id', user.id);
      if (error) { toast({ title: 'Save failed', description: error.message, variant: 'destructive' }); return; }
      toast({ title: '✅ Playbook updated' });
    } else {
      // Insert
      const { error } = await supabase
        .from('playbooks')
        .insert([{ ...form, user_id: user.id, rules_array: form.rules_array ?? [] } as any]);
      if (error) { toast({ title: 'Create failed', description: error.message, variant: 'destructive' }); return; }
      toast({ title: '✅ Playbook created' });
}

function ChecklistField({ field, form, setForm }: { field: 'entry_checklist'|'exit_checklist'; form: any; setForm: React.Dispatch<React.SetStateAction<any>> }) {
  const items = (form[field] as any[]) ?? [];
  const label = field === 'entry_checklist' ? 'Entry Checklist' : 'Exit Checklist';
  const [input, setInput] = useState('');
  const add = () => { if(input.trim()){ setForm((f:any)=>({...f,[field]:[...(f[field] as any[]??[]),{text:input.trim(),checked:false}]})); setInput(''); } };
  return (
    <div>
      <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">{label}</label>
      <div className="flex gap-2 mb-2">
        <input value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>{if(e.key==='Enter')add();}}
          placeholder="Add checklist item..."
          className="flex-1 text-sm bg-background border border-border rounded-xl px-4 py-2 text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-violet-500/50"/>
        <button onClick={add} className="px-3 py-2 rounded-xl bg-muted border border-border hover:bg-muted/70 transition-colors">
          <Plus className="h-4 w-4 text-muted-foreground"/>
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border bg-muted/20">
            <div className="w-4 h-4 rounded border-2 border-border flex-shrink-0"/>
            <p className="text-xs text-foreground flex-1">{item.text ?? item}</p>
            <button onClick={()=>setForm((f:any)=>({...f,[field]:(f[field] as any[]).filter((_:any,idx:number)=>idx!==i)}))}
              className="text-muted-foreground/40 hover:text-red-500 transition-colors">
              <X className="h-3 w-3"/>
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-[11px] text-muted-foreground text-center py-3">No items yet — add above</p>
        )}
      </div>
    </div>
  );
}
    setSelected(null);
    setShowNew(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!user || !confirm('Delete this playbook?')) return;
    await supabase.from('playbooks').delete().eq('id', id).eq('user_id', user.id);
    setSelected(null);
    load();
    toast({ title: 'Playbook deleted' });
  };

  const filtered = playbooks.filter(pb =>
    !search || [pb.title, pb.name, pb.description, pb.strategy_type]
      .filter(Boolean).join(' ').toLowerCase().includes(search.toLowerCase())
  );

  const drawerOpen = !!selected || showNew;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Playbook Lab</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Define your setups. Build your edge. Trade your system.</p>
        </div>
        <button
          onClick={() => { setSelected(null); setShowNew(true); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold shadow-md shadow-violet-500/20 transition-all">
          <Plus className="h-4 w-4"/> New Playbook
        </button>
      </div>

      {/* Search + stats */}
      {playbooks.length > 0 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search playbooks..."
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40"/>
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} playbook{filtered.length!==1?'s':''}</span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-56 bg-muted/30 rounded-2xl animate-pulse"/>)}
        </div>
      ) : filtered.length === 0 && !search ? (
        <EmptyState onNew={() => { setSelected(null); setShowNew(true); }}/>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Search className="h-8 w-8 text-muted-foreground/20 mb-3"/>
          <p className="text-sm font-medium text-foreground">No results for "{search}"</p>
          <button onClick={()=>setSearch('')} className="mt-2 text-xs text-violet-500 hover:opacity-70">Clear search</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(pb => (
            <PlaybookCard key={pb.id} pb={pb}
              onOpen={() => { setSelected(pb); setShowNew(false); }}
              onDelete={() => handleDelete(pb.id)}/>
          ))}
        </div>
      )}

      {/* Drawer */}
      {drawerOpen && (
        <PlaybookDrawer
          pb={showNew ? null : selected}
          onClose={() => { setSelected(null); setShowNew(false); }}
          onSave={handleSave}
          onDelete={handleDelete}/>
      )}
    </motion.div>
  );
}
