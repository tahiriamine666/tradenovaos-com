import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, Clock, Bookmark, BookmarkCheck, CheckCircle2,
  Sparkles, ChevronRight, ChevronLeft, Play, Lock, Flame,
  Trophy, RefreshCw, RotateCcw, ChevronDown, BookOpen,
  Check, Target, Brain, FileText, Zap, X, Circle, Crown,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';


// ── Types ─────────────────────────────────────────────────────────────────────
interface Category { id:string; name:string; emoji:string; gradient:string; description:string; order_index:number; }
interface LessonSection { title:string; order:number; }
interface Callout { type:'tip'|'warning'|'important'; title:string; text:string; }
interface QuizQuestion { id:number; question:string; options:string[]; correct:number; explanation:string; }
interface Lesson {
  id:string; slug:string; title:string; description:string; category:string;
  subcategory:string|null; difficulty:string; read_time_min:number; tags:string[];
  xp_reward:number; order_index:number; is_premium:boolean; is_pro:boolean;
  thumbnail_url:string|null; video_url:string|null; content:string|null;
  key_takeaways:string[]; sections:LessonSection[]; quiz_questions:QuizQuestion[];
  callouts:Callout[]; learning_outcomes:string[];
}
interface Progress { lesson_id:string; progress_pct:number; completed:boolean; saved:boolean; notes:string|null; }
interface Stats { xp_total:number; streak_days:number; hours_studied:number; current_focus:string|null; }
interface LeaderboardEntry { user_id:string; display_name:string; xp_total:number; streak_days:number; level:number; }

// ── Difficulty styles ─────────────────────────────────────────────────────────
const DIFF_CLS: Record<string,string> = {
  beginner:     'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
  intermediate: 'text-foreground/70 bg-muted border-border',
  advanced:     'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20',
};
const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Ask backend AI (shared by all assistants) ────────────────────────────────
async function askLessonAI(question: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-learning-assistant', {
    body: { question },
  });
  if (error) return 'Connection error. Try again.';
  return (data as any)?.answer ?? 'Could not get response.';
}

// ── Thumbnail ──────────────────────────────────────────────────────────────────
function GradientThumb({ lesson, gradient, size='sm' }: { lesson:Lesson; gradient:string; size?:'sm'|'lg' }) {
  const h = size==='lg' ? 200 : 72;
  const w = size==='lg' ? '100%' : 96;
  if (lesson.thumbnail_url)
    return <div className="flex-shrink-0 rounded-xl overflow-hidden" style={{width:w,height:h,minHeight:h}}><img src={lesson.thumbnail_url} alt="" className="w-full h-full object-cover"/></div>;
  return (
    <div className={`flex-shrink-0 rounded-xl bg-gradient-to-br ${gradient||'from-slate-800 to-slate-600'} flex flex-col items-center justify-center p-3 text-center`}
      style={{width:w,height:h,minHeight:h}}>
      <p className="text-[10px] font-black text-white/40 uppercase tracking-wider">{lesson.category.split(' ')[0]}</p>
      <p className={`font-black text-white leading-tight mt-1 uppercase ${size==='lg'?'text-xl':'text-[10px]'} line-clamp-2`}>
        {lesson.subcategory||lesson.tags?.[0]||lesson.category}
      </p>
      {size==='lg'&&lesson.tags?.[0]&&(
        <span className="mt-2 text-[10px] font-bold text-white/60 bg-white/10 px-2 py-0.5 rounded-full">{lesson.tags[0]}</span>
      )}
    </div>
  );
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function MarkdownContent({ content }: { content:string }) {
  return (
    <div className="space-y-2.5">
      {content.split('\n').map((line, i) => {
        if (line.startsWith('## '))
          return <h3 key={i} className="text-lg font-black text-foreground mt-7 mb-3 first:mt-0 flex items-center gap-2">
            <span className="text-violet-500 dark:text-violet-400 font-black text-base">{Math.floor(i/10)+1}.</span>
            {line.replace('## ','')}
          </h3>;
        if (line.startsWith('**') && line.endsWith('**') && !line.slice(2,-2).includes('**'))
          return <p key={i} className="text-sm font-bold text-foreground mt-4 mb-1">{line.slice(2,-2)}</p>;
        if (line.startsWith('- '))
          return <div key={i} className="flex items-start gap-2.5 ml-2">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 flex-shrink-0"/>
            <p className="text-sm text-foreground/75 leading-relaxed">{line.slice(2)}</p>
          </div>;
        if (/^\d+\. /.test(line)) {
          const num = line.split('. ')[0];
          const txt = line.split('. ').slice(1).join('. ');
          return <div key={i} className="flex items-start gap-3 ml-2">
            <span className="text-[10px] font-black text-violet-500 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/15 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{num}</span>
            <p className="text-sm text-foreground/75 leading-relaxed">{txt}</p>
          </div>;
        }
        if (line.trim()==='' || line.startsWith('---')) return <div key={i} className="h-2"/>;
        if (line.startsWith('|')) return null;
        if (line.includes('**')) {
          const parts = line.split('**');
          return <p key={i} className="text-sm text-foreground/75 leading-relaxed">
            {parts.map((p,j) => j%2===1 ? <span key={j} className="font-bold text-foreground">{p}</span> : p)}
          </p>;
        }
        return <p key={i} className="text-sm text-foreground/75 leading-relaxed">{line}</p>;
      })}
    </div>
  );
}

// ── AI Lesson Assistant ────────────────────────────────────────────────────────
function LessonAIAssistant({ lesson }: { lesson:Lesson }) {
  const [answer,  setAnswer]  = useState('');
  const [loading, setLoading] = useState(false);
  const [input,   setInput]   = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const ask = async (prompt: string) => {
    setLoading(true); setAnswer('');
    const ctx = `Lesson: ${lesson.title}\nCategory: ${lesson.category}\n${lesson.description}\n${(lesson.content||'').slice(0,500)}`;
    const text = await askLessonAI(`${ctx}\n\nInstruction: ${prompt}`);
    setAnswer(text);
    setLoading(false);
  };

  const QUICK = [
    { label:'Explain in simple words', icon:'💡', prompt:`Explain "${lesson.title}" like I'm a beginner trader. Use a simple analogy.` },
    { label:'Real market example',     icon:'📈', prompt:`Give me a specific real-world example of "${lesson.title}" on Gold or NAS100 with entry, stop, target.` },
    { label:'Quiz me',                 icon:'🎯', prompt:`Create 3 multiple-choice quiz questions about "${lesson.title}". Format: Q, options a/b/c/d, then answer.` },
  ];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {QUICK.map(q => (
          <button key={q.label} onClick={() => ask(q.prompt)} disabled={loading}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted hover:border-border/70 text-left text-xs font-medium text-foreground/70 hover:text-foreground transition-all disabled:opacity-40">
            <span className="text-sm">{q.icon}</span>
            {q.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e => e.key==='Enter' && input.trim() && ask(input)}
          placeholder="Ask anything about this lesson..."
          className="flex-1 text-xs bg-background border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40"/>
        <button onClick={() => input.trim() && ask(input)} disabled={loading||!input.trim()}
          className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 flex-shrink-0">
          {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin"/> : <ChevronRight className="h-3.5 w-3.5"/>}
        </button>
      </div>

      <AnimatePresence>
        {answer && (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden">
            <div className="rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/5 p-3 max-h-48 overflow-y-auto">
              <p className="text-xs text-foreground/75 leading-relaxed whitespace-pre-wrap">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Rich visual helpers ───────────────────────────────────────────────────────
function CalloutBox({ type, title, text }: { type: string; title: string; text: string }) {
  const cfg = ({
    tip:       { bg:'bg-amber-50 dark:bg-amber-500/8',   border:'border-amber-200 dark:border-amber-500/25',   icon:'💡', color:'text-amber-700 dark:text-amber-400' },
    warning:   { bg:'bg-red-50 dark:bg-red-500/8',       border:'border-red-200 dark:border-red-500/25',       icon:'⚠️', color:'text-red-700 dark:text-red-400' },
    important: { bg:'bg-violet-50 dark:bg-violet-500/8', border:'border-violet-200 dark:border-violet-500/25', icon:'📌', color:'text-violet-700 dark:text-violet-400' },
  } as Record<string, { bg:string; border:string; icon:string; color:string }>)[type] ?? { bg:'bg-muted', border:'border-border', icon:'ℹ️', color:'text-foreground' };
  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} px-5 py-4 flex items-start gap-3`}>
      <span className="text-xl flex-shrink-0 mt-0.5">{cfg.icon}</span>
      <div>
        <p className={`text-sm font-bold ${cfg.color} mb-1`}>{title}</p>
        <p className={`text-sm leading-relaxed ${cfg.color} opacity-85`}>{text}</p>
      </div>
    </div>
  );
}

function FormulaBox({ formula, label }: { formula: string; label?: string }) {
  return (
    <div className="rounded-2xl border-2 border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/8 p-5 text-center my-2">
      {label && <p className="text-[10px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest mb-2">{label}</p>}
      <p className="text-2xl font-black text-violet-700 dark:text-violet-300 font-mono">{formula}</p>
    </div>
  );
}

function ComparisonCard({ leftLabel, leftItems, rightLabel, rightItems, leftColor, rightColor }: {
  leftLabel: string; leftItems: string[]; leftColor: 'emerald'|'red';
  rightLabel: string; rightItems: string[]; rightColor: 'emerald'|'red';
}) {
  const colorCls = {
    emerald: { border:'border-emerald-200 dark:border-emerald-500/25', bg:'bg-emerald-50 dark:bg-emerald-500/8', title:'text-emerald-700 dark:text-emerald-400', dot:'bg-emerald-500' },
    red:     { border:'border-red-200 dark:border-red-500/25',         bg:'bg-red-50 dark:bg-red-500/8',         title:'text-red-700 dark:text-red-400',         dot:'bg-red-500' },
  };
  const lc = colorCls[leftColor]; const rc = colorCls[rightColor];
  return (
    <div className="grid grid-cols-2 gap-3 my-2">
      <div className={`rounded-2xl border ${lc.border} ${lc.bg} p-4`}>
        <p className={`text-sm font-black ${lc.title} mb-3`}>{leftLabel}</p>
        <div className="space-y-2">
          {leftItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${lc.dot} mt-1.5 flex-shrink-0`}/>
              <p className="text-xs text-foreground/75 leading-snug">{item}</p>
            </div>
          ))}
        </div>
      </div>
      <div className={`rounded-2xl border ${rc.border} ${rc.bg} p-4`}>
        <p className={`text-sm font-black ${rc.title} mb-3`}>{rightLabel}</p>
        <div className="space-y-2">
          {rightItems.map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${rc.dot} mt-1.5 flex-shrink-0`}/>
              <p className="text-xs text-foreground/75 leading-snug">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="rounded-2xl border border-border overflow-hidden my-2">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/60 border-b border-border">
            {headers.map((h, i) => (
              <th key={i} className={`px-4 py-2.5 text-left font-black text-foreground ${i > 0 ? 'text-center' : ''}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={`border-b border-border last:border-0 ${ri % 2 === 0 ? '' : 'bg-muted/20'}`}>
              {row.map((cell, ci) => (
                <td key={ci} className={`px-4 py-2.5 text-foreground/80 ${ci > 0 ? 'text-center font-semibold' : 'font-medium'}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RRVisual({ ratio, risk, reward }: { ratio: string; risk: number; reward: number }) {
  const pct = Math.min(95, (reward / (risk + reward)) * 100);
  return (
    <div className="rounded-2xl border border-border bg-card p-4 my-1">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-black text-foreground">R:R {ratio}</p>
        <span className="text-xs font-bold text-violet-500 dark:text-violet-400">Risk ${risk} → Reward ${reward}</span>
      </div>
      <div className="h-8 rounded-xl overflow-hidden flex">
        <div className="bg-red-500/20 border border-red-200 dark:border-red-500/30 flex items-center justify-center"
          style={{ width: `${100 - pct}%` }}>
          <span className="text-[10px] font-black text-red-600 dark:text-red-400">Risk</span>
        </div>
        <div className="bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 flex items-center justify-center flex-1">
          <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">Reward ×{reward/risk}</span>
        </div>
      </div>
    </div>
  );
}

function ChecklistItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border last:border-0">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        checked
          ? 'bg-emerald-100 dark:bg-emerald-500/15 border-2 border-emerald-500'
          : 'bg-red-100 dark:bg-red-500/15 border-2 border-red-400'
      }`}>
        {checked
          ? <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" strokeWidth={3}/>
          : <X className="h-3 w-3 text-red-600 dark:text-red-400" strokeWidth={3}/>
        }
      </div>
      <p className={`text-sm ${checked ? 'text-foreground' : 'text-foreground/70'}`}>{label}</p>
    </div>
  );
}

function PositionSizeCalculator() {
  const [account,  setAccount]  = React.useState('10000');
  const [riskPct,  setRiskPct]  = React.useState('1');
  const [stopPts,  setStopPts]  = React.useState('20');

  const riskAmount = (parseFloat(account)||0) * (parseFloat(riskPct)||0) / 100;
  const posSize    = stopPts && parseFloat(stopPts) > 0 ? riskAmount / parseFloat(stopPts) : 0;

  return (
    <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-gradient-to-br from-violet-50 to-violet-50/30 dark:from-violet-500/8 dark:to-violet-500/3 p-5 my-2">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
          <Zap className="h-3.5 w-3.5 text-white"/>
        </div>
        <p className="text-sm font-black text-foreground">Position Size Calculator</p>
        <span className="text-[9px] font-bold bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-500/20 ml-auto">INTERACTIVE</span>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { label:'Account Size ($)', value:account, setter:setAccount, placeholder:'10000' },
          { label:'Risk %',           value:riskPct,  setter:setRiskPct,  placeholder:'1' },
          { label:'Stop Distance (pts)', value:stopPts, setter:setStopPts, placeholder:'20' },
        ].map(f => (
          <div key={f.label}>
            <p className="text-[10px] font-bold text-muted-foreground mb-1">{f.label}</p>
            <input
              type="number" value={f.value} placeholder={f.placeholder}
              onChange={e => f.setter(e.target.value)}
              className="w-full text-sm bg-background border border-border rounded-xl px-3 py-2 text-foreground font-mono focus:outline-none focus:border-violet-500/50"/>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-background border border-border p-3 text-center">
          <p className="text-[10px] font-bold text-muted-foreground mb-1">Risk Amount</p>
          <p className="text-xl font-black text-foreground">${riskAmount.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-violet-600 p-3 text-center">
          <p className="text-[10px] font-bold text-white/70 mb-1">Position Size</p>
          <p className="text-xl font-black text-white">${posSize.toFixed(2)}<span className="text-sm font-medium">/pt</span></p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground text-center mt-3">
        If stopped out, you lose exactly ${riskAmount.toFixed(2)} ({riskPct}% of account)
      </p>
    </div>
  );
}

// ── Rich content renderer ─────────────────────────────────────────────────────
function renderRichContent(lesson: Lesson, callouts: Callout[]) {
  if (lesson.slug === 'risk-position-sizing') {
    return (
      <div className="space-y-8">
        <section>
          <h3 className="text-lg font-black text-foreground pb-2 border-b border-border mb-4">1. What is Position Sizing?</h3>
          <p className="text-sm text-foreground/75 leading-relaxed mb-4">
            Position sizing is the process of calculating exactly how many units, lots, or contracts to trade
            based on a predetermined risk amount. It answers the question every trader must ask before every trade:
            <span className="font-bold text-foreground"> How much do I risk?</span>
          </p>
          <p className="text-sm text-foreground/75 leading-relaxed mb-4">
            Without position sizing, trading is gambling. With it, trading becomes a system — where your edge
            plays out over hundreds of trades and capital compounds safely.
          </p>
          <CalloutBox type="important" title="The Professional Standard"
            text="Professional prop traders risk 0.25%–0.5% per trade. Retail traders risk 2–5%. This single difference is why professionals survive and retail accounts blow up." />
        </section>

        <section>
          <h3 className="text-lg font-black text-foreground pb-2 border-b border-border mb-4">2. Why Position Sizing Matters</h3>
          <ComparisonCard
            leftLabel="✅ Professional Trader (0.5% risk)"
            leftColor="emerald"
            leftItems={[
              "10 consecutive losses = -5% drawdown",
              "Account recovers with 1 good week",
              "Emotional state: calm, process-focused",
              "Long-term: account grows steadily"
            ]}
            rightLabel="❌ Retail Trader (5% risk)"
            rightColor="red"
            rightItems={[
              "10 consecutive losses = -50% drawdown",
              "Needs 100% gain just to break even",
              "Emotional state: desperate, revenge trading",
              "Long-term: account blown"
            ]}
          />
          <p className="text-sm text-foreground/60 text-center mt-3 italic">Same strategy. Different position sizing. Completely different outcomes.</p>
        </section>

        <section>
          <h3 className="text-lg font-black text-foreground pb-2 border-b border-border mb-4">3. Risk Per Trade</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { pct:'0.25%', label:'Conservative', desc:'Funded accounts, drawdown periods', color:'bg-blue-50 dark:bg-blue-500/8 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400' },
              { pct:'0.5%',  label:'Standard Pro',  desc:'Funded accounts, ongoing', color:'bg-violet-50 dark:bg-violet-500/8 border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400' },
              { pct:'1%',    label:'Aggressive Pro', desc:'Personal accounts only', color:'bg-amber-50 dark:bg-amber-500/8 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400' },
              { pct:'2%+',   label:'Retail Default', desc:'Account blown eventually', color:'bg-red-50 dark:bg-red-500/8 border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400' },
            ].map(r => (
              <div key={r.pct} className={`rounded-2xl border p-3 text-center ${r.color}`}>
                <p className="text-2xl font-black mb-1">{r.pct}</p>
                <p className="text-[10px] font-black uppercase tracking-wider mb-1">{r.label}</p>
                <p className="text-[10px] opacity-70 leading-snug">{r.desc}</p>
              </div>
            ))}
          </div>
          <DataTable
            headers={['Account Size', '0.25% Risk', '0.5% Risk', '1% Risk']}
            rows={[
              ['$5,000',   '$12.50', '$25',   '$50'],
              ['$10,000',  '$25',    '$50',   '$100'],
              ['$25,000',  '$62.50', '$125',  '$250'],
              ['$50,000',  '$125',   '$250',  '$500'],
              ['$100,000', '$250',   '$500',  '$1,000'],
            ]}
          />
        </section>

        <section>
          <h3 className="text-lg font-black text-foreground pb-2 border-b border-border mb-4">4. Position Size Formula</h3>
          <FormulaBox formula="Position Size = Risk Amount ÷ Stop Loss Distance" label="The Core Formula"/>
          <div className="space-y-3 mt-4">
            {[
              { title:'Example 1 — NAS100', account:'$10,000', risk:'1%', riskAmt:'$100', entry:'19,500', stop:'19,470', distance:'30 pts', size:'$100 ÷ 30 = $3.33/pt' },
              { title:'Example 2 — Gold',   account:'$10,000', risk:'1%', riskAmt:'$100', entry:'2,350',  stop:'2,340',  distance:'10 pts', size:'$100 ÷ 10 = $10/pt' },
              { title:'Example 3 — Funded $50K', account:'$50,000', risk:'0.5%', riskAmt:'$250', entry:'20,000', stop:'19,975', distance:'25 pts', size:'$250 ÷ 25 = $10/pt' },
            ].map(ex => (
              <div key={ex.title} className="rounded-2xl border border-border bg-card p-4">
                <p className="text-sm font-black text-foreground mb-3">{ex.title}</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center mb-3">
                  {[
                    ['Account',  ex.account],
                    ['Risk %',   ex.risk],
                    ['Risk $',   ex.riskAmt],
                    ['Entry',    ex.entry],
                    ['Stop',     ex.stop],
                    ['Distance', ex.distance],
                  ].map(([l,v]) => (
                    <div key={l} className="bg-muted/40 rounded-xl p-2">
                      <p className="text-[9px] text-muted-foreground font-semibold uppercase">{l}</p>
                      <p className="text-xs font-black text-foreground">{v}</p>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl bg-violet-600 text-white px-4 py-2 text-center">
                  <span className="text-[10px] font-bold text-white/70 mr-2">Position Size =</span>
                  <span className="text-sm font-black">{ex.size}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <PositionSizeCalculator/>
          </div>
          <CalloutBox type="tip" title="Calculate Before You Click"
            text="Before clicking buy or sell, open a calculator. Enter: account size × risk % = risk amount. Then: risk amount ÷ stop distance = position size. This 10-second habit saves accounts." />
        </section>

        <section>
          <h3 className="text-lg font-black text-foreground pb-2 border-b border-border mb-4">5. Risk-to-Reward (R:R)</h3>
          <p className="text-sm text-foreground/75 leading-relaxed mb-4">
            R:R = (Target Distance) ÷ (Stop Distance). The higher your R:R, the lower your required win rate to be profitable.
          </p>
          <div className="space-y-2 mb-4">
            <RRVisual ratio="1:1" risk={100} reward={100}/>
            <RRVisual ratio="1:2" risk={100} reward={200}/>
            <RRVisual ratio="1:3" risk={100} reward={300}/>
            <RRVisual ratio="1:5" risk={100} reward={500}/>
          </div>
          <DataTable
            headers={['R:R Ratio', 'Risk $100', 'Reward', 'Min Win Rate Needed']}
            rows={[
              ['1:1', '$100', '$100', '51%'],
              ['1:2', '$100', '$200', '34%'],
              ['1:3', '$100', '$300', '26%'],
              ['1:5', '$100', '$500', '17%'],
            ]}
          />
          <div className="mt-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/5 p-4">
            <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 mb-2">The Math Proof</p>
            <p className="text-sm text-emerald-800 dark:text-emerald-300/80 leading-relaxed">
              At 1:3 R:R with 40% win rate: 40 wins × $300 = $12,000 profit. 60 losses × $100 = $6,000 loss. <strong>Net: +$6,000 per 100 trades.</strong>
              At 1:0.5 R:R with 65% win rate: 65 wins × $50 = $3,250. 35 losses × $100 = $3,500. <strong>Net: -$250 (losing at 65% win rate!).</strong>
            </p>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-black text-foreground pb-2 border-b border-border mb-4">6. Common Position Sizing Mistakes</h3>
          <div className="rounded-2xl border border-border bg-card p-5">
            <ChecklistItem checked={false} label="Risking too much per trade (2–5% instead of 0.5–1%)"/>
            <ChecklistItem checked={false} label="Increasing size after losses to 'make it back' faster"/>
            <ChecklistItem checked={false} label="Revenge trading with oversized positions after a bad day"/>
            <ChecklistItem checked={false} label="No stop loss — 'I will manually close if it goes wrong'"/>
            <ChecklistItem checked={false} label="Random lot sizes based on gut feeling"/>
            <ChecklistItem checked={false} label="Ignoring volatility — same size on slow market and NFP"/>
            <ChecklistItem checked={false} label="Skipping the calculation — sizing after entry"/>
          </div>
          <CalloutBox type="warning" title="Never Increase Size After Losses"
            text="The urge to size up after a loss to 'make it back' is the #1 account killer. Your position size is determined by math and rules — never by recent results or emotions." />
        </section>

        <section>
          <h3 className="text-lg font-black text-foreground pb-2 border-b border-border mb-4">7. Prop Firm Risk Model</h3>
          <DataTable
            headers={['Phase', 'Recommended Risk', 'Reason']}
            rows={[
              ['Challenge Phase',    '0.5–1%',    'Need to reach target'],
              ['Verification Phase', '0.5%',      'Protect challenge gains'],
              ['Funded — Month 1',   '0.25–0.5%', 'Prove consistency first'],
              ['Funded — Ongoing',   '0.5%',      'Sustainable long-term'],
            ]}
          />
          <div className="mt-4 rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-black text-foreground mb-3">Daily Loss Limit Math — $100K Account</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label:'Daily Limit (4%)', value:'$4,000', color:'text-red-500' },
                { label:'Risk Per Trade (0.5%)', value:'$500', color:'text-violet-500 dark:text-violet-400' },
                { label:'Trades to Hit Limit', value:'8 losses', color:'text-foreground' },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-muted/40 p-3">
                  <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-black text-foreground pb-2 border-b border-border mb-4">8. Practical Example</h3>
          <div className="rounded-2xl border-2 border-violet-200 dark:border-violet-500/30 bg-card overflow-hidden">
            <div className="bg-violet-50 dark:bg-violet-500/8 px-5 py-4 border-b border-violet-200 dark:border-violet-500/20">
              <p className="text-sm font-black text-violet-700 dark:text-violet-400">Scenario</p>
              <p className="text-xs text-foreground/70 mt-0.5">$50,000 funded account · NAS100 · Bullish FVG at London open</p>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                {[
                  ['Account', '$50,000'], ['Risk %', '0.5%'], ['Entry', '19,850'], ['Stop', '19,840'],
                ].map(([l,v]) => (
                  <div key={l} className="text-center bg-muted/30 rounded-xl p-3">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">{l}</p>
                    <p className="text-sm font-black text-foreground">{v}</p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {[
                  { step:'Step 1', label:'Calculate Risk Amount', formula:'$50,000 × 0.5% = $250' },
                  { step:'Step 2', label:'Calculate Position Size', formula:'$250 ÷ 10 points = $25 per point' },
                  { step:'Step 3', label:'Verify R:R (target 30 pts)', formula:'30 pts × $25 = $750 reward → 1:3 R:R ✅' },
                ].map(s => (
                  <div key={s.step} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-muted/20">
                    <span className="text-[10px] font-black text-violet-500 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/15 px-2 py-1 rounded-lg flex-shrink-0">{s.step}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-muted-foreground">{s.label}</p>
                      <p className="text-sm font-black text-foreground">{s.formula}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/25 p-3 text-center">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">If Trade Wins</p>
                  <p className="text-xl font-black text-emerald-700 dark:text-emerald-400">+$750</p>
                  <p className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">+1.5% of account</p>
                </div>
                <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 p-3 text-center">
                  <p className="text-[10px] font-bold text-red-600 dark:text-red-400 mb-1">If Trade Loses</p>
                  <p className="text-xl font-black text-red-700 dark:text-red-400">-$250</p>
                  <p className="text-[10px] text-red-600/70 dark:text-red-400/70">-0.5% of account</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-lg font-black text-foreground pb-2 border-b border-border mb-4">9. Pre-Trade Checklist</h3>
          <div className="rounded-2xl border border-border bg-card p-5">
            <ChecklistItem checked={true} label="Stop loss defined and placed on chart"/>
            <ChecklistItem checked={true} label="Take profit target defined and placed on chart"/>
            <ChecklistItem checked={true} label="Risk amount calculated (account × risk %)"/>
            <ChecklistItem checked={true} label="Position size calculated (risk amount ÷ stop distance)"/>
            <ChecklistItem checked={true} label="R:R is acceptable (minimum 1:1.5)"/>
            <ChecklistItem checked={true} label="Daily loss limit checked — room available"/>
            <ChecklistItem checked={true} label="Setup meets all entry criteria (not FOMO)"/>
            <ChecklistItem checked={true} label="Trade is during a killzone"/>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2 italic">If any item cannot be checked — do not take the trade.</p>
        </section>
      </div>
    );
  }

  // Default fallback — markdown-style renderer with callouts
  const content = lesson.content;
  if (!content || content.trim().length < 50) return (
    <div className="flex flex-col items-center py-12 text-center rounded-2xl border border-dashed border-border bg-muted/20">
      <BookOpen className="h-10 w-10 text-muted-foreground/20 mb-3"/>
      <p className="text-sm font-bold text-foreground mb-1">Content being prepared</p>
      <p className="text-xs text-muted-foreground">Use the AI Tutor to learn about this topic.</p>
    </div>
  );

  const lines = content.split('\n');
  let cIdx = 0, headingCount = 0;
  const els: React.ReactNode[] = [];
  lines.forEach((line, i) => {
    if (line.startsWith('## ')) {
      headingCount++;
      if ((headingCount === 2 || headingCount === 4) && cIdx < callouts.length) {
        const c = callouts[cIdx++];
        els.push(<CalloutBox key={`c${i}`} type={c.type} title={c.title} text={c.text}/>);
      }
      els.push(<h3 key={i} className="text-lg font-black text-foreground mt-7 mb-3 first:mt-0 pb-2 border-b border-border">{line.replace('## ','')}</h3>);
    } else if (line.startsWith('**') && line.endsWith('**') && !line.slice(2,-2).includes('**'))
      els.push(<p key={i} className="text-sm font-bold text-foreground mt-4 mb-1">{line.slice(2,-2)}</p>);
    else if (line.startsWith('- '))
      els.push(<div key={i} className="flex items-start gap-2.5 ml-1"><div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-2 flex-shrink-0"/><p className="text-sm text-foreground/75 leading-relaxed">{line.slice(2)}</p></div>);
    else if (/^\d+\. /.test(line)) {
      const num=line.split('. ')[0]; const txt=line.split('. ').slice(1).join('. ');
      els.push(<div key={i} className="flex items-start gap-3 ml-1"><span className="text-[10px] font-black text-violet-500 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/15 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{num}</span><p className="text-sm text-foreground/75 leading-relaxed">{txt}</p></div>);
    } else if (line.startsWith('|') && !line.includes('---')) {
      const cells=line.split('|').filter(c=>c.trim());
      if(cells.length) els.push(<div key={i} className="flex border border-border rounded-xl overflow-hidden my-0.5">{cells.map((c,j)=><div key={j} className={`flex-1 px-3 py-2 text-xs ${j===0?'font-bold bg-muted/50 text-foreground':'text-foreground/70'} ${j<cells.length-1?'border-r border-border':''}`}>{c.trim()}</div>)}</div>);
    } else if (line.trim()==='' || line.startsWith('---'))
      els.push(<div key={i} className="h-1.5"/>);
    else if (line.includes('**')) {
      const parts=line.split('**');
      els.push(<p key={i} className="text-sm text-foreground/75 leading-relaxed">{parts.map((p,j)=>j%2===1?<span key={j} className="font-bold text-foreground">{p}</span>:p)}</p>);
    } else
      els.push(<p key={i} className="text-sm text-foreground/75 leading-relaxed">{line}</p>);
  });
  while (cIdx < callouts.length) {
    const c = callouts[cIdx++];
    els.push(<CalloutBox key={`ce${cIdx}`} type={c.type} title={c.title} text={c.text}/>);
  }
  return <div className="space-y-2">{els}</div>;
}

// ── Lesson infographic (visual concept diagram per lesson) ────────────────────
function LessonInfographic({ lesson }: { lesson: Lesson }) {
  if (lesson.slug === 'risk-position-sizing') {
    const steps = [
      { icon:'🏦', label:'Account',      value:'$10,000' },
      { icon:'⚡', label:'Risk %',       value:'× 1%' },
      { icon:'💰', label:'Risk Amount',  value:'= $100' },
      { icon:'📐', label:'Stop Distance',value:'÷ 20 pts' },
      { icon:'🎯', label:'Position Size', value:'= $5/pt' },
    ];
    return (
      <div className="flex items-center gap-0 flex-wrap justify-center">
        {steps.map((s, i) => (
          <React.Fragment key={s.label}>
            <div className="flex flex-col items-center gap-1 px-2">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-lg">{s.icon}</div>
              <p className="text-[9px] font-bold text-white/50 uppercase tracking-wider">{s.label}</p>
              <p className="text-xs font-black text-white">{s.value}</p>
            </div>
            {i < steps.length - 1 && <ChevronRight className="h-4 w-4 text-white/30 flex-shrink-0"/>}
          </React.Fragment>
        ))}
      </div>
    );
  }
  if (lesson.slug === 'risk-drawdown-control') {
    const zones = [
      { range:'0–5%',  label:'Safe',     color:'bg-emerald-500/80', w:'25%' },
      { range:'5–10%', label:'Warning',  color:'bg-amber-400/80', w:'50%' },
      { range:'10–15%',label:'Danger',   color:'bg-orange-500/80', w:'75%' },
      { range:'15%+',  label:'Critical', color:'bg-red-500/80', w:'100%' },
    ];
    return (
      <div className="w-full space-y-1.5">
        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest text-center mb-2">Drawdown Zones</p>
        {zones.map(z => (
          <div key={z.range} className="flex items-center gap-2">
            <span className="text-[9px] text-white/50 w-12 text-right flex-shrink-0">{z.range}</span>
            <div className="flex-1 h-4 rounded-lg overflow-hidden bg-white/5">
              <div className={`h-full ${z.color} rounded-lg flex items-center justify-center`} style={{ width: z.w }}>
                <span className="text-[8px] font-black text-white px-1">{z.label}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (lesson.slug === 'ict-fair-value-gap') {
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest">3-Candle FVG Structure</p>
        <div className="flex items-end gap-2 justify-center">
          <div className="flex flex-col items-center gap-1"><div className="w-4 h-16 bg-red-400/80 rounded-sm"/><p className="text-[8px] text-white/50 font-bold">C1</p></div>
          <div className="flex flex-col items-center gap-1"><div className="w-6 h-24 bg-emerald-400/90 rounded-sm border-2 border-emerald-300/50"/><p className="text-[8px] text-white/50 font-bold">C2</p></div>
          <div className="flex flex-col items-center gap-1"><div className="w-4 h-12 bg-emerald-300/70 rounded-sm"/><p className="text-[8px] text-white/50 font-bold">C3</p></div>
          <div className="flex flex-col items-center gap-1 ml-1">
            <div className="border-l-2 border-dashed border-violet-400/70 h-6 flex items-center"><div className="w-8 h-0 border-t-2 border-dashed border-violet-400/70"/></div>
            <p className="text-[8px] text-violet-300 font-black">FVG</p>
          </div>
        </div>
        <p className="text-[9px] text-white/40 text-center">C1 High ↔ C3 Low = Imbalance Zone</p>
      </div>
    );
  }
  if (lesson.slug === 'ict-order-blocks') {
    return (
      <div className="flex flex-col items-center gap-2 w-full">
        <p className="text-[9px] font-black text-white/40 uppercase tracking-widest mb-1">Bullish Order Block</p>
        <div className="flex items-end gap-1.5 justify-center">
          {[
            {h:12, c:'bg-red-400/70', badge:false},
            {h:16, c:'bg-red-400/80', badge:false},
            {h:20, c:'bg-red-500/90 border-2 border-amber-300/60', badge:true},
            {h:32, c:'bg-emerald-400/80', badge:false},
            {h:40, c:'bg-emerald-500/90', badge:false},
            {h:36, c:'bg-emerald-400/80', badge:false},
          ].map((b,i)=>(
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-5 ${b.c} rounded-sm`} style={{height:`${b.h*2}px`}}/>
              {b.badge&&<p className="text-[8px] text-amber-300 font-black">OB</p>}
            </div>
          ))}
        </div>
        <p className="text-[9px] text-white/40 text-center">Last bearish candle before bullish displacement</p>
      </div>
    );
  }
  const CAT_VISUAL: Record<string, { lines: string[] }> = {
    'ICT Concepts':       { lines:['Liquidity → Manipulation → Distribution','Smart Money Protocol'] },
    'SMC':                { lines:['Market Structure → OBs → FVGs','Institutional Flow Reading'] },
    'Fundamentals':       { lines:['News → USD Impact → Correlation','Macro → Micro → Entry'] },
    'Price Action':       { lines:['Structure → Pattern → Entry','Read Price, Not Indicators'] },
    'Risk Management':    { lines:['Capital First → Process → Profit','Position Size → R:R → Survive'] },
    'Trading Psychology': { lines:['Process Over Results','Discipline → Consistency → Edge'] },
    'Replay Drills':      { lines:['See It → Identify → Execute','Deliberate Practice Builds Edge'] },
    'Prop Firm Strategies':{ lines:['Rules → Risk → Consistency','Pass → Fund → Scale → Withdraw'] },
  };
  const v = CAT_VISUAL[lesson.category] ?? { lines:['Learn','Apply','Improve'] };
  const emoji = ({
    'ICT Concepts':'🎯','SMC':'🏦','Fundamentals':'📰','Price Action':'📈',
    'Risk Management':'🛡️','Trading Psychology':'🧠','Replay Drills':'🎮','Prop Firm Strategies':'🏆'
  } as Record<string,string>)[lesson.category] ?? '📚';
  return (
    <div className="flex flex-col items-center justify-center gap-3 w-full h-full py-2">
      <div className="text-3xl">{emoji}</div>
      {v.lines.map((line,i)=>(
        <p key={i} className={`text-xs font-bold ${i===0?'text-white/80':'text-white/50'} text-center leading-snug`}>{line}</p>
      ))}
    </div>
  );
}

// ── Position Sizing interactive practice ─────────────────────────────────────
function PositionSizingPractice({ onComplete }: { onComplete: ()=>void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number,string>>({});
  const [checked, setChecked] = useState<Record<number,boolean>>({});
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const exercises = [
    { id:0, type:'calc' as const, title:'Exercise 1 — Calculate Risk Amount',
      scenario:'Account: $5,000 · Risk: 1% · Stop Loss: 25 points',
      question:'What is your risk amount in dollars?',
      fields:[
        {label:'Account Size', value:'$5,000', editable:false},
        {label:'Risk %', value:'1%', editable:false},
        {label:'Risk Amount', value:'', editable:true},
      ],
      correct:'50', display:'$50', hint:'$5,000 × 1% = $50', xp:20 },
    { id:1, type:'calc' as const, title:'Exercise 2 — Calculate Position Size',
      scenario:'Account: $20,000 · Risk: 0.5% · Stop Loss: 50 points',
      question:'What is your position size ($ per point)?',
      fields:[
        {label:'Risk Amount', value:'$100', editable:false},
        {label:'Stop Distance', value:'50 pts', editable:false},
        {label:'Position Size', value:'', editable:true},
      ],
      correct:'2', display:'$2 per point', hint:'$100 ÷ 50 = $2 per point', xp:20 },
    { id:2, type:'mcq' as const, title:'Exercise 3 — Choose the Correct R:R',
      scenario:'Entry: 20,000 · Stop: 19,980 (20 pts) · Target: 20,060 (60 pts)',
      question:'What is the R:R ratio on this trade?',
      options:['1:1','1:2','1:3','1:4'],
      correct:'1:3', hint:'R:R = Target ÷ Stop = 60 ÷ 20 = 3 → 1:3', xp:20 },
    { id:3, type:'mcq' as const, title:'Exercise 4 — Funded Account Decision',
      scenario:'Funded $100,000 · Daily limit hit at -$3,500 · A+ setup just appeared',
      question:'What should you do?',
      options:[
        "Take the setup — it's A+ quality",
        'Reduce size to half and take it',
        'Stop trading for the day — daily limit is non-negotiable',
        'Take it with extra size to recover the daily loss',
      ],
      correct:'Stop trading for the day — daily limit is non-negotiable',
      hint:'Daily loss limits exist precisely for this moment. No exception ever.', xp:20 },
    { id:4, type:'mcq' as const, title:'Exercise 5 — Minimum Acceptable R:R',
      scenario:'You analyze a trade and calculate 1:1.2 R:R.',
      question:'Should you take this trade?',
      options:[
        'Yes — any positive R:R is acceptable',
        'Yes — if the setup looks good enough',
        'No — minimum acceptable R:R is 1:1.5',
        'Yes — 1:1.2 is close enough to 1:1.5',
      ],
      correct:'No — minimum acceptable R:R is 1:1.5',
      hint:'Professional minimum is 1:1.5. Below this, consistent profitability requires an unrealistically high win rate.', xp:20 },
  ];

  const current = exercises[step];
  const isLast = step === exercises.length - 1;

  const checkAnswer = () => {
    const ans = answers[current.id]?.trim().replace(/[$,\s]/g,'') ?? '';
    const isCorrect = current.type === 'mcq'
      ? answers[current.id] === current.correct
      : ans === current.correct.replace(/[$,\s]/g,'');
    setChecked(p => ({...p, [current.id]: isCorrect}));
    if (isCorrect) setScore(s => s + current.xp);
  };

  if (done) return (
    <div className="rounded-2xl border border-violet-200 dark:border-violet-500/25 bg-violet-50 dark:bg-violet-500/5 p-8 text-center space-y-4">
      <div className="text-5xl">🎯</div>
      <p className="text-2xl font-black text-foreground">Practice Complete!</p>
      <p className="text-sm text-muted-foreground">You earned <span className="font-black text-amber-500">{score} XP</span> out of {exercises.reduce((s,e)=>s+e.xp,0)} possible</p>
      <div className="flex items-center justify-center gap-2">
        {exercises.map(e => (
          <div key={e.id} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${checked[e.id] ? 'bg-emerald-500 text-white' : 'bg-red-100 dark:bg-red-500/15 text-red-500 border border-red-200 dark:border-red-500/25'}`}>
            {checked[e.id] ? '✓' : '✗'}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Score: {Object.values(checked).filter(Boolean).length}/{exercises.length} correct</p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button onClick={()=>{setStep(0);setAnswers({});setChecked({});setScore(0);setDone(false);}}
          className="px-5 py-2.5 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-muted transition-all">Try Again</button>
        <button onClick={onComplete}
          className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-all shadow-md shadow-violet-500/20">Mark Lesson Complete ✓</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Exercise {step+1} of {exercises.length}</span>
          <span className="font-bold text-amber-500">{score} XP earned</span>
        </div>
        <div className="flex gap-1.5 mt-2">
          {exercises.map((e,i)=>(
            <div key={e.id} className={`h-1.5 flex-1 rounded-full transition-all ${i < step ? 'bg-emerald-500' : i === step ? 'bg-violet-500' : 'bg-muted'}`}/>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-3">
          <div className="w-7 h-7 rounded-xl bg-violet-600 flex items-center justify-center text-white text-xs font-black flex-shrink-0">{step+1}</div>
          <p className="text-sm font-black text-foreground">{current.title}</p>
          <span className="ml-auto text-[10px] font-bold text-violet-500 dark:text-violet-400 border border-violet-200 dark:border-violet-500/25 px-1.5 py-0.5 rounded-full">+{current.xp} XP</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-muted/30 border border-border px-4 py-2.5">
            <p className="text-xs text-muted-foreground"><span className="font-bold text-foreground">Scenario: </span>{current.scenario}</p>
          </div>
          <p className="text-sm font-bold text-foreground">{current.question}</p>
          {current.type === 'calc' && (
            <div className="grid grid-cols-3 gap-3">
              {current.fields!.map((f,fi)=>(
                <div key={fi}>
                  <p className="text-[10px] text-muted-foreground font-semibold mb-1">{f.label}</p>
                  {f.editable ? (
                    <input value={answers[current.id] ?? ''}
                      onChange={e=>setAnswers(p=>({...p,[current.id]:e.target.value}))}
                      placeholder="Your answer" disabled={current.id in checked}
                      className="w-full text-sm bg-background border-2 border-violet-300 dark:border-violet-500/40 rounded-xl px-3 py-2 text-foreground font-mono font-black focus:outline-none focus:border-violet-500 disabled:opacity-60"/>
                  ) : (
                    <div className="bg-muted/40 border border-border rounded-xl px-3 py-2 text-sm font-black text-foreground/70">{f.value}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {current.type === 'mcq' && (
            <div className="space-y-2">
              {current.options!.map(opt=>{
                const isSelected = answers[current.id] === opt;
                const wasChecked = current.id in checked;
                const isCorrect = opt === current.correct;
                let cls = 'border-border bg-muted/30 text-foreground/70 hover:bg-muted';
                if (wasChecked) {
                  if (isCorrect) cls = 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
                  else if (isSelected) cls = 'border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400';
                  else cls = 'border-border bg-muted/20 text-muted-foreground opacity-50';
                } else if (isSelected) cls = 'border-violet-400 dark:border-violet-500/50 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400';
                return (
                  <button key={opt} disabled={wasChecked}
                    onClick={()=>setAnswers(p=>({...p,[current.id]:opt}))}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all disabled:cursor-default ${cls}`}>
                    <span className="w-5 h-5 rounded-full border-2 flex items-center justify-center text-[9px] font-black flex-shrink-0">{['A','B','C','D'][current.options!.indexOf(opt)]}</span>
                    {opt}
                    {wasChecked && isCorrect && <Check className="h-4 w-4 ml-auto flex-shrink-0"/>}
                  </button>
                );
              })}
            </div>
          )}
          {current.id in checked && (
            <motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}}
              className={`rounded-xl border p-3 text-sm ${checked[current.id] ? 'border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400' : 'border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/5 text-red-700 dark:text-red-400'}`}>
              <span className="font-black">{checked[current.id] ? '✅ Correct! ' : `❌ Incorrect — Correct answer: ${current.display ?? current.correct}. `}</span>
              {current.hint}
            </motion.div>
          )}
          <div className="flex items-center justify-between pt-2">
            <button disabled={step===0} onClick={()=>setStep(s=>s-1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-muted transition-all disabled:opacity-30">
              <ChevronLeft className="h-3.5 w-3.5"/> Back
            </button>
            {!(current.id in checked) ? (
              <button disabled={!answers[current.id]} onClick={checkAnswer}
                className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-all shadow-md shadow-violet-500/20 disabled:opacity-40">Check Answer</button>
            ) : (
              <button onClick={()=>{ if (isLast) setDone(true); else setStep(s=>s+1); }}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-all shadow-md shadow-violet-500/20">
                {isLast ? 'See Results' : 'Next Exercise'} <ChevronRight className="h-3.5 w-3.5"/>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── LESSON PAGE ───────────────────────────────────────────────────────────────
function LessonPage({ lesson, progress, gradient, allLessons, progMap, onBack, onComplete, onSave, onNavigate }: {
  lesson: Lesson; progress: Progress|undefined; gradient: string;
  allLessons: Lesson[]; progMap: Record<string, Progress>;
  onBack: ()=>void;
  onComplete: (id: string) => void; onSave: (id: string) => void;
  onNavigate: (lesson: Lesson) => void;
}) {
  const [tab,           setTab]           = useState<'lesson'|'examples'|'practice'|'notes'|'resources'>('lesson');
  const [notes,         setNotes]         = useState(progress?.notes ?? '');
  const [savingNotes,   setSavingNotes]   = useState(false);
  const [quizAnswers,   setQuizAnswers]   = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});
  const [aiMode,        setAiMode]        = useState('');
  const [aiAnswer,      setAiAnswer]      = useState('');
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiInput,       setAiInput]       = useState('');
  const { user } = useAuth();

  const done  = progress?.completed ?? false;
  const saved = progress?.saved ?? false;
  const pct   = done ? 100 : (progress?.progress_pct ?? 0);

  const catLessons = allLessons
    .filter(l => l.category === lesson.category)
    .sort((a, b) => a.order_index - b.order_index);
  const idx        = catLessons.findIndex(l => l.id === lesson.id);
  const prevLesson = catLessons[idx - 1] ?? null;
  const nextLesson = catLessons[idx + 1] ?? null;

  const callouts:  Callout[]      = Array.isArray(lesson.callouts)       ? lesson.callouts       : [];
  const quizQs:    QuizQuestion[] = Array.isArray(lesson.quiz_questions) ? lesson.quiz_questions : [];
  const takeaways: string[]       = lesson.key_takeaways ?? [];

  const diffCls: Record<string,string> = {
    beginner:     'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/25',
    intermediate: 'bg-muted text-muted-foreground border-border',
    advanced:     'bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-500/25',
  };

  const saveNotes = async () => {
    if (!user) return;
    setSavingNotes(true);
    await supabase.from('lesson_progress').upsert({
      user_id: user.id, lesson_id: lesson.id,
      progress_pct: pct, completed: done, saved, notes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' });
    setSavingNotes(false);
    toast({ title: 'Notes saved ✓' });
  };

  const askAI = async (prompt: string, mode: string) => {
    setAiMode(mode); setAiLoading(true); setAiAnswer('');
    try {
      const ctx = `Lesson: ${lesson.title}\nCategory: ${lesson.category}\n${lesson.description}\n${(lesson.content||'').slice(0,600)}`;
      const answer = await askLessonAI(`${ctx}\n\nInstruction: ${prompt}`);
      setAiAnswer(answer);
    } catch { setAiAnswer('Connection error.'); }
    finally { setAiLoading(false); }
  };


  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-0">

      {/* ── TOP BAR ── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <nav className="flex items-center gap-2 text-sm">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors font-medium">Learning Hub</button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40"/>
          <span className="text-muted-foreground font-medium">{lesson.category}</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40"/>
          <span className="text-foreground font-semibold truncate max-w-[220px]">{lesson.title}</span>
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={onBack}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-muted hover:text-foreground transition-all">
            <ChevronLeft className="h-3.5 w-3.5"/> Back to Lessons
          </button>
          <button onClick={() => onSave(lesson.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${saved ? 'bg-muted border-border text-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}>
            {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-violet-500"/> : <Bookmark className="h-3.5 w-3.5"/>}
            Save Lesson
          </button>
          <button onClick={() => onComplete(lesson.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md ${done ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20'}`}>
            <CheckCircle2 className="h-3.5 w-3.5"/>
            {done ? '✓ Mark as Completed' : 'Mark as Completed'}
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        {/* ════ LEFT ════ */}
        <div className="flex-1 min-w-0 space-y-0">

          {/* Header card */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden mb-5">
            <div className="flex gap-0 flex-col sm:flex-row">
              <div className={`flex-shrink-0 bg-gradient-to-br ${gradient} flex flex-col items-center justify-center p-5 text-center`}
                style={{ width: 220, minHeight: 180 }}>
                <p className="text-[9px] font-black text-white/35 uppercase tracking-widest mb-2">{lesson.category}</p>
                <p className="text-xl font-black text-white leading-tight uppercase text-center mb-3">
                  {lesson.subcategory || lesson.tags?.[0] || lesson.category}
                </p>
                {lesson.tags?.[0] && (
                  <span className="text-[10px] font-bold text-white/60 bg-white/10 border border-white/15 px-3 py-1 rounded-full">
                    {lesson.tags[0]}
                  </span>
                )}
              </div>
              <div className="flex-1 p-5">
                <span className="inline-block text-[11px] font-bold bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 px-2.5 py-1 rounded-lg mb-3">
                  {lesson.category}
                </span>
                <h1 className="text-2xl font-black text-foreground mb-1.5">{lesson.title}</h1>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{lesson.description}</p>
                <div className="flex items-center gap-3 flex-wrap mb-4">
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border capitalize ${diffCls[lesson.difficulty] ?? 'bg-muted border-border text-muted-foreground'}`}>
                    {lesson.difficulty}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5"/> {lesson.read_time_min} min
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500">
                    <Zap className="h-3.5 w-3.5"/> +{lesson.xp_reward} XP
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                    <span>Your Progress</span>
                    <span className={`font-bold ${done ? 'text-emerald-500' : ''}`}>{pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                      className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-violet-500'}`}/>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 border-b border-border mb-6">
            {([
              { id:'lesson',    label:'Lesson' },
              { id:'examples',  label:'Examples' },
              { id:'practice',  label:'Practice' },
              { id:'notes',     label:'Notes' },
              { id:'resources', label:'Resources' },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px whitespace-nowrap ${tab === t.id ? 'border-violet-500 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">

            {tab === 'lesson' && (
              <motion.div key="lesson" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }} className="space-y-5">
                <div className="rounded-2xl border border-border bg-card p-6">
                  {renderRichContent(lesson, callouts)}
                </div>

                {takeaways.length > 0 && (
                  <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-5">
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-4">
                      <CheckCircle2 className="h-4 w-4"/> Key Takeaways
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {takeaways.map((t, i) => (
                        <div key={i} className="flex items-start gap-2.5 bg-white/60 dark:bg-white/[0.03] rounded-xl p-3 border border-emerald-200/60 dark:border-emerald-500/10">
                          <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5"/>
                          <p className="text-sm text-emerald-800 dark:text-emerald-300/85 leading-snug">{t}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'examples' && (
              <motion.div key="examples" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label:'Bullish Setup ↑', bg:'from-emerald-900 to-emerald-700', tag:'VALID', desc:`Price leaves a gap up and returns to fill it. This is a Bullish ${lesson.title}.` },
                    { label:'Bearish Setup ↓', bg:'from-red-900 to-red-800',          tag:'VALID', desc:`Price leaves a gap down and returns to fill it. This is a Bearish ${lesson.title}.` },
                  ].map(ex => (
                    <div key={ex.label} className="rounded-2xl border border-border bg-card overflow-hidden">
                      <div className={`bg-gradient-to-br ${ex.bg} h-44 flex items-center justify-center`}>
                        <div className="text-center">
                          <p className="text-white/50 text-xs uppercase tracking-widest mb-1">{lesson.tags?.[0] || lesson.category}</p>
                          <div className="text-2xl font-black text-white">{ex.label}</div>
                          <span className="mt-2 inline-block text-[10px] font-black text-white/70 bg-white/10 border border-white/20 px-2.5 py-1 rounded-full">{ex.tag}</span>
                        </div>
                      </div>
                      <div className="px-4 py-3 border-t border-border">
                        <p className="text-xs text-muted-foreground leading-relaxed">{ex.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-black text-foreground mb-2">Real Chart Examples</p>
                  <p className="text-xs text-muted-foreground mb-4">Use the AI assistant to get specific chart examples for this concept.</p>
                  <button onClick={() => { askAI(`Give me a detailed step-by-step example of ${lesson.title} on Gold (XAUUSD) chart. Include: exact price levels, which candles form the pattern, entry price, stop loss, take profit, and final outcome.`, 'example'); setTab('lesson'); }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-colors shadow-md shadow-violet-500/20">
                    <Sparkles className="h-3.5 w-3.5"/> Generate AI Chart Example
                  </button>
                </div>
              </motion.div>
            )}

            {tab === 'practice' && (
              <motion.div key="practice" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }} className="space-y-4">
                {quizQs.length > 0 ? (
                  <>
                    <div className="flex items-center justify-between">
                      <p className="text-base font-black text-foreground flex items-center gap-2"><Target className="h-5 w-5 text-violet-500"/> Knowledge Check</p>
                      <span className="text-xs text-muted-foreground">{quizQs.length} questions</span>
                    </div>
                    {quizQs.map((q, qi) => {
                      const sel  = quizAnswers[q.id];
                      const sub  = quizSubmitted[q.id];
                      const ok   = sub && sel === q.correct;
                      return (
                        <div key={q.id} className="rounded-2xl border border-border bg-card p-5">
                          <p className="text-sm font-bold text-foreground mb-4">
                            <span className="text-violet-500 mr-2">Q{qi+1}.</span>{q.question}
                          </p>
                          <div className="space-y-2 mb-4">
                            {q.options.map((opt, oi) => {
                              let cls = 'border-border bg-muted/30 text-foreground/70 hover:bg-muted';
                              if (sub) {
                                if (oi === q.correct)  cls = 'border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
                                else if (oi === sel)   cls = 'border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400';
                                else                   cls = 'border-border bg-muted/20 text-muted-foreground';
                              } else if (sel === oi)    cls = 'border-violet-400 dark:border-violet-500/50 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400';
                              return (
                                <button key={oi} disabled={sub}
                                  onClick={() => setQuizAnswers(p => ({ ...p, [q.id]: oi }))}
                                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all disabled:cursor-default ${cls}`}>
                                  <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[10px] font-black">
                                    {['A','B','C','D'][oi]}
                                  </span>
                                  {opt}
                                  {sub && oi === q.correct && <Check className="h-4 w-4 ml-auto flex-shrink-0"/>}
                                </button>
                              );
                            })}
                          </div>
                          {!sub ? (
                            <button onClick={() => setQuizSubmitted(p => ({ ...p, [q.id]: true }))}
                              disabled={sel === undefined}
                              className="px-5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-colors shadow-md shadow-violet-500/20 disabled:opacity-40">
                              Submit Answer
                            </button>
                          ) : (
                            <div className={`rounded-xl border p-3 text-sm leading-relaxed ${ok ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 text-emerald-700 dark:text-emerald-400' : 'border-red-200 dark:border-red-500/20 bg-red-50 dark:bg-red-500/5 text-red-700 dark:text-red-400'}`}>
                              <span className="font-bold">{ok ? '✅ Correct! ' : '❌ Incorrect — '}</span>{q.explanation}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {Object.keys(quizSubmitted).length === quizQs.length && (
                      <div className="rounded-2xl border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/5 p-5 text-center">
                        {(() => {
                          const score = quizQs.filter(q => quizAnswers[q.id] === q.correct).length;
                          return (
                            <>
                              <p className="text-3xl font-black text-foreground">{score}/{quizQs.length}</p>
                              <p className="text-sm text-muted-foreground mt-1">{score === quizQs.length ? '🎉 Perfect! Move to the next lesson.' : 'Review the material and try again.'}</p>
                              <button onClick={() => { setQuizAnswers({}); setQuizSubmitted({}); }} className="mt-3 text-xs text-violet-500 hover:opacity-70 transition-opacity">Reset Quiz</button>
                            </>
                          );
                        })()}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <p className="text-sm font-black text-foreground mb-1 flex items-center gap-2"><Target className="h-4 w-4 text-violet-500"/> AI Practice Exercises</p>
                    <p className="text-xs text-muted-foreground mb-4">Generate custom exercises using the AI below.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { l:'Generate Quiz',    p:`Create a 4-question multiple choice quiz about "${lesson.title}". Mark answers and explain each.` },
                        { l:'Spot the Setup',   p:`Describe a chart where "${lesson.title}" appears. Ask me to identify it.` },
                        { l:'Step-by-Step Drill', p:`Create a step-by-step practice drill for "${lesson.title}" with specific chart scenarios.` },
                        { l:'Test My Knowledge', p:`Ask me 3 hard questions about "${lesson.title}" with increasing difficulty.` },
                      ].map(a => (
                        <button key={a.l} onClick={() => { askAI(a.p, 'practice'); setTab('lesson'); }}
                          className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-muted/30 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all text-left">
                          <Brain className="h-4 w-4 text-violet-500 flex-shrink-0"/>{a.l}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {tab === 'notes' && (
              <motion.div key="notes" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }}>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-black text-foreground mb-1 flex items-center gap-2"><FileText className="h-4 w-4 text-violet-500"/> My Notes</p>
                  <p className="text-xs text-muted-foreground mb-4">Notes are saved to your account and visible only to you.</p>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder={`Your notes for "${lesson.title}"...\n\n💡 Tips:\n- Write key concepts in your own words\n- Note your questions to research later\n- Record real chart examples you spot\n- Write what you would do differently`}
                    rows={14}
                    className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3.5 text-foreground placeholder:text-muted-foreground/25 focus:outline-none focus:border-violet-500/40 resize-none leading-relaxed font-mono"/>
                  <div className="flex items-center justify-between mt-3">
                    <p className="text-[10px] text-muted-foreground/50">{notes.length} characters</p>
                    <button onClick={saveNotes} disabled={savingNotes}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black transition-colors shadow-md shadow-violet-500/20 disabled:opacity-40">
                      {savingNotes ? <RefreshCw className="h-3.5 w-3.5 animate-spin"/> : <Check className="h-3.5 w-3.5"/>}
                      {savingNotes ? 'Saving...' : 'Save Notes'}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {tab === 'resources' && (
              <motion.div key="resources" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.15 }} className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-black text-foreground mb-4 flex items-center gap-2"><BookOpen className="h-4 w-4 text-violet-500"/> Downloads</p>
                  <div className="space-y-2">
                    {[
                      { icon:'📄', label:`${lesson.title} Cheat Sheet`, type:'PDF' },
                      { icon:'✅', label:`${lesson.category} Guide`,     type:'PDF' },
                      { icon:'📋', label:`${lesson.title} Checklist`,    type:'PDF' },
                    ].map(r => (
                      <div key={r.label} className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 transition-colors">
                        <span className="text-xl">{r.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">{r.label}</p>
                          <p className="text-[10px] text-muted-foreground">{r.type}</p>
                        </div>
                        <span className="text-[10px] font-bold text-violet-500 dark:text-violet-400 hover:opacity-70 cursor-pointer transition-opacity">Download</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-black text-foreground mb-3">Related Lessons</p>
                  <div className="space-y-1.5">
                    {allLessons.filter(l => l.category === lesson.category && l.id !== lesson.id).slice(0, 5).map(l => {
                      const p = progMap[l.id];
                      return (
                        <button key={l.id} onClick={() => onNavigate(l)} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors text-left">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${p?.completed ? 'border-emerald-500 bg-emerald-500' : 'border-border'}`}>
                            {p?.completed ? <Check className="h-3 w-3 text-white"/> : <Play className="h-2.5 w-2.5 text-muted-foreground/30 ml-0.5"/>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{l.title}</p>
                            <p className="text-[10px] text-muted-foreground">{l.read_time_min} min · {l.difficulty}</p>
                          </div>
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0"/>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom nav */}
          <div className="flex items-center justify-between pt-5 mt-5 border-t border-border">
            <button
              onClick={() => prevLesson && onNavigate(prevLesson)}
              disabled={!prevLesson}
              className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-border bg-card hover:bg-muted transition-all disabled:opacity-25 disabled:cursor-default text-left max-w-[220px]">
              <ChevronLeft className="h-5 w-5 text-muted-foreground flex-shrink-0"/>
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium">Previous Lesson</p>
                <p className="text-sm font-bold text-foreground truncate">{prevLesson?.title ?? '—'}</p>
              </div>
            </button>
            <span className="text-xs font-medium text-muted-foreground">
              Lesson {idx + 1} of {catLessons.length}
            </span>
            <button
              onClick={() => nextLesson && onNavigate(nextLesson)}
              disabled={!nextLesson}
              className="flex items-center gap-3 px-5 py-3.5 rounded-2xl border border-border bg-card hover:bg-muted transition-all disabled:opacity-25 disabled:cursor-default text-right max-w-[220px]">
              <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground font-medium">Next Lesson</p>
                <p className="text-sm font-bold text-foreground truncate">{nextLesson?.title ?? '—'}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0"/>
            </button>
          </div>
        </div>

        {/* ════ RIGHT SIDEBAR ════ */}
        <div className="w-[280px] flex-shrink-0 space-y-4 hidden lg:block">

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-sm font-black text-foreground mb-4">Your Progress</p>
            <div className="flex items-center gap-4 mb-4">
              <div className="relative w-20 h-20 flex-shrink-0">
                {(()=>{
                  const r=34, circ=2*Math.PI*r;
                  const color = done ? '#10b981' : '#7c3aed';
                  return (
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 80 80" width="80" height="80">
                      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="6" className="stroke-muted"/>
                      <motion.circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="6"
                        strokeDasharray={circ} initial={{ strokeDashoffset: circ }}
                        animate={{ strokeDashoffset: circ * (1 - pct / 100) }}
                        transition={{ duration: 1.2, ease }}
                        strokeLinecap="round"/>
                    </svg>
                  );
                })()}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-foreground leading-none">{pct}%</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5">{done ? 'Done' : 'Progress'}</span>
                </div>
              </div>
              <div className="space-y-2 flex-1">
                <div>
                  <p className="text-[10px] text-muted-foreground">Lessons Completed</p>
                  <p className="text-sm font-black text-foreground">
                    {Object.values(progMap).filter(p=>p.completed).length} / {allLessons.length}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">XP Earned</p>
                  <p className="text-sm font-black text-amber-500">
                    {Object.entries(progMap).filter(([,p])=>p.completed).reduce((s,[id])=>{const l=allLessons.find(x=>x.id===id);return s+(l?.xp_reward??0);},0)} XP
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">Current Streak</p>
                  <p className="text-sm font-black text-foreground">🔥 7 days</p>
                </div>
              </div>
            </div>
            <button onClick={() => onComplete(lesson.id)}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all ${done ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-500/20'}`}>
              <CheckCircle2 className="h-3.5 w-3.5"/> {done ? '✓ Completed' : 'Mark as Completed'}
            </button>
          </div>

          {/* Roadmap */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-black text-foreground mb-1">Course Roadmap</p>
            <p className="text-[10px] text-muted-foreground mb-3">
              {lesson.category} · {catLessons.filter(l=>progMap[l.id]?.completed).length}/{catLessons.length} completed
            </p>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
              <div className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.round((catLessons.filter(l=>progMap[l.id]?.completed).length/Math.max(catLessons.length,1))*100)}%` }}/>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {catLessons.map((l, i) => {
                const p = progMap[l.id];
                const isCurrent = l.id === lesson.id;
                return (
                  <button key={l.id} onClick={() => !isCurrent && onNavigate(l)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-all text-left ${isCurrent ? 'bg-violet-50 dark:bg-violet-500/10' : 'hover:bg-muted/40'}`}>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[9px] font-black transition-all ${
                      p?.completed ? 'border-emerald-500 bg-emerald-500 text-white'
                      : isCurrent  ? 'border-violet-500 bg-violet-500 text-white'
                      : 'border-border text-muted-foreground/60'
                    }`}>
                      {p?.completed ? <Check className="h-3 w-3"/> : isCurrent ? <Play className="h-2.5 w-2.5 ml-0.5"/> : <span>{i+1}</span>}
                    </div>
                    <p className={`text-[11px] leading-snug flex-1 min-w-0 truncate ${
                      isCurrent     ? 'text-violet-600 dark:text-violet-400 font-bold'
                      : p?.completed ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-foreground/60'
                    }`}>{l.title}</p>
                    {p?.completed && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0"/>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI Tutor */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-3.5 w-3.5 text-white"/>
              </div>
              <div>
                <p className="text-xs font-black text-foreground">AI Tutor</p>
              </div>
              <span className="ml-auto text-[9px] font-bold bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-500/20">Beta</span>
            </div>
            <div className="p-3 space-y-2">
              {[
                { icon:'💡', label:'Explain this concept simply',   prompt:`Explain "${lesson.title}" like I am a beginner. Use a simple real-world analogy.` },
                { icon:'📈', label:'Give me a real market example',  prompt:`Give a specific real-world example of "${lesson.title}" on Gold or NAS100 with entry, stop, target.` },
                { icon:'🎯', label:'Test my understanding',          prompt:`Test my understanding of "${lesson.title}" with 2 scenario-based questions.` },
                { icon:'📝', label:'Create a quiz for me',           prompt:`Create a 3-question multiple choice quiz about "${lesson.title}" with answers and explanations.` },
                { icon:'⚡', label:'Challenge me',                   prompt:`Give me a challenging chart scenario involving "${lesson.title}" and ask me what I would do.` },
              ].map(a => (
                <button key={a.label} onClick={() => askAI(a.prompt, a.label)} disabled={aiLoading}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-xs font-medium transition-all disabled:opacity-40 ${aiMode === a.label && (aiLoading || aiAnswer) ? 'border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400' : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <span className="text-sm flex-shrink-0">{a.icon}</span>
                  <span className="leading-snug">{a.label}</span>
                </button>
              ))}
              <div className="flex gap-1.5 pt-1">
                <input value={aiInput} onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && aiInput.trim() && askAI(aiInput, 'custom')}
                  placeholder="Ask anything about this lesson..."
                  className="flex-1 text-xs bg-background border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground/35 focus:outline-none focus:border-violet-500/40"/>
                <button onClick={() => aiInput.trim() && askAI(aiInput, 'custom')} disabled={aiLoading || !aiInput.trim()}
                  className="p-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40 flex-shrink-0">
                  {aiLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin"/> : <ChevronRight className="h-3.5 w-3.5"/>}
                </button>
              </div>
              <AnimatePresence>
                {(aiLoading || aiAnswer) && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-xl border border-border bg-background p-3 max-h-52 overflow-y-auto">
                      {aiLoading
                        ? <div className="flex items-center gap-2 text-xs text-muted-foreground"><RefreshCw className="h-3.5 w-3.5 animate-spin text-violet-500"/>Thinking...</div>
                        : <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{aiAnswer}</p>
                      }
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Resources */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-sm font-black text-foreground mb-3">Resources</p>
            <div className="space-y-2">
              {[
                { icon:'📄', color:'text-red-500',    label:`${lesson.tags?.[0]||lesson.title} Cheat Sheet (PDF)` },
                { icon:'📘', color:'text-blue-500',   label:`${lesson.category} Guide` },
                { icon:'✅', color:'text-emerald-500', label:`${lesson.tags?.[0]||lesson.title} Checklist` },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-2.5">
                  <span className={`text-lg flex-shrink-0 ${r.color}`}>{r.icon}</span>
                  <p className="text-xs text-foreground/70 flex-1 truncate">{r.label}</p>
                  <span className="text-[10px] font-bold text-violet-500 dark:text-violet-400 flex-shrink-0 cursor-pointer hover:opacity-70 transition-opacity">Download</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── HUB AI ASSISTANT ──────────────────────────────────────────────────────────
function HubAI({ lessons }: { lessons:Lesson[] }) {
  const [q,setQ]     = useState('');
  const [ans,setAns] = useState('');
  const [loading,setLoading] = useState(false);

  const ask = async (override?:string) => {
    const text=(override??q).trim(); if(!text) return;
    if(override) setQ(override);
    setLoading(true); setAns('');
    const ctx=lessons.slice(0,30).map(l=>`${l.title}: ${l.description??''}`).join('\n');
    const result = await askLessonAI(`Trading coach. Lessons: ${ctx}\n\nAnswer in 3 sentences.\nQ: ${text}`);
    setAns(result);
    setLoading(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-violet-500"/>
        <p className="text-xs font-black text-foreground flex-1">AI Learning Assistant</p>
        <span className="text-[9px] font-bold bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-500/20">BETA</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex gap-2">
          <input value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&ask()}
            placeholder="Ask anything..."
            className="flex-1 text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40"/>
          <button onClick={()=>ask()} disabled={loading||!q.trim()}
            className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40">
            {loading?<RefreshCw className="h-3.5 w-3.5 animate-spin"/>:<ChevronRight className="h-3.5 w-3.5"/>}
          </button>
        </div>
        <AnimatePresence>
          {ans&&(<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="overflow-hidden">
            <div className="rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/5 p-3">
              <p className="text-xs text-foreground/75 leading-relaxed">{ans}</p>
            </div>
          </motion.div>)}
        </AnimatePresence>
        <div className="flex flex-wrap gap-1.5">
          {lessons.slice(0,3).map(l=>(
            <button key={l.id} onClick={()=>ask(`Explain: ${l.title}`)}
              className="text-[9px] font-medium px-2 py-1 rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors">
              Explain: {l.title.split(' ').slice(0,3).join(' ')}...
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── COURSE SIDEBAR ────────────────────────────────────────────────────────────
function CourseSidebar({
  categories, lessons, progMap, selectedLessonId, onSelect, search, onSearch,
}: {
  categories: (Category & { count: number })[];
  lessons: Lesson[];
  progMap: Record<string, Progress>;
  selectedLessonId: string | null;
  onSelect: (l: Lesson) => void;
  search: string;
  onSearch: (s: string) => void;
}) {
  const lessonsByCat = useMemo(() => {
    const m: Record<string, Lesson[]> = {};
    lessons.forEach(l => { (m[l.category] = m[l.category] || []).push(l); });
    Object.values(m).forEach(arr => arr.sort((a, b) => a.order_index - b.order_index));
    return m;
  }, [lessons]);

  const catStats = (catName: string) => {
    const ls = lessonsByCat[catName] || [];
    const done = ls.filter(l => progMap[l.id]?.completed).length;
    return { total: ls.length, done, pct: ls.length ? Math.round((done / ls.length) * 100) : 0 };
  };

  const selectedCat = lessons.find(l => l.id === selectedLessonId)?.category;
  const [open, setOpen] = useState<Record<string, boolean>>({});

  // Auto-open category containing selected lesson, default first cat open
  useEffect(() => {
    setOpen(prev => {
      const next = { ...prev };
      if (selectedCat && !(selectedCat in next)) next[selectedCat] = true;
      if (categories[0] && Object.keys(next).length === 0) next[categories[0].name] = true;
      return next;
    });
  }, [selectedCat, categories]);

  const filterMatch = (l: Lesson) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return l.title.toLowerCase().includes(q) || (l.tags || []).some(t => t.toLowerCase().includes(q));
  };

  return (
    <aside className="w-72 flex-shrink-0 hidden lg:flex flex-col rounded-2xl border border-border bg-card overflow-hidden self-start sticky top-4 max-h-[calc(100vh-2rem)]">
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50 pointer-events-none" />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search lessons..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-500/40"
          />
        </div>
        <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mt-3 px-1">Categories</p>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {categories.map(cat => {
          const ls = (lessonsByCat[cat.name] || []).filter(filterMatch);
          const stats = catStats(cat.name);
          const isOpen = !!open[cat.name] || (!!search.trim() && ls.length > 0);
          const hasSelected = ls.some(l => l.id === selectedLessonId);

          return (
            <div key={cat.id} className="px-2">
              <button
                onClick={() => setOpen(o => ({ ...o, [cat.name]: !isOpen }))}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                  hasSelected ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'hover:bg-muted text-foreground'
                }`}
              >
                <ChevronRight className={`h-3.5 w-3.5 transition-transform flex-shrink-0 ${isOpen ? 'rotate-90' : ''} ${hasSelected ? 'text-violet-500' : 'text-muted-foreground'}`} />
                <span className="text-base flex-shrink-0">{cat.emoji}</span>
                <span className="text-xs font-bold flex-1 truncate">{cat.name}</span>
                <span className="text-[9px] font-bold text-muted-foreground flex-shrink-0">{stats.done}/{stats.total}</span>
              </button>

              {stats.total > 0 && (
                <div className="mx-2.5 mb-1 h-0.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${stats.pct}%` }} />
                </div>
              )}

              <AnimatePresence initial={false}>
                {isOpen && ls.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease }}
                    className="overflow-hidden"
                  >
                    <div className="ml-3 pl-3 border-l border-border my-1 space-y-0.5">
                      {ls.map(l => {
                        const p = progMap[l.id];
                        const done = p?.completed ?? false;
                        const inProg = !done && (p?.progress_pct ?? 0) > 0;
                        const locked = l.is_premium || l.is_pro;
                        const active = l.id === selectedLessonId;
                        return (
                          <button
                            key={l.id}
                            onClick={() => onSelect(l)}
                            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left text-xs transition-colors group ${
                              active
                                ? 'bg-violet-600 text-white font-bold'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`}
                          >
                            <span className="flex-1 truncate leading-tight">{l.title}</span>
                            <span className="flex-shrink-0">
                              {locked ? (
                                <Lock className={`h-3 w-3 ${active ? 'text-white/80' : 'text-amber-500'}`} />
                              ) : done ? (
                                <CheckCircle2 className={`h-3.5 w-3.5 ${active ? 'text-white' : 'text-emerald-500'}`} />
                              ) : inProg ? (
                                <div className={`h-2.5 w-2.5 rounded-full ${active ? 'bg-white' : 'bg-violet-500'} animate-pulse`} />
                              ) : (
                                <Circle className={`h-3 w-3 ${active ? 'text-white/70' : 'text-muted-foreground/40'}`} />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="p-3 border-t border-border bg-gradient-to-br from-violet-500/10 to-violet-600/5">
        <div className="flex items-center gap-2 mb-1.5">
          <Crown className="h-3.5 w-3.5 text-violet-500" />
          <p className="text-xs font-black text-foreground">Upgrade to Pro</p>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2 leading-snug">Unlock all courses, AI tutor, and more.</p>
        <button className="w-full bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-black py-2 rounded-lg transition-colors">
          Start 7-day free trial
        </button>
      </div>
    </aside>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function LearningHub() {
  const { user } = useAuth();

  const [view,           setView]           = useState<'hub'|'lesson'>('hub');
  const [selectedLesson, setSelectedLesson] = useState<Lesson|null>(null);

  const [categories,  setCategories]  = useState<Category[]>([]);
  const [lessons,     setLessons]     = useState<Lesson[]>([]);
  const [progMap,     setProgMap]     = useState<Record<string,Progress>>({});
  const [stats,       setStats]       = useState<Stats>({xp_total:0,streak_days:0,hours_studied:0,current_focus:null});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading,     setLoading]     = useState(true);

  const [search,     setSearch]     = useState('');
  const [activeTab,  setActiveTab]  = useState<'all'|'in_progress'|'completed'|'saved'>('all');
  const [activeCat,  setActiveCat]  = useState('');
  const [filterDiff, setFilterDiff] = useState('');
  const [showMore,   setShowMore]   = useState(10);

  const load = useCallback(async()=>{
    if(!user) return;
    setLoading(true);
    const [cR,lR,pR,sR,lbR] = await Promise.all([
      (supabase.from('learning_categories' as any).select('*').order('order_index') as any),
      supabase.from('lessons').select('*').order('category').order('order_index'),
      supabase.from('lesson_progress').select('*').eq('user_id',user.id),
      supabase.from('learning_stats').select('*').eq('user_id',user.id).maybeSingle(),
      (supabase.rpc('get_leaderboard' as any) as any),
    ]);
    setCategories(((cR as any).data as Category[])??[]);
    setLessons(((lR.data as unknown) as Lesson[])??[]);
    const pm:Record<string,Progress>={};
    (pR.data??[]).forEach((p:any)=>{pm[p.lesson_id]=p as Progress;});
    setProgMap(pm);
    if(sR.data) setStats(sR.data as unknown as Stats);
    setLeaderboard(((lbR as any).data as LeaderboardEntry[])??[]);
    setLoading(false);
  },[user]);

  useEffect(()=>{load();},[load]);

  const catGrad   = useMemo(()=>{const m:Record<string,string>={};categories.forEach(c=>{m[c.name]=c.gradient;});return m;},[categories]);
  const catCounts = useMemo(()=>{
    const cnt:Record<string,number>={};
    lessons.forEach(l=>{cnt[l.category]=(cnt[l.category]??0)+1;});
    return categories.map(c=>({...c,count:cnt[c.name]??0}));
  },[categories,lessons]);

  const filtered = useMemo(()=>{
    const q=search.toLowerCase().trim();
    return lessons.filter(l=>{
      if(q){const hay=[l.title,l.description??'',l.category,...(l.tags??[])].join(' ').toLowerCase();if(!hay.includes(q))return false;}
      if(activeCat && l.category!==activeCat) return false;
      if(filterDiff && l.difficulty!==filterDiff) return false;
      if(activeTab==='in_progress'){const p=progMap[l.id];return!!(p&&p.progress_pct>0&&!p.completed);}
      if(activeTab==='completed') return!!progMap[l.id]?.completed;
      if(activeTab==='saved')     return!!progMap[l.id]?.saved;
      return true;
    });
  },[lessons,search,activeCat,filterDiff,activeTab,progMap]);

  const completedCount = useMemo(()=>Object.values(progMap).filter(p=>p.completed).length,[progMap]);
  const savedCount     = useMemo(()=>Object.values(progMap).filter(p=>p.saved).length,[progMap]);
  const inProgCount    = useMemo(()=>Object.values(progMap).filter(p=>p.progress_pct>0&&!p.completed).length,[progMap]);
  const nextLesson     = useMemo(()=>lessons.find(l=>!progMap[l.id]?.completed),[lessons,progMap]);
  const hasFilters     = !!(search||activeCat||filterDiff||activeTab!=='all');

  const upsertProg = async(lessonId:string,patch:Partial<Progress>)=>{
    if(!user) return;
    const cur=progMap[lessonId]??({} as Partial<Progress>);
    const next={...cur,...patch} as Progress;
    setProgMap(prev=>({...prev,[lessonId]:{...prev[lessonId],...patch,lesson_id:lessonId} as Progress}));
    await supabase.from('lesson_progress').upsert({
      user_id:user.id,lesson_id:lessonId,
      progress_pct:next.progress_pct??0,completed:next.completed??false,
      saved:next.saved??false,notes:next.notes??null,
      completed_at:next.completed?new Date().toISOString():null,
      updated_at:new Date().toISOString(),
    },{onConflict:'user_id,lesson_id'});
  };

  const toggleSave = async(id:string)=>{
    const cur=progMap[id]?.saved??false;
    await upsertProg(id,{saved:!cur});
    toast({title:!cur?'🔖 Saved':'Removed'});
  };

  const toggleComplete = async(id:string)=>{
    const l=lessons.find(x=>x.id===id);
    const cur=progMap[id]?.completed??false;
    const newDone=!cur;
    await upsertProg(id,{completed:newDone,progress_pct:newDone?100:0});
    if(newDone&&l){
      toast({title:`✅ +${l.xp_reward} XP`});
      const nXP=stats.xp_total+l.xp_reward, nH=stats.hours_studied+l.read_time_min/60;
      await supabase.from('learning_stats').upsert({user_id:user!.id,xp_total:nXP,hours_studied:nH,last_study_date:new Date().toISOString().split('T')[0],streak_days:stats.streak_days,updated_at:new Date().toISOString()},{onConflict:'user_id'});
      await supabase.rpc('update_learning_streak',{p_user_id:user!.id});
      setStats(s=>({...s,xp_total:nXP,hours_studied:nH}));
      if(selectedLesson?.id===id) setProgMap(prev=>({...prev,[id]:{...prev[id],completed:true,progress_pct:100} as Progress}));
    } else if(!newDone){ toast({title:'Marked incomplete'}); }
  };

  const openLesson = (l:Lesson)=>{
    setSelectedLesson(l);
    setView('lesson');
    window.scrollTo({top:0,behavior:'smooth'});
  };
  const backToHub=()=>{ setView('hub'); setSelectedLesson(null); };

  const sidebar = (
    <CourseSidebar
      categories={catCounts}
      lessons={lessons}
      progMap={progMap}
      selectedLessonId={selectedLesson?.id ?? null}
      onSelect={openLesson}
      search={search}
      onSearch={setSearch}
    />
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-5 items-start">
      {sidebar}

      <div className="flex-1 min-w-0 space-y-6">
        {view === 'lesson' && selectedLesson ? (
          <LessonPage
            lesson={selectedLesson}
            progress={progMap[selectedLesson.id]}
            gradient={catGrad[selectedLesson.category] ?? 'from-slate-800 to-slate-600'}
            allLessons={lessons}
            progMap={progMap}
            onBack={backToHub}
            onComplete={toggleComplete}
            onSave={toggleSave}
            onNavigate={openLesson}
          />
        ) : (
          <>
            <div className="rounded-3xl border border-border bg-card overflow-hidden">
              <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border">
                <div className="flex-1 p-6">
                  <p className="text-sm text-muted-foreground mb-0.5">Welcome back,</p>
                  <h2 className="text-2xl font-black text-foreground mb-1">{user?.email?.split('@')[0] ?? 'Trader'} 👋</h2>
                  <p className="text-xs text-muted-foreground mb-4">Pick a lesson from the course tree to begin.</p>
                  {stats.streak_days > 0 && (
                    <div className="inline-flex items-center gap-1.5 bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400 rounded-full px-3 py-1.5 text-xs font-black">
                      <Flame className="h-3.5 w-3.5" /> {stats.streak_days} DAY STREAK
                    </div>
                  )}
                </div>
                {[
                  { label: 'Courses Completed', value: `${completedCount}`, sub: `of ${lessons.length}` },
                  { label: 'Hours Studied', value: `${stats.hours_studied.toFixed(1)}h`, sub: 'Total' },
                  { label: 'XP Points', value: `${stats.xp_total} XP`, sub: `Level ${Math.floor(stats.xp_total / 200) + 1}` },
                ].map(s => (
                  <div key={s.label} className="flex-1 p-5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">{s.label}</p>
                    <p className="text-2xl font-black text-foreground">{s.value}</p>
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">{s.sub}</p>
                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${Math.min(100, (completedCount / Math.max(lessons.length, 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {nextLesson && (
                <div className="flex items-center gap-4 px-6 py-3.5 bg-violet-50 dark:bg-violet-500/5 border-t border-violet-200 dark:border-violet-500/15 flex-wrap">
                  <Sparkles className="h-4 w-4 text-violet-500 flex-shrink-0" />
                  <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 flex-shrink-0">AI Recommendation</p>
                  <p className="text-xs text-muted-foreground flex-shrink-0">Next lesson for you:</p>
                  <p className="text-sm font-black text-foreground flex-1 min-w-0 truncate">{nextLesson.title}</p>
                  <button onClick={() => openLesson(nextLesson)}
                    className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md shadow-violet-500/20 transition-all flex-shrink-0">
                    Continue Learning
                  </button>
                </div>
              )}
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <HubAI lessons={lessons} />
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="text-xs font-black text-foreground mb-3 flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-violet-500" /> Top Students</p>
                {leaderboard.length === 0 ? (
                  <div className="text-center py-4"><p className="text-xs text-muted-foreground">Complete lessons to appear here</p></div>
                ) : (
                  <div className="space-y-2.5">
                    {leaderboard.map((e, i) => { const isYou = e.user_id === user?.id; return (
                      <div key={e.user_id} className="flex items-center gap-3">
                        <span className={`text-sm font-black w-4 flex-shrink-0 ${i === 0 ? 'text-violet-500' : 'text-muted-foreground/50'}`}>{i + 1}</span>
                        <div className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 ${isYou ? 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/20' : 'bg-muted border-border'}`}>
                          <span className={`text-[10px] font-black ${isYou ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>{isYou ? 'You' : e.display_name.slice(0, 2).toUpperCase()}</span>
                        </div>
                        <div className="flex-1 min-w-0"><p className={`text-xs font-bold truncate ${isYou ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>{isYou ? 'You' : e.display_name}</p><p className="text-[9px] text-muted-foreground">Level {e.level}</p></div>
                        <span className={`text-[10px] font-black flex-shrink-0 ${isYou ? 'text-emerald-600 dark:text-emerald-400' : 'text-violet-500 dark:text-violet-400'}`}>{e.xp_total.toLocaleString()} XP</span>
                      </div>
                    ); })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

