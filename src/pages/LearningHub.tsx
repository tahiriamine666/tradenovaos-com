import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, Clock, Bookmark, BookmarkCheck, CheckCircle2,
  Sparkles, ChevronRight, ChevronLeft, Play, Lock, Flame,
  Trophy, RefreshCw, RotateCcw, ChevronDown, BookOpen,
  Check, Target, Brain, FileText, Zap, X,
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
  callouts:Callout[];
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

// ── LESSON PAGE ───────────────────────────────────────────────────────────────
function LessonPage({ lesson, progress, gradient, allLessons, progMap, catLessonsIdx, onBack, onComplete, onSave }: {
  lesson:Lesson; progress:Progress|undefined; gradient:string;
  allLessons:Lesson[]; progMap:Record<string,Progress>;
  catLessonsIdx:number; onBack:()=>void;
  onComplete:(id:string)=>void; onSave:(id:string)=>void;
}) {
  const [tab,          setTab]          = useState<'lesson'|'examples'|'practice'|'notes'|'resources'>('lesson');
  const [notes,        setNotes]        = useState(progress?.notes??'');
  const [savingNotes,  setSavingNotes]  = useState(false);
  const [activeSection,setActiveSection]= useState(0);
  const { user } = useAuth();

  const done  = progress?.completed ?? false;
  const saved = progress?.saved ?? false;
  const pct   = progress?.progress_pct ?? 0;

  const catLessons = allLessons
    .filter(l => l.category===lesson.category)
    .sort((a,b) => a.order_index-b.order_index);
  const idx      = catLessons.findIndex(l=>l.id===lesson.id);
  const prevL    = catLessons[idx-1] ?? null;
  const nextL    = catLessons[idx+1] ?? null;
  const lessonNum = idx + 1;
  const totalInCat = catLessons.length;

  const sections: LessonSection[] = (lesson.sections as LessonSection[] ?? []).length > 0
    ? (lesson.sections as LessonSection[]).slice().sort((a,b)=>a.order-b.order)
    : [{ title: lesson.title, order: 1 }];

  const saveNotes = async () => {
    if (!user) return;
    setSavingNotes(true);
    await supabase.from('lesson_progress').upsert({
      user_id:user.id, lesson_id:lesson.id,
      progress_pct:pct, completed:done, saved, notes,
      updated_at: new Date().toISOString(),
    },{ onConflict:'user_id,lesson_id' });
    setSavingNotes(false);
    toast({title:'Notes saved ✓'});
  };

  const scoreCircle = (v:number, color:string) => {
    const r=28, circ=2*Math.PI*r;
    return (
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64" width="64" height="64">
          <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="5" className="text-muted/50"/>
          <motion.circle cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={circ} initial={{strokeDashoffset:circ}}
            animate={{strokeDashoffset:circ*(1-v/100)}} transition={{duration:1,ease}}
            strokeLinecap="round"/>
        </svg>
        <span className="text-sm font-black text-foreground">{v}%</span>
      </div>
    );
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-0 -mx-0">

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-2 text-sm">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground transition-colors font-medium">Learning Hub</button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40"/>
          <button onClick={()=>{onBack();}} className="text-muted-foreground hover:text-foreground transition-colors font-medium">{lesson.category}</button>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40"/>
          <span className="text-foreground font-semibold truncate max-w-[200px]">{lesson.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onBack}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-border text-muted-foreground text-xs font-bold hover:bg-muted hover:text-foreground transition-all">
            <ChevronLeft className="h-3.5 w-3.5"/> Back to Lessons
          </button>
          <button onClick={()=>onSave(lesson.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all ${saved?'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-400':'border-border text-muted-foreground hover:bg-muted'}`}>
            {saved?<BookmarkCheck className="h-3.5 w-3.5"/>:<Bookmark className="h-3.5 w-3.5"/>}
            Save Lesson
          </button>
          <button onClick={()=>onComplete(lesson.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md ${done?'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400':'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-500/20'}`}>
            <CheckCircle2 className="h-3.5 w-3.5"/>
            {done ? 'Mark as Completed ✓' : 'Mark as Completed'}
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">

        <div className="flex-1 min-w-0 space-y-5">

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className={`h-1 bg-gradient-to-r ${gradient}`}/>
            <div className="flex gap-5 p-5">
              <GradientThumb lesson={lesson} gradient={gradient} size="lg"/>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-black text-foreground mb-1">{lesson.title}</h1>
                <p className="text-sm text-muted-foreground mb-4">{lesson.description}</p>
                <div className="flex items-center gap-3 flex-wrap mb-4">
                  <span className="text-[11px] font-semibold bg-violet-100 dark:bg-violet-500/15 text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 px-2.5 py-1 rounded-lg">{lesson.category}</span>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border capitalize ${DIFF_CLS[lesson.difficulty]??'bg-muted border-border text-muted-foreground'}`}>{lesson.difficulty}</span>
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5"/> {lesson.read_time_min} min read</span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-amber-500 dark:text-amber-400"><Zap className="h-3.5 w-3.5"/> +{lesson.xp_reward} XP</span>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5">
                    <span>Your progress</span>
                    <span className="font-bold">{done?'100':pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:`${done?100:pct}%`}} transition={{duration:0.6,ease}}
                      className={`h-full rounded-full ${done?'bg-emerald-500':'bg-violet-500'}`}/>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-0 border-b border-border">
            {([
              {id:'lesson',    label:'Lesson'},
              {id:'examples',  label:'Examples'},
              {id:'practice',  label:'Practice'},
              {id:'notes',     label:'Notes'},
              {id:'resources', label:'Resources'},
            ] as const).map(t => (
              <button key={t.id} onClick={()=>setTab(t.id)}
                className={`px-5 py-3 text-sm font-bold border-b-2 transition-all -mb-px ${tab===t.id?'border-violet-500 text-foreground':'border-transparent text-muted-foreground hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {tab==='lesson' && (
              <motion.div key="lesson" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}}>
                {lesson.content
                  ? <MarkdownContent content={lesson.content}/>
                  : <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border bg-muted/20">
                      <BookOpen className="h-10 w-10 text-muted-foreground/20 mb-3"/>
                      <p className="text-sm text-muted-foreground">Content coming soon</p>
                    </div>
                }

                {(lesson.key_takeaways??[]).length>0 && (
                  <div className="mt-6 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-5">
                    <p className="text-sm font-black text-emerald-700 dark:text-emerald-400 mb-3 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4"/> Key Takeaways
                    </p>
                    <div className="space-y-2">
                      {(lesson.key_takeaways??[]).map((t,i)=>(
                        <div key={i} className="flex items-start gap-2.5">
                          <Check className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5"/>
                          <p className="text-sm text-emerald-800 dark:text-emerald-300/80">{t}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {tab==='examples' && (
              <motion.div key="examples" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}}>
                <div className="rounded-2xl border border-border bg-card p-6 text-center py-12">
                  <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-3">
                    <Play className="h-5 w-5 text-muted-foreground/40"/>
                  </div>
                  <p className="text-sm font-bold text-foreground mb-1">Chart Examples</p>
                  <p className="text-xs text-muted-foreground mb-4">Visual examples for {lesson.title}</p>
                  <button onClick={()=>setTab('lesson')}
                    className="text-xs text-violet-500 dark:text-violet-400 hover:opacity-70 transition-opacity">
                    ← Back to Lesson
                  </button>
                </div>
              </motion.div>
            )}

            {tab==='practice' && (
              <motion.div key="practice" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}}>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <p className="text-sm font-black text-foreground mb-2 flex items-center gap-2"><Target className="h-4 w-4 text-violet-500"/> Practice Exercises</p>
                  <p className="text-xs text-muted-foreground mb-5">Use the AI assistant to generate practice exercises for this concept.</p>
                  <LessonAIAssistant lesson={lesson}/>
                </div>
              </motion.div>
            )}

            {tab==='notes' && (
              <motion.div key="notes" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}}>
                <div className="rounded-2xl border border-border bg-card p-5">
                  <p className="text-sm font-black text-foreground mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-violet-500"/> My Notes</p>
                  <textarea value={notes} onChange={e=>setNotes(e.target.value)}
                    placeholder={`Your notes for "${lesson.title}"...\n\nTips:\n- Write key concepts in your own words\n- Note your questions\n- Record real examples you spot`}
                    rows={8}
                    className="w-full text-sm bg-background border border-border rounded-xl px-4 py-3 text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:border-violet-500/40 resize-none leading-relaxed"/>
                  <button onClick={saveNotes} disabled={savingNotes}
                    className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-muted border border-border text-muted-foreground text-xs font-bold hover:bg-muted/70 hover:text-foreground transition-all disabled:opacity-40">
                    {savingNotes?<RefreshCw className="h-3.5 w-3.5 animate-spin"/>:<Check className="h-3.5 w-3.5"/>}
                    {savingNotes?'Saving...':'Save Notes'}
                  </button>
                </div>
              </motion.div>
            )}

            {tab==='resources' && (
              <motion.div key="resources" initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:0.18}}>
                <div className="rounded-2xl border border-border bg-card p-6">
                  <p className="text-sm font-black text-foreground mb-4 flex items-center gap-2"><BookOpen className="h-4 w-4 text-violet-500"/> Related Resources</p>
                  <div className="space-y-2">
                    {allLessons.filter(l=>l.category===lesson.category&&l.id!==lesson.id).slice(0,5).map(l=>(
                      <div key={l.id} className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/40 transition-colors cursor-pointer">
                        <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center flex-shrink-0">
                          {progMap[l.id]?.completed ? <Check className="h-3 w-3 text-emerald-500"/> : <Play className="h-3 w-3 text-muted-foreground/40 ml-0.5"/>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{l.title}</p>
                          <p className="text-[10px] text-muted-foreground">{l.read_time_min} min · {l.difficulty}</p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 flex-shrink-0"/>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button disabled={!prevL}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-default text-left group">
              <ChevronLeft className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
              <div>
                <p className="text-[10px] text-muted-foreground">Previous Lesson</p>
                <p className="text-xs font-bold text-foreground">{prevL?.title??'—'}</p>
              </div>
            </button>
            <span className="text-xs text-muted-foreground font-medium">Lesson {lessonNum} of {totalInCat}</span>
            <button disabled={!nextL}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted transition-all disabled:opacity-30 disabled:cursor-default text-right group">
              <div>
                <p className="text-[10px] text-muted-foreground">Next Lesson</p>
                <p className="text-xs font-bold text-foreground">{nextL?.title??'—'}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
            </button>
          </div>
        </div>

        <div className="w-72 flex-shrink-0 space-y-4 hidden lg:block">

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-black text-foreground mb-4">Your Progress</p>
            <div className="flex items-center gap-4 mb-4">
              {scoreCircle(done?100:pct, done?'#10b981':'#7c3aed')}
              <div>
                <p className="text-base font-black text-foreground">{done?'100':pct}%</p>
                <p className="text-xs text-muted-foreground">{done?'Completed':'In Progress'}</p>
              </div>
            </div>
            <div className="space-y-2 text-xs border-t border-border pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Lessons Completed</span>
                <span className="font-bold text-foreground">{Object.values(progMap).filter(p=>p.completed).length} / {allLessons.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">XP Earned</span>
                <span className="font-bold text-foreground">{Object.entries(progMap).filter(([,p])=>p.completed).reduce((s,[id])=>{const l=allLessons.find(x=>x.id===id);return s+(l?.xp_reward??0);},0)} XP</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-black text-foreground mb-3">Lesson Content</p>
            <div className="space-y-1">
              {sections.map((s,i) => (
                <button key={i} onClick={()=>setActiveSection(i)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs transition-all ${activeSection===i?'bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400 font-bold':'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[9px] font-black ${activeSection===i?'border-violet-500 bg-violet-500 text-white':i<activeSection?'border-emerald-500 bg-emerald-500 text-white':'border-border'}`}>
                    {i<activeSection?'✓':i+1}
                  </span>
                  <span className="leading-tight">{s.title}</span>
                  {activeSection===i&&<CheckCircle2 className="h-3 w-3 ml-auto flex-shrink-0 text-violet-500"/>}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-black text-foreground mb-3">Quick Actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                {label:'Take Notes',     icon:FileText, action:()=>setTab('notes')},
                {label:'Ask AI',         icon:Sparkles, action:()=>setTab('practice')},
              ].map(a=>{
                const Icon=a.icon;
                return(
                  <button key={a.label} onClick={a.action}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-border bg-muted/30 hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-all">
                    <Icon className="h-3.5 w-3.5 flex-shrink-0"/>{a.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
              <Sparkles className="h-3.5 w-3.5 text-violet-500"/>
              <p className="text-xs font-black text-foreground flex-1">AI Assistant</p>
              <span className="text-[9px] font-bold bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-500/20">Beta</span>
            </div>
            <div className="p-4">
              <LessonAIAssistant lesson={lesson}/>
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

  if(view==='lesson'&&selectedLesson) return(
    <LessonPage
      lesson={selectedLesson}
      progress={progMap[selectedLesson.id]}
      gradient={catGrad[selectedLesson.category]??'from-slate-800 to-slate-600'}
      allLessons={lessons}
      progMap={progMap}
      catLessonsIdx={lessons.filter(l=>l.category===selectedLesson.category).findIndex(l=>l.id===selectedLesson.id)}
      onBack={backToHub}
      onComplete={toggleComplete}
      onSave={toggleSave}
    />
  );

  return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-6">

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-border">
          <div className="flex-1 p-6">
            <p className="text-sm text-muted-foreground mb-0.5">Welcome back,</p>
            <h2 className="text-2xl font-black text-foreground mb-1">{user?.email?.split('@')[0]??'Trader'} 👋</h2>
            <p className="text-xs text-muted-foreground mb-4">Keep learning, keep growing.</p>
            {stats.streak_days>0&&(
              <div className="inline-flex items-center gap-1.5 bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400 rounded-full px-3 py-1.5 text-xs font-black">
                <Flame className="h-3.5 w-3.5"/> {stats.streak_days} DAY STREAK
              </div>
            )}
          </div>
          {[
            {label:'Courses Completed',value:`${completedCount}`,sub:`of ${lessons.length}`},
            {label:'Hours Studied',value:`${stats.hours_studied.toFixed(1)}h`,sub:'Total'},
            {label:'XP Points',value:`${stats.xp_total} XP`,sub:`Level ${Math.floor(stats.xp_total/200)+1}`},
          ].map(s=>(
            <div key={s.label} className="flex-1 p-5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">{s.label}</p>
              <p className="text-2xl font-black text-foreground">{s.value}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">{s.sub}</p>
              <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full" style={{width:`${Math.min(100,(completedCount/Math.max(lessons.length,1))*100)}%`}}/>
              </div>
            </div>
          ))}
        </div>
        {nextLesson&&(
          <div className="flex items-center gap-4 px-6 py-3.5 bg-violet-50 dark:bg-violet-500/5 border-t border-violet-200 dark:border-violet-500/15 flex-wrap">
            <Sparkles className="h-4 w-4 text-violet-500 flex-shrink-0"/>
            <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 flex-shrink-0">AI Recommendation</p>
            <p className="text-xs text-muted-foreground flex-shrink-0">Next lesson for you:</p>
            <p className="text-sm font-black text-foreground flex-1 min-w-0 truncate">{nextLesson.title}</p>
            <button onClick={()=>openLesson(nextLesson)}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-xs font-black shadow-md shadow-violet-500/20 transition-all flex-shrink-0">
              Continue Learning
            </button>
          </div>
        )}
      </div>

      {catCounts.length>0&&(
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-foreground">Explore by Category</h3>
            {activeCat&&<button onClick={()=>{setActiveCat('');setShowMore(10);}} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><RotateCcw className="h-3 w-3"/> All</button>}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {catCounts.map(cat=>(
              <motion.button key={cat.id}
                onClick={()=>{setActiveCat(prev=>prev===cat.name?'':cat.name);setShowMore(10);}}
                whileHover={{scale:1.02}} whileTap={{scale:0.98}}
                className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${activeCat===cat.name?'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/20':'bg-card border-border hover:border-border/60 hover:shadow-sm'}`}>
                <span className="text-xl">{cat.emoji}</span>
                <div className="text-left">
                  <p className={`text-xs font-black whitespace-nowrap ${activeCat===cat.name?'text-white':'text-foreground'}`}>{cat.name}</p>
                  <p className={`text-[10px] ${activeCat===cat.name?'text-white/70':'text-muted-foreground'}`}>{cat.count} lessons</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-5 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border">
            {([{id:'all',label:'All Lessons',count:lessons.length},{id:'in_progress',label:'In Progress',count:inProgCount},{id:'completed',label:'Completed',count:completedCount},{id:'saved',label:'Saved',count:savedCount}] as const).map(t=>(
              <button key={t.id} onClick={()=>{setActiveTab(t.id);setShowMore(10);}}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab===t.id?'bg-background text-foreground shadow-sm':'text-muted-foreground hover:text-foreground hover:bg-background/60'}`}>
                {t.label}
                {t.count>0&&<span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab===t.id?'bg-violet-600 text-white':'bg-muted-foreground/15 text-muted-foreground'}`}>{t.count}</span>}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none"/>
              <input value={search} onChange={e=>{setSearch(e.target.value);setShowMore(10);}}
                placeholder="Search lessons, concepts, tags..."
                className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40"/>
            </div>
            <select value={filterDiff} onChange={e=>{setFilterDiff(e.target.value);setShowMore(10);}}
              className="text-xs text-muted-foreground bg-background border border-border rounded-xl px-3 py-2 focus:outline-none cursor-pointer">
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            {hasFilters&&(
              <button onClick={()=>{setSearch('');setActiveCat('');setFilterDiff('');setActiveTab('all');setShowMore(10);}}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground text-xs font-semibold hover:bg-muted transition-colors">
                <RotateCcw className="h-3.5 w-3.5"/> Reset
              </button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{filtered.length} lessons</span>
          </div>
          {loading?(
            <div className="space-y-3">{[1,2,3,4].map(i=><div key={i} className="h-24 bg-muted/30 rounded-2xl animate-pulse"/>)}</div>
          ):lessons.length===0?(
            <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-border">
              <BookOpen className="h-10 w-10 text-muted-foreground/20 mb-3"/>
              <p className="text-sm font-bold text-foreground mb-1">No lessons available</p>
              <p className="text-xs text-muted-foreground">Content will appear here once added by admin.</p>
            </div>
          ):filtered.length===0&&activeCat?(
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border bg-muted/20">
              <span className="text-4xl mb-3">{catCounts.find(c=>c.name===activeCat)?.emoji??'📚'}</span>
              <p className="text-sm font-bold text-foreground mb-1">No lessons found in "{activeCat}" yet</p>
              <p className="text-xs text-muted-foreground mb-4">More content being added soon.</p>
              <button onClick={()=>{setActiveCat('');setShowMore(10);}} className="text-xs text-violet-500 dark:text-violet-400 hover:opacity-70 transition-opacity border border-violet-200 dark:border-violet-500/20 px-3 py-1.5 rounded-lg">← View all lessons</button>
            </div>
          ):filtered.length===0?(
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border bg-muted/20">
              <Search className="h-8 w-8 text-muted-foreground/20 mb-3"/>
              <p className="text-sm font-bold text-foreground mb-1">No lessons match</p>
              <button onClick={()=>{setSearch('');setActiveCat('');setFilterDiff('');setActiveTab('all');setShowMore(10);}} className="mt-3 text-xs text-violet-500 dark:text-violet-400 hover:opacity-70 transition-opacity">Clear filters →</button>
            </div>
          ):(
            <>
              <div className="space-y-3">
                {filtered.slice(0,showMore).map((lesson,i)=>{
                  const prog=progMap[lesson.id];
                  const done=prog?.completed??false;
                  const saved=prog?.saved??false;
                  const pct=prog?.progress_pct??0;
                  const isPro=lesson.is_premium||lesson.is_pro;
                  return(
                    <motion.div key={lesson.id} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{delay:i*0.025,ease}}
                      onClick={()=>openLesson(lesson)}
                      className="group flex items-start gap-3.5 p-4 rounded-2xl border border-border bg-card hover:border-border/60 hover:shadow-sm transition-all cursor-pointer">
                      <GradientThumb lesson={lesson} gradient={catGrad[lesson.category]??'from-slate-800 to-slate-600'}/>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className={`text-sm font-black ${done?'text-muted-foreground line-through':'text-foreground'}`}>{lesson.title}</h3>
                              {isPro&&<span className="flex items-center gap-0.5 text-[9px] font-black bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0"><Lock className="h-2.5 w-2.5"/> PRO</span>}
                              {done&&<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0"/>}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{lesson.description}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {(lesson.tags??[]).slice(0,3).map(t=><span key={t} className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-muted border border-border text-muted-foreground">{t}</span>)}
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border capitalize ${DIFF_CLS[lesson.difficulty]??'bg-muted border-border text-muted-foreground'}`}>{lesson.difficulty}</span>
                              <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock className="h-3 w-3"/> {lesson.read_time_min} min</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={e=>{e.stopPropagation();toggleSave(lesson.id);}} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                {saved?<BookmarkCheck className="h-3.5 w-3.5 text-violet-500"/>:<Bookmark className="h-3.5 w-3.5"/>}
                              </button>
                              <button onClick={e=>{e.stopPropagation();toggleComplete(lesson.id);}} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                                <CheckCircle2 className={`h-3.5 w-3.5 ${done?'text-emerald-500':'text-muted-foreground'}`}/>
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-black ${done?'text-emerald-600 dark:text-emerald-400':pct>0?'text-foreground':'text-muted-foreground/30'}`}>{pct}%</span>
                              {done?(
                                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500"/></div>
                              ):(
                                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center"><Play className="h-3 w-3 text-muted-foreground/30 ml-0.5"/></div>
                              )}
                            </div>
                            <span className="text-[9px] font-bold text-violet-500 dark:text-violet-400">+{lesson.xp_reward} XP</span>
                          </div>
                        </div>
                        {pct>0&&<div className="mt-2 h-1 bg-muted rounded-full overflow-hidden"><motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.6,ease}} className={`h-full rounded-full ${done?'bg-emerald-500':'bg-violet-500'}`}/></div>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {filtered.length>showMore&&(
                <div className="text-center pt-2">
                  <button onClick={()=>setShowMore(n=>n+10)} className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-muted hover:text-foreground transition-all">
                    Load more lessons <ChevronDown className="h-4 w-4"/>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="w-72 flex-shrink-0 space-y-4 hidden lg:block">
          <HubAI lessons={lessons}/>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-black text-foreground mb-4">Your Progress</p>
            <div className="space-y-3">
              {[{label:'Lessons Done',val:completedCount,total:Math.max(lessons.length,1),color:'bg-emerald-500'},{label:'XP Earned',val:stats.xp_total,total:Math.max(stats.xp_total,500),color:'bg-violet-500',suffix:' XP'}].map(s=>(
                <div key={s.label}>
                  <div className="flex justify-between text-[10px] mb-1"><span className="text-muted-foreground">{s.label}</span><span className="font-bold text-foreground">{s.val}{(s as any).suffix??''}</span></div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden"><motion.div initial={{width:0}} animate={{width:`${Math.min(100,(s.val/s.total)*100)}%`}} transition={{duration:0.8,ease}} className={`h-full rounded-full ${s.color}`}/></div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex justify-between text-[10px] mb-1.5"><span className="font-bold text-muted-foreground">Weekly Goal</span><span className="text-muted-foreground">{Math.round(stats.hours_studied*60)} / 300 min</span></div>
              <div className="h-2 bg-muted rounded-full overflow-hidden"><motion.div initial={{width:0}} animate={{width:`${Math.min(100,(stats.hours_studied*60/300)*100)}%`}} transition={{duration:0.8}} className="h-full bg-emerald-500 rounded-full"/></div>
              <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">{Math.round((stats.hours_studied*60/300)*100)}%</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-black text-foreground mb-3 flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5 text-violet-500"/> Top Students</p>
            {leaderboard.length===0?(
              <div className="text-center py-4"><p className="text-xs text-muted-foreground">Complete lessons to appear here</p></div>
            ):(
              <div className="space-y-2.5">
                {leaderboard.map((e,i)=>{const isYou=e.user_id===user?.id;return(
                  <div key={e.user_id} className="flex items-center gap-3">
                    <span className={`text-sm font-black w-4 flex-shrink-0 ${i===0?'text-violet-500':'text-muted-foreground/50'}`}>{i+1}</span>
                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 ${isYou?'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-200 dark:border-emerald-500/20':'bg-muted border-border'}`}>
                      <span className={`text-[10px] font-black ${isYou?'text-emerald-600 dark:text-emerald-400':'text-foreground'}`}>{isYou?'You':e.display_name.slice(0,2).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0"><p className={`text-xs font-bold truncate ${isYou?'text-emerald-600 dark:text-emerald-400':'text-foreground'}`}>{isYou?'You':e.display_name}</p><p className="text-[9px] text-muted-foreground">Level {e.level}</p></div>
                    <span className={`text-[10px] font-black flex-shrink-0 ${isYou?'text-emerald-600 dark:text-emerald-400':'text-violet-500 dark:text-violet-400'}`}>{e.xp_total.toLocaleString()} XP</span>
                  </div>
                );})}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
