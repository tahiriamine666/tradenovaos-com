import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Plus, Search, BarChart3, Target, TrendingUp, Award,
  ChevronRight, Edit, Trash2, Copy, Archive, Eye,
  X, Check, GripVertical, ArrowRight, ArrowLeft,
  Sparkles, Brain, Shield, Star,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ChecklistItem { id: string; text: string; required: boolean }
interface Playbook {
  id: string; user_id: string; title: string; name: string;
  description: string; emoji: string; strategy_type: string;
  tags: string[]; entry_rules: string; exit_rules: string;
  risk_rules: string; entry_checklist: ChecklistItem[];
  exit_checklist: ChecklistItem[]; psych_checklist: ChecklistItem[];
  sessions: string[]; pairs: string[]; risk_percent: number;
  max_loss: number; target_rr: number; invalidation: string;
  conditions: string; ai_insight: string; color: string;
  status: string; created_at: string; updated_at: string;
  trade_count?: number; win_rate?: number; total_pnl?: number; avg_rr?: number | null;
}

const STRATEGY_TYPES = [
  { value:'breakout',  label:'Breakout',  emoji:'🚀' },
  { value:'pullback',  label:'Pullback',  emoji:'📉' },
  { value:'reversal',  label:'Reversal',  emoji:'🔄' },
  { value:'scalping',  label:'Scalping',  emoji:'⚡' },
  { value:'swing',     label:'Swing',     emoji:'🌊' },
  { value:'momentum',  label:'Momentum',  emoji:'💨' },
  { value:'liquidity', label:'Liquidity', emoji:'💧' },
  { value:'other',     label:'Other',     emoji:'📋' },
];

const SESSIONS = ['London','New York','Asia','London/NY Overlap'];
const COLORS   = ['violet','blue','emerald','amber','pink','cyan','red','orange'];
const EMOJIS   = ['📋','🚀','📉','🔄','⚡','🌊','💨','💧','🎯','🏆','🔥','💎','📊','🛡️','⚖️','🎲'];

const COLOR_MAP: Record<string,{bg:string;border:string;text:string;glow:string}> = {
  violet:  { bg:'bg-violet-500/10',  border:'border-violet-500/25',  text:'text-violet-400',  glow:'shadow-violet-500/15' },
  blue:    { bg:'bg-blue-500/10',    border:'border-blue-500/25',    text:'text-blue-400',    glow:'shadow-blue-500/15' },
  emerald: { bg:'bg-emerald-500/10', border:'border-emerald-500/25', text:'text-emerald-400', glow:'shadow-emerald-500/15' },
  amber:   { bg:'bg-amber-500/10',   border:'border-amber-500/25',   text:'text-amber-400',   glow:'shadow-amber-500/15' },
  pink:    { bg:'bg-pink-500/10',    border:'border-pink-500/25',    text:'text-pink-400',    glow:'shadow-pink-500/15' },
  cyan:    { bg:'bg-cyan-500/10',    border:'border-cyan-500/25',    text:'text-cyan-400',    glow:'shadow-cyan-500/15' },
  red:     { bg:'bg-red-500/10',     border:'border-red-500/25',     text:'text-red-400',     glow:'shadow-red-500/15' },
  orange:  { bg:'bg-orange-500/10',  border:'border-orange-500/25',  text:'text-orange-400',  glow:'shadow-orange-500/15' },
};

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

function WinRateCircle({ rate, color }: { rate: number; color: string }) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.violet;
  const r = 28; const circ = 2 * Math.PI * r;
  const pct = rate / 100;
  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx="32" cy="32" r={r} fill="none"
          stroke={color === 'emerald' ? '#10b981' : color === 'amber' ? '#f59e0b' : '#7c3aed'}
          strokeWidth="4" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <span className={`text-xs font-black ${c.text}`}>{rate}%</span>
    </div>
  );
}

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const chartData = data.map((v,i) => ({ i, v }));
  const color = positive ? '#10b981' : '#ef4444';
  const id = positive ? 'sg-pos' : 'sg-neg';
  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
          fill={`url(#${id})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }}
      className="flex flex-col items-center justify-center py-24 text-center px-4">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Target className="h-9 w-9 text-violet-400" />
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-violet-600 border-2 border-[#080812] flex items-center justify-center">
          <Plus className="h-3 w-3 text-white" />
        </div>
      </div>
      <h3 className="text-xl font-black text-white mb-2">Build Your First Playbook</h3>
      <p className="text-sm text-white/40 max-w-sm mb-8 leading-relaxed">
        Define your trading setups with entry rules, risk parameters, and execution checklists.
        Turn your edge into a repeatable system.
      </p>
      <motion.button onClick={onNew} whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
        className="group flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-500/20">
        Create Your First Playbook
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </motion.button>
    </motion.div>
  );
}

function PlaybookCard({ pb, onView, onEdit, onDuplicate, onArchive, onDelete }: {
  pb: Playbook;
  onView: (pb: Playbook) => void;
  onEdit: (pb: Playbook) => void;
  onDuplicate: (pb: Playbook) => void;
  onArchive: (pb: Playbook) => void;
  onDelete: (pb: Playbook) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const c   = COLOR_MAP[pb.color ?? 'violet'] ?? COLOR_MAP.violet;
  const wr  = pb.win_rate  ?? 0;
  const pnl = pb.total_pnl ?? 0;
  const pos = pnl >= 0;
  const sparkData = [0,pnl*0.2,pnl*0.5,pnl*0.3,pnl*0.8,pnl*0.6,pnl];
  const stratLabel = STRATEGY_TYPES.find(s => s.value === pb.strategy_type)?.label ?? 'Setup';

  return (
    <motion.div
      initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}
      whileHover={{ y:-4, transition:{ duration:0.2 } }}
      className={`group relative rounded-2xl border ${c.border} bg-white/[0.02] hover:bg-white/[0.05] hover:shadow-xl hover:${c.glow} transition-all duration-300 overflow-hidden cursor-pointer`}
      onClick={() => onView(pb)}
    >
      <div className={`absolute top-0 inset-x-0 h-0.5 ${c.bg.replace('/10','/60')}`} />
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center text-lg flex-shrink-0`}>
              {pb.emoji ?? '📋'}
            </div>
            <div>
              <h3 className="font-black text-white text-sm leading-tight">{pb.title}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>
                  {stratLabel}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  pb.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-white/5 text-white/30 border-white/10'
                }`}>{pb.status}</span>
              </div>
            </div>
          </div>

          <div className="relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setMenuOpen(v => !v)}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/[0.08] text-white/30 hover:text-white transition-all">
              <span className="text-sm">⋯</span>
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div initial={{ opacity:0, scale:0.95, y:-4 }} animate={{ opacity:1, scale:1, y:0 }}
                  exit={{ opacity:0, scale:0.95, y:-4 }} transition={{ duration:0.12 }}
                  className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/[0.08] bg-[#0d0d1a] shadow-2xl z-20 overflow-hidden"
                  onMouseLeave={() => setMenuOpen(false)}>
                  {[
                    { icon:Eye,     label:'View',      fn:() => onView(pb),      color:'' },
                    { icon:Edit,    label:'Edit',       fn:() => onEdit(pb),      color:'' },
                    { icon:Copy,    label:'Duplicate',  fn:() => onDuplicate(pb), color:'' },
                    { icon:Archive, label:'Archive',    fn:() => onArchive(pb),   color:'' },
                    { icon:Trash2,  label:'Delete',     fn:() => onDelete(pb),    color:'text-red-400 hover:bg-red-500/10' },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <button key={item.label} onClick={() => { item.fn(); setMenuOpen(false); }}
                        className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-white/[0.05] ${item.color || 'text-white/60 hover:text-white'}`}>
                        <Icon className="h-3.5 w-3.5" /> {item.label}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <WinRateCircle rate={wr} color={pb.color ?? 'violet'} />
          <div className="flex-1 grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] text-white/25 uppercase tracking-wider">Trades</p>
              <p className="text-sm font-black text-white">{pb.trade_count ?? 0}</p>
            </div>
            <div>
              <p className="text-[9px] text-white/25 uppercase tracking-wider">Avg R:R</p>
              <p className="text-sm font-black text-white">{pb.avg_rr ? `1:${pb.avg_rr.toFixed(1)}` : '—'}</p>
            </div>
            <div>
              <p className="text-[9px] text-white/25 uppercase tracking-wider">P&L</p>
              <p className={`text-sm font-black ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                {pos ? '+' : ''}${Math.abs(pnl).toFixed(0)}
              </p>
            </div>
          </div>
        </div>

        <div className="mb-3 -mx-1">
          <Sparkline data={sparkData} positive={pos} />
        </div>

        {pb.tags && pb.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {pb.tags.slice(0,3).map(tag => (
              <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.07] text-white/40">
                #{tag}
              </span>
            ))}
            {pb.tags.length > 3 && <span className="text-[10px] text-white/25">+{pb.tags.length-3}</span>}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-white/[0.05]">
          <span className="text-[10px] text-white/20">
            Updated {new Date(pb.updated_at).toLocaleDateString(undefined, { month:'short', day:'numeric' })}
          </span>
          <button onClick={e => { e.stopPropagation(); onView(pb); }}
            className={`flex items-center gap-1 text-[10px] font-bold ${c.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
            View <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PlaybookModal({ playbook, onClose, onSave }: {
  playbook?: Playbook | null;
  onClose: () => void;
  onSave: (data: Partial<Playbook>) => void;
}) {
  const [step, setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm]   = useState<Partial<Playbook>>({
    title: '', emoji: '📋', description: '', tags: [], strategy_type:'breakout',
    color:'violet', entry_checklist:[], exit_checklist:[], psych_checklist:[],
    sessions:[], pairs:[], risk_percent:1, target_rr:2,
    invalidation:'', conditions:'', entry_rules:'', exit_rules:'', risk_rules:'', status:'active',
    ...(playbook ?? {}),
  });
  const [tagInput, setTagInput] = useState('');
  const [pairInput, setPairInput] = useState('');
  const [newEntry, setNewEntry]  = useState('');

  const set = (k: keyof Playbook, v: any) => setForm(f => ({ ...f, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !(form.tags ?? []).includes(t)) set('tags', [...(form.tags ?? []), t]);
    setTagInput('');
  };
  const addPair = () => {
    const p = pairInput.trim().toUpperCase();
    if (p && !(form.pairs ?? []).includes(p)) set('pairs', [...(form.pairs ?? []), p]);
    setPairInput('');
  };
  const addChecklistItem = (type: 'entry'|'exit'|'psych', text: string) => {
    const key  = type === 'entry' ? 'entry_checklist' : type === 'exit' ? 'exit_checklist' : 'psych_checklist';
    const item: ChecklistItem = { id: crypto.randomUUID(), text, required: false };
    set(key as any, [...((form[key as keyof typeof form] as ChecklistItem[]) ?? []), item]);
  };

  const STEPS = [
    { n:1, label:'General',  icon:Target  },
    { n:2, label:'Entry',    icon:ArrowRight },
    { n:3, label:'Risk',     icon:Shield  },
    { n:4, label:'Conditions', icon:Brain },
    { n:5, label:'Review',   icon:Check   },
  ];

  const handleSave = () => { setSaving(true); onSave(form); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ opacity:0, y:40, scale:0.97 }}
        animate={{ opacity:1, y:0,  scale:1 }}
        exit={{ opacity:0,  y:40, scale:0.97 }}
        transition={{ type:'spring', damping:28, stiffness:300 }}
        className="relative w-full sm:max-w-xl bg-[#0c0c16] border border-white/[0.09] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight:'92vh' }}
      >
        <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-white/[0.07] flex-shrink-0">
          <div className="flex-1">
            <p className="text-sm font-black text-white">{playbook ? 'Edit Playbook' : 'New Playbook'}</p>
            <p className="text-xs text-white/30 mt-0.5">Step {step} of 5 — {STEPS[step-1].label}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-1 px-6 py-3 border-b border-white/[0.05] flex-shrink-0">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <React.Fragment key={s.n}>
                <button onClick={() => step > s.n && setStep(s.n)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                    step === s.n ? 'bg-violet-600 text-white' :
                    step > s.n  ? 'bg-emerald-500/15 text-emerald-400 cursor-pointer hover:bg-emerald-500/20' :
                    'text-white/20'
                  }`}>
                  {step > s.n ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length-1 && <div className={`flex-1 h-px ${step > s.n ? 'bg-emerald-500/30' : 'bg-white/[0.06]'}`} />}
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => set('emoji', e)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all border ${
                        form.emoji === e ? 'border-violet-500/50 bg-violet-500/15 scale-110' : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.07]'
                      }`}>{e}</button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Name *</label>
                <input value={form.title ?? ''} onChange={e => set('title', e.target.value)}
                  placeholder="e.g. London Pullback Setup"
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.09] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Description</label>
                <textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)}
                  placeholder="Describe your setup..."
                  rows={2} className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.09] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none" />
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Strategy Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {STRATEGY_TYPES.map(s => (
                    <button key={s.value} onClick={() => set('strategy_type', s.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        form.strategy_type === s.value ? 'bg-violet-500/15 border-violet-500/30 text-violet-400' : 'border-white/[0.07] text-white/30 hover:bg-white/[0.05]'
                      }`}>
                      <span className="text-base">{s.emoji}</span>{s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Color Theme</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => set('color', c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${COLOR_MAP[c].bg} ${form.color === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Tags</label>
                <div className="flex gap-2 mb-2">
                  <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addTag()}
                    placeholder="Add tag..."
                    className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.09] rounded-xl text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
                  <button onClick={addTag} className="px-3 py-2 rounded-xl bg-violet-500/15 border border-violet-500/20 text-violet-400 text-xs font-bold hover:bg-violet-500/20">+</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(form.tags ?? []).map(t => (
                    <span key={t} className="flex items-center gap-1 text-xs bg-white/[0.04] border border-white/[0.08] text-white/50 px-2.5 py-1 rounded-full">
                      #{t} <button onClick={() => set('tags', (form.tags??[]).filter(x=>x!==t))} className="hover:text-red-400 transition-colors">✕</button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Entry Rules (text)</label>
                <textarea value={form.entry_rules ?? ''} onChange={e => set('entry_rules', e.target.value)}
                  placeholder="Describe your entry criteria..."
                  rows={3} className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.09] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Entry Checklist</label>
                <div className="flex gap-2 mb-2">
                  <input value={newEntry} onChange={e => setNewEntry(e.target.value)}
                    onKeyDown={e => { if(e.key==='Enter' && newEntry.trim()) { addChecklistItem('entry', newEntry.trim()); setNewEntry(''); }}}
                    placeholder="Add entry rule..."
                    className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.09] rounded-xl text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
                  <button onClick={() => { if(newEntry.trim()) { addChecklistItem('entry', newEntry.trim()); setNewEntry(''); }}}
                    className="px-3 py-2 rounded-xl bg-violet-500/15 border border-violet-500/20 text-violet-400 text-xs font-bold hover:bg-violet-500/20">+</button>
                </div>
                <div className="space-y-1.5">
                  {(form.entry_checklist ?? []).map((item, i) => (
                    <div key={item.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] group">
                      <GripVertical className="h-3.5 w-3.5 text-white/20" />
                      <span className="flex-1 text-xs text-white/70">{item.text}</span>
                      <button onClick={() => set('entry_checklist', (form.entry_checklist??[]).filter((_,j)=>j!==i))}
                        className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all text-xs">✕</button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Exit Rules</label>
                <textarea value={form.exit_rules ?? ''} onChange={e => set('exit_rules', e.target.value)}
                  placeholder="Describe your exit criteria..."
                  rows={2} className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.09] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none" />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Risk Per Trade (%)</label>
                  <input type="number" value={form.risk_percent ?? 1} onChange={e => set('risk_percent', Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.09] rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/40" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Target R:R</label>
                  <input type="number" value={form.target_rr ?? 2} onChange={e => set('target_rr', Number(e.target.value))}
                    className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.09] rounded-xl text-sm text-white focus:outline-none focus:border-violet-500/40" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Invalidation (Stop Loss Logic)</label>
                <input value={form.invalidation ?? ''} onChange={e => set('invalidation', e.target.value)}
                  placeholder="e.g. Break below previous low..."
                  className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.09] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Risk Rules</label>
                <textarea value={form.risk_rules ?? ''} onChange={e => set('risk_rules', e.target.value)}
                  placeholder="e.g. Stop after 2 consecutive losses..."
                  rows={3} className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.09] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none" />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Best Sessions</label>
                <div className="flex gap-2 flex-wrap">
                  {SESSIONS.map(s => (
                    <button key={s} onClick={() => set('sessions', (form.sessions??[]).includes(s) ? (form.sessions??[]).filter(x=>x!==s) : [...(form.sessions??[]),s])}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                        (form.sessions??[]).includes(s) ? 'bg-violet-500/15 border-violet-500/30 text-violet-400' : 'border-white/[0.08] text-white/30 hover:bg-white/[0.05]'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Best Pairs</label>
                <div className="flex gap-2 mb-2">
                  <input value={pairInput} onChange={e => setPairInput(e.target.value.toUpperCase())}
                    onKeyDown={e => e.key === 'Enter' && addPair()}
                    placeholder="e.g. NAS100"
                    className="flex-1 px-3 py-2 bg-white/[0.04] border border-white/[0.09] rounded-xl text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40" />
                  <button onClick={addPair} className="px-3 py-2 rounded-xl bg-violet-500/15 border border-violet-500/20 text-violet-400 text-xs font-bold hover:bg-violet-500/20">+</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(form.pairs ?? []).map(p => (
                    <span key={p} className="flex items-center gap-1 text-xs bg-white/[0.04] border border-white/[0.08] text-white/50 px-2.5 py-1 rounded-full">
                      {p} <button onClick={() => set('pairs', (form.pairs??[]).filter(x=>x!==p))} className="hover:text-red-400 transition-colors">✕</button>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-white/35 uppercase tracking-wider block mb-2">Market Conditions</label>
                <textarea value={form.conditions ?? ''} onChange={e => set('conditions', e.target.value)}
                  placeholder="e.g. Works best in trending market after news..."
                  rows={3} className="w-full px-4 py-3 bg-white/[0.04] border border-white/[0.09] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 resize-none" />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className={`p-4 rounded-2xl border ${COLOR_MAP[form.color??'violet'].border} ${COLOR_MAP[form.color??'violet'].bg}`}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{form.emoji}</span>
                  <div>
                    <p className="font-black text-white">{form.title || 'Untitled Setup'}</p>
                    <p className={`text-xs font-bold capitalize ${COLOR_MAP[form.color??'violet'].text}`}>
                      {STRATEGY_TYPES.find(s=>s.value===form.strategy_type)?.label}
                    </p>
                  </div>
                </div>
                {form.description && <p className="text-xs text-white/50 leading-relaxed">{form.description}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-white/30 mb-1">Risk</p>
                  <p className="text-sm font-black text-white">{form.risk_percent}% / trade</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-white/30 mb-1">Target R:R</p>
                  <p className="text-sm font-black text-white">1:{form.target_rr}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-white/30 mb-1">Sessions</p>
                  <p className="text-xs font-semibold text-white/70">{(form.sessions??[]).join(', ') || '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-[10px] text-white/30 mb-1">Entry Rules</p>
                  <p className="text-xs font-semibold text-white/70">{(form.entry_checklist??[]).length} items</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 border-t border-white/[0.07] flex-shrink-0">
          {step > 1 && (
            <button onClick={() => setStep(s => s-1)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.08] text-white/40 text-sm font-bold hover:bg-white/[0.04] hover:text-white transition-all">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          )}
          {step < 5 ? (
            <button onClick={() => setStep(s => s+1)} disabled={step === 1 && !form.title?.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-40 shadow-lg shadow-violet-500/20">
              Next <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleSave} disabled={saving || !form.title?.trim()}
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-40 shadow-lg shadow-violet-500/20">
              {saving ? 'Saving...' : '✓ Save Playbook'}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function PlaybookDetail({ pb, onBack, onEdit }: {
  pb: Playbook; onBack: () => void; onEdit: (pb: Playbook) => void;
}) {
  const [tab, setTab] = useState('overview');
  const [checkedItems, setCheckedItems] = useState<Record<string,boolean>>({});
  const c = COLOR_MAP[pb.color ?? 'violet'] ?? COLOR_MAP.violet;
  const entryList    = (pb.entry_checklist  ?? []) as ChecklistItem[];
  const exitList     = (pb.exit_checklist   ?? []) as ChecklistItem[];
  const doneCount    = Object.values(checkedItems).filter(Boolean).length;
  const totalCount   = entryList.length + exitList.length;

  return (
    <motion.div initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.3, ease }}
      className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-xl border border-white/[0.08] hover:bg-white/[0.05] text-white/40 hover:text-white transition-all">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className={`w-12 h-12 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center text-2xl`}>
            {pb.emoji}
          </div>
          <div>
            <h2 className="text-xl font-black text-white">{pb.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border} capitalize`}>
                {STRATEGY_TYPES.find(s=>s.value===pb.strategy_type)?.label}
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border capitalize ${
                pb.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-white/5 text-white/30 border-white/10'
              }`}>{pb.status}</span>
            </div>
          </div>
        </div>
        <button onClick={() => onEdit(pb)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/[0.08] hover:bg-white/[0.05] text-white/40 hover:text-white text-sm font-bold transition-all">
          <Edit className="h-4 w-4" /> Edit
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:'Win Rate', value: pb.win_rate ? `${pb.win_rate}%` : '—', color: pb.win_rate && pb.win_rate >= 50 ? 'text-emerald-400' : 'text-amber-400' },
          { label:'Total Trades', value: `${pb.trade_count ?? 0}`, color:'text-white' },
          { label:'Avg R:R', value: pb.avg_rr ? `1:${pb.avg_rr.toFixed(1)}` : '—', color:'text-blue-400' },
          { label:'Net P&L', value: pb.total_pnl != null ? `${pb.total_pnl >= 0 ? '+' : ''}$${Math.abs(pb.total_pnl).toFixed(0)}` : '—', color: (pb.total_pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1 bg-white/[0.02] border border-white/[0.07] rounded-2xl p-1.5">
        {['overview','rules','performance'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all ${tab===t ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-white/30 hover:text-white hover:bg-white/[0.04]'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          {pb.description && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Description</p>
              <p className="text-sm text-white/70 leading-relaxed">{pb.description}</p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pb.entry_rules && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <ArrowRight className="h-3 w-3 text-emerald-400" /> Entry Rules
                </p>
                <p className="text-xs text-white/60 leading-relaxed">{pb.entry_rules}</p>
              </div>
            )}
            {pb.exit_rules && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <X className="h-3 w-3 text-red-400" /> Exit Rules
                </p>
                <p className="text-xs text-white/60 leading-relaxed">{pb.exit_rules}</p>
              </div>
            )}
            {pb.conditions && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Best Conditions</p>
                <p className="text-xs text-white/60 leading-relaxed">{pb.conditions}</p>
              </div>
            )}
            {(pb.sessions ?? []).length > 0 && (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Sessions</p>
                <div className="flex flex-wrap gap-1.5">
                  {(pb.sessions ?? []).map(s => <span key={s} className="text-xs bg-violet-500/10 border border-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">{s}</span>)}
                </div>
              </div>
            )}
          </div>

          {pb.ai_insight && (
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
              <p className="text-[10px] text-violet-400/60 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> AI Insight
              </p>
              <p className="text-sm text-white/70 leading-relaxed">{pb.ai_insight}</p>
            </div>
          )}
        </div>
      )}

      {tab === 'rules' && (
        <div className="space-y-4">
          {totalCount > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white/60">Checklist Progress</p>
                <span className="text-xs font-black text-violet-400">{doneCount}/{totalCount} rules</span>
              </div>
              <div className="h-2 bg-white/[0.05] rounded-full overflow-hidden">
                <motion.div initial={{ width:0 }} animate={{ width: totalCount > 0 ? `${(doneCount/totalCount)*100}%` : '0%' }}
                  transition={{ duration:0.6, ease }}
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400" />
              </div>
            </div>
          )}

          {entryList.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Entry Checklist</p>
              <div className="space-y-2">
                {entryList.map(item => (
                  <button key={item.id} onClick={() => setCheckedItems(c => ({ ...c, [item.id]: !c[item.id] }))}
                    className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl border text-left transition-all ${
                      checkedItems[item.id] ? 'bg-emerald-500/10 border-emerald-500/20' : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 transition-all ${
                      checkedItems[item.id] ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'
                    }`}>
                      {checkedItems[item.id] && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className={`text-xs font-medium transition-colors ${checkedItems[item.id] ? 'text-emerald-400 line-through' : 'text-white/60'}`}>
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {exitList.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Exit Checklist</p>
              <div className="space-y-2">
                {exitList.map(item => (
                  <button key={item.id} onClick={() => setCheckedItems(c => ({ ...c, [item.id]: !c[item.id] }))}
                    className={`flex items-center gap-2.5 w-full p-2.5 rounded-xl border text-left transition-all ${
                      checkedItems[item.id] ? 'bg-blue-500/10 border-blue-500/20' : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.04]'
                    }`}>
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center flex-shrink-0 ${
                      checkedItems[item.id] ? 'bg-blue-500 border-blue-500' : 'border-white/20'
                    }`}>
                      {checkedItems[item.id] && <Check className="h-2.5 w-2.5 text-white" />}
                    </div>
                    <span className={`text-xs font-medium transition-colors ${checkedItems[item.id] ? 'text-blue-400 line-through' : 'text-white/60'}`}>
                      {item.text}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'performance' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 text-center py-12">
            <BarChart3 className="h-10 w-10 text-white/10 mx-auto mb-3" />
            <p className="text-sm font-semibold text-white/25">Performance analytics</p>
            <p className="text-xs text-white/15 mt-1">Add trades tagged with this playbook to see analytics</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default function PlaybookLab() {
  const { user } = useAuth();
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editPb, setEditPb]       = useState<Playbook|null>(null);
  const [viewPb, setViewPb]       = useState<Playbook|null>(null);
  const [search, setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType]     = useState('all');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('playbooks').select('*').eq('user_id', user.id).order('created_at', { ascending:false });
    if (!error && data) {
      const { data: trades } = await supabase
        .from('trades').select('playbook_id,result,rr').eq('user_id', user.id).not('playbook_id','is',null);
      const pbsWithStats = (data as unknown as Playbook[]).map(pb => {
        const pbTrades = (trades ?? []).filter((t: any) => t.playbook_id === pb.id);
        const wins = pbTrades.filter((t: any) => (t.result ?? 0) > 0);
        const totalPnl = pbTrades.reduce((s, t: any) => s + (Number(t.result) || 0), 0);
        const rrs = pbTrades.filter((t: any) => t.rr);
        return {
          ...pb,
          trade_count: pbTrades.length,
          win_rate: pbTrades.length > 0 ? Math.round((wins.length / pbTrades.length) * 100) : 0,
          total_pnl: totalPnl,
          avg_rr: rrs.length > 0 ? rrs.reduce((s, t: any) => s + (Number(t.rr) || 0), 0) / rrs.length : null,
        };
      });
      setPlaybooks(pbsWithStats);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (formData: Partial<Playbook>) => {
    if (!user || !formData.title?.trim()) return;
    try {
      const payload: any = { ...formData, user_id:user.id, name:formData.title, updated_at:new Date().toISOString() };
      delete payload.trade_count; delete payload.win_rate; delete payload.total_pnl; delete payload.avg_rr;
      if (editPb) {
        const { error } = await supabase.from('playbooks').update(payload).eq('id', editPb.id);
        if (error) throw error;
        toast({ title:`✅ ${formData.title} updated!` });
      } else {
        const { error } = await supabase.from('playbooks').insert(payload);
        if (error) throw error;
        toast({ title:`✅ ${formData.title} created!` });
      }
      setModalOpen(false); setEditPb(null);
      load();
    } catch (e: any) {
      toast({ title:'Error', description:e.message, variant:'destructive' });
    }
  };

  const handleDuplicate = async (pb: Playbook) => {
    const { id, created_at, updated_at, trade_count, win_rate, total_pnl, avg_rr, ...rest } = pb;
    await supabase.from('playbooks').insert({ ...rest, title: `${pb.title} (copy)`, name: `${pb.title} (copy)`, updated_at: new Date().toISOString() } as any);
    toast({ title:'Playbook duplicated!' });
    load();
  };

  const handleArchive = async (pb: Playbook) => {
    await supabase.from('playbooks').update({ status:'archived', updated_at:new Date().toISOString() }).eq('id', pb.id);
    toast({ title:'Playbook archived' });
    load();
  };

  const handleDelete = async (pb: Playbook) => {
    await supabase.from('playbooks').delete().eq('id', pb.id);
    toast({ title:'Playbook deleted' });
    if (viewPb?.id === pb.id) setViewPb(null);
    load();
  };

  const filtered = useMemo(() => playbooks.filter(pb => {
    if (search && !pb.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== 'all' && pb.status !== filterStatus) return false;
    if (filterType   !== 'all' && pb.strategy_type !== filterType) return false;
    return true;
  }), [playbooks, search, filterStatus, filterType]);

  const totalWR  = playbooks.length > 0 ? Math.round(playbooks.reduce((s,p) => s + (p.win_rate ?? 0), 0) / playbooks.length) : 0;
  const totalPnl = playbooks.reduce((s,p) => s + (p.total_pnl ?? 0), 0);
  const bestPb   = playbooks.reduce((best,p) => (p.win_rate ?? 0) > (best?.win_rate ?? 0) ? p : best, null as Playbook|null);

  if (viewPb) {
    return <PlaybookDetail pb={viewPb} onBack={() => setViewPb(null)} onEdit={pb => { setEditPb(pb); setModalOpen(true); }} />;
  }

  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white">Playbook Lab</h2>
          <p className="text-sm text-white/30 mt-0.5">Define your edge. Execute with a system.</p>
        </div>
        <motion.button onClick={() => { setEditPb(null); setModalOpen(true); }}
          whileHover={{ scale:1.02 }} whileTap={{ scale:0.98 }}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-violet-500/20 flex-shrink-0">
          <Plus className="h-4 w-4" /> New Playbook
        </motion.button>
      </div>

      {!loading && playbooks.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label:'Total',       value:playbooks.length, sub:`${playbooks.filter(p=>p.status==='active').length} active`, color:'text-white', icon:Target },
            { label:'Avg Win Rate',value:`${totalWR}%`, sub:'Across all setups', color:totalWR>=50?'text-emerald-400':'text-amber-400', icon:Award },
            { label:'Total P&L',   value:`${totalPnl>=0?'+':''}$${Math.abs(totalPnl).toFixed(0)}`, sub:'From tagged trades', color:totalPnl>=0?'text-emerald-400':'text-red-400', icon:TrendingUp },
            { label:'Best Setup',  value:bestPb?.title ?? '—', sub:bestPb?`${bestPb.win_rate}% WR`:'No data', color:'text-amber-400', icon:Star },
          ].map((s,i) => {
            const Icon = s.icon;
            return (
              <motion.div key={s.label} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.06 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <div className="flex items-start justify-between">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">{s.label}</p>
                  <Icon className={`h-4 w-4 ${s.color} opacity-60`} />
                </div>
                <p className={`text-xl font-black ${s.color} truncate`}>{s.value}</p>
                {s.sub && <p className="text-[10px] text-white/20 mt-1">{s.sub}</p>}
              </motion.div>
            );
          })}
        </div>
      )}

      {playbooks.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/20" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search playbooks..."
              className="w-full pl-9 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/40 transition-colors" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white/60 focus:outline-none focus:border-violet-500/40 transition-colors">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white/60 focus:outline-none focus:border-violet-500/40 transition-colors">
            <option value="all">All Types</option>
            {STRATEGY_TYPES.map(s => <option key={s.value} value={s.value}>{s.emoji} {s.label}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-64 bg-white/[0.02] rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 && playbooks.length === 0 ? (
        <EmptyState onNew={() => setModalOpen(true)} />
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Search className="h-10 w-10 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/25">No playbooks match your filters</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map(pb => (
            <PlaybookCard key={pb.id} pb={pb}
              onView={setViewPb} onEdit={pb => { setEditPb(pb); setModalOpen(true); }}
              onDuplicate={handleDuplicate} onArchive={handleArchive} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <AnimatePresence>
        {modalOpen && (
          <PlaybookModal
            playbook={editPb}
            onClose={() => { setModalOpen(false); setEditPb(null); }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
