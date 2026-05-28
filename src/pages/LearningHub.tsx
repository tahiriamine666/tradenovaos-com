import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, BookOpen, Sparkles, ChevronRight, Clock,
  Bookmark, BookmarkCheck, CheckCircle2, Play, Lock,
  Flame, Trophy, RefreshCw, RotateCcw, ChevronDown, Zap,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Lesson {
  id: string; slug: string; title: string; description: string;
  category: string; subcategory: string; difficulty: string;
  read_time_min: number; tags: string[]; xp_reward: number;
  order_index: number; is_premium: boolean; thumbnail_url: string | null;
}

interface LessonProgress {
  lesson_id: string; progress_pct: number; completed: boolean;
  saved: boolean; notes: string | null;
}

interface LearningStats {
  xp_total: number; streak_days: number; hours_studied: number;
  current_focus: string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { name:'ICT Concepts',          icon:'🎯', desc:'Liquidity, FVGs, Order Blocks, Models' },
  { name:'SMC',                   icon:'🏦', desc:'Smart Money, Market Structure, Order Flow' },
  { name:'Price Action',          icon:'📈', desc:'Patterns, S&R, Trends, Candlesticks' },
  { name:'Fundamentals',          icon:'📰', desc:'CPI, NFP, FOMC, Macro, Correlations' },
  { name:'Risk Management',       icon:'🛡️', desc:'Position sizing, R:R, Drawdown rules' },
  { name:'Trading Psychology',    icon:'🧠', desc:'Mindset, Discipline, FOMO, Consistency' },
  { name:'Prop Firm Strategies',  icon:'🏆', desc:'Challenges, Funded accounts, Reviews' },
  { name:'Replay Drills',         icon:'🎮', desc:'Chart practice, Execution drills' },
];

const DIFFICULTY_COLOR: Record<string,string> = {
  beginner:     'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
  intermediate: 'text-foreground/70 bg-muted border-border',
  advanced:     'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20',
};

const THUMBNAIL_BG: Record<string,string> = {
  'ICT Concepts':         'from-violet-900 to-violet-700',
  'SMC':                  'from-slate-800 to-slate-600',
  'Price Action':         'from-emerald-900 to-emerald-700',
  'Fundamentals':         'from-gray-800 to-gray-600',
  'Risk Management':      'from-red-900 to-red-700',
  'Trading Psychology':   'from-purple-900 to-purple-700',
  'Prop Firm Strategies': 'from-violet-900 to-violet-700',
  'Replay Drills':        'from-indigo-900 to-indigo-700',
};

const CATEGORY_ABBR: Record<string,string> = {
  'ICT Concepts':'ICT','SMC':'SMC','Price Action':'PA',
  'Fundamentals':'FUND','Risk Management':'RISK',
  'Trading Psychology':'PSYCH','Prop Firm Strategies':'PROP',
  'Replay Drills':'DRILL',
};

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Thumbnail ─────────────────────────────────────────────────────────────────
function LessonThumbnail({ lesson }: { lesson: Lesson }) {
  const bg = THUMBNAIL_BG[lesson.category] ?? 'from-slate-800 to-slate-600';
  const abbr = CATEGORY_ABBR[lesson.category] ?? 'ICT';
  const tag = lesson.subcategory || lesson.tags[0] || lesson.category;
  return (
    <div className={`w-24 flex-shrink-0 rounded-xl bg-gradient-to-br ${bg} flex flex-col items-center justify-center p-2 text-center`} style={{minHeight:'72px'}}>
      <p className="text-[9px] font-black text-white/50 uppercase tracking-wider">{abbr}</p>
      <p className="text-[10px] font-black text-white leading-tight mt-0.5 uppercase">{tag}</p>
    </div>
  );
}

// ── AI Learning Assistant ─────────────────────────────────────────────────────
function AIAssistant() {
  const [query,    setQuery]    = useState('');
  const [answer,   setAnswer]   = useState('');
  const [loading,  setLoading]  = useState(false);

  const ask = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAnswer('');
    try {
      const { data, error } = await supabase.functions.invoke('ai-learning-assistant', {
        body: { question: query },
      });
      if (error) throw error;
      if ((data as any)?.error) {
        setAnswer((data as any).error);
      } else {
        setAnswer((data as any)?.answer ?? 'Could not generate answer.');
      }
    } catch (e: any) {
      setAnswer(e?.message ?? 'Could not connect. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3.5 border-b border-border">
        <p className="text-xs font-black text-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-violet-500"/> AI Learning Assistant
          <span className="text-[9px] font-bold bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-500/20">BETA</span>
        </p>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">Ask about any concept and get personalized explanations.</p>
        <div className="flex gap-2">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && ask()}
            placeholder="Ask anything..."
            className="flex-1 text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40"
          />
          <button onClick={ask} disabled={loading || !query.trim()}
            className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40">
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin"/> : <ChevronRight className="h-3.5 w-3.5"/>}
          </button>
        </div>
        <AnimatePresence>
          {answer && (
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}}
              className="overflow-hidden">
              <div className="rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/5 p-3">
                <p className="text-xs text-foreground/75 leading-relaxed whitespace-pre-wrap">{answer}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-wrap gap-1.5">
          {['What is an FVG?','Explain Order Blocks','What is BOS vs CHOCH?'].map(q => (
            <button key={q} onClick={() => { setQuery(q); }}
              className="text-[9px] font-medium px-2 py-1 rounded-full bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors">
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Lesson Card ───────────────────────────────────────────────────────────────
function LessonCard({ lesson, progress, onToggleSave, onMarkComplete }: {
  lesson: Lesson;
  progress?: LessonProgress;
  onToggleSave: (id: string) => void;
  onMarkComplete: (id: string) => void;
}) {
  const pct        = progress?.progress_pct ?? 0;
  const completed  = progress?.completed ?? false;
  const saved      = progress?.saved ?? false;
  const isPremium  = lesson.is_premium;

  return (
    <motion.div
      initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
      className="group flex items-start gap-3.5 p-4 rounded-2xl border border-border bg-card hover:border-border/80 hover:shadow-sm transition-all cursor-pointer"
    >
      <LessonThumbnail lesson={lesson}/>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className={`text-sm font-black truncate ${completed ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {lesson.title}
              </h3>
              {isPremium && (
                <span className="flex items-center gap-0.5 text-[9px] font-black bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <Lock className="h-2.5 w-2.5"/> PRO
                </span>
              )}
              {completed && <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0"/>}
            </div>
            <p className="text-xs text-muted-foreground leading-snug line-clamp-2 mb-2">{lesson.description}</p>

            <div className="flex items-center gap-2 flex-wrap">
              {lesson.tags.slice(0,3).map(t => (
                <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-muted border border-border text-muted-foreground">{t}</span>
              ))}
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border capitalize ${DIFFICULTY_COLOR[lesson.difficulty] ?? DIFFICULTY_COLOR.intermediate}`}>
                {lesson.difficulty}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3"/> {lesson.read_time_min} min
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onToggleSave(lesson.id)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                {saved ? <BookmarkCheck className="h-3.5 w-3.5 text-violet-500"/> : <Bookmark className="h-3.5 w-3.5"/>}
              </button>
              <button onClick={() => onMarkComplete(lesson.id)}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <CheckCircle2 className={`h-3.5 w-3.5 ${completed ? 'text-emerald-500' : ''}`}/>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-black ${completed ? 'text-emerald-600 dark:text-emerald-400' : pct > 0 ? 'text-foreground' : 'text-muted-foreground/40'}`}>
                {pct}%
              </span>
              {pct > 0 && !completed ? (
                <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-violet-500 rounded-full" style={{width:`${pct}%`}}/>
                </div>
              ) : completed ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500"/>
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center">
                  <Play className="h-3 w-3 text-muted-foreground/40 ml-0.5"/>
                </div>
              )}
            </div>

            <span className="text-[9px] font-bold text-violet-500 dark:text-violet-400">+{lesson.xp_reward} XP</span>
          </div>
        </div>

        {pct > 0 && !completed && (
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div initial={{width:0}} animate={{width:`${pct}%`}} transition={{duration:0.6,ease}}
              className="h-full bg-violet-500 rounded-full"/>
          </div>
        )}
        {completed && (
          <div className="mt-2 h-1 bg-emerald-100 dark:bg-emerald-500/20 rounded-full overflow-hidden">
            <div className="h-full w-full bg-emerald-500 rounded-full"/>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main LearningHub ──────────────────────────────────────────────────────────
export default function LearningHub() {
  const { user } = useAuth();
  const [lessons,      setLessons]     = useState<Lesson[]>([]);
  const [progressMap,  setProgressMap] = useState<Record<string,LessonProgress>>({});
  const [stats,        setStats]       = useState<LearningStats>({ xp_total:0, streak_days:0, hours_studied:0, current_focus:null });
  const [loading,      setLoading]     = useState(true);
  const [search,       setSearch]      = useState('');
  const [activeTab,    setActiveTab]   = useState<'all'|'in_progress'|'completed'|'saved'>('all');
  const [activeCategory, setActiveCategory] = useState('');
  const [filterDiff,   setFilterDiff]  = useState('');
  const [displayCount, setDisplayCount] = useState(10);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [lr, pr, sr] = await Promise.all([
      (supabase as any).from('lessons').select('*').order('category').order('order_index'),
      (supabase as any).from('lesson_progress').select('*').eq('user_id', user.id),
      (supabase as any).from('learning_stats').select('*').eq('user_id', user.id).maybeSingle(),
    ]);
    setLessons(((lr.data ?? []) as unknown) as Lesson[]);
    const pm: Record<string, LessonProgress> = {};
    ((pr.data ?? []) as LessonProgress[]).forEach((p) => { pm[p.lesson_id] = p; });
    setProgressMap(pm);
    if (sr.data) setStats(sr.data as LearningStats);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const upsertProgress = async (lessonId: string, patch: Partial<LessonProgress>) => {
    if (!user) return;
    const existing = progressMap[lessonId] ?? {} as LessonProgress;
    const next = { ...existing, lesson_id: lessonId, ...patch };
    setProgressMap(p => ({ ...p, [lessonId]: { ...p[lessonId], ...patch, lesson_id: lessonId } as LessonProgress }));
    await (supabase as any).from('lesson_progress').upsert({
      user_id: user.id, lesson_id: lessonId,
      progress_pct: next.progress_pct ?? 0,
      completed: next.completed ?? false,
      saved: next.saved ?? false,
      notes: next.notes ?? null,
      completed_at: next.completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,lesson_id' });
  };

  const toggleSave = async (lessonId: string) => {
    const cur = progressMap[lessonId]?.saved ?? false;
    await upsertProgress(lessonId, { saved: !cur });
    toast({ title: !cur ? '🔖 Lesson saved' : 'Bookmark removed' });
  };

  const markComplete = async (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId);
    const cur = progressMap[lessonId]?.completed ?? false;
    await upsertProgress(lessonId, { completed: !cur, progress_pct: !cur ? 100 : 0 });
    if (!cur) {
      toast({ title: `✅ Lesson completed! +${lesson?.xp_reward ?? 50} XP` });
      const newXp = stats.xp_total + (lesson?.xp_reward ?? 50);
      const newHours = stats.hours_studied + (lesson?.read_time_min ?? 10) / 60;
      await (supabase as any).from('learning_stats').upsert({
        user_id: user!.id,
        xp_total: newXp,
        streak_days: stats.streak_days,
        hours_studied: newHours,
        last_study_date: new Date().toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      setStats(s => ({ ...s, xp_total: newXp, hours_studied: newHours }));
    } else {
      toast({ title: 'Marked as incomplete' });
    }
  };

  const filtered = useMemo(() => {
    let list = lessons;
    const q = search.toLowerCase().trim();

    if (q) list = list.filter(l =>
      l.title.toLowerCase().includes(q) ||
      l.description?.toLowerCase().includes(q) ||
      l.category.toLowerCase().includes(q) ||
      l.tags.some(t => t.toLowerCase().includes(q))
    );
    if (activeCategory) list = list.filter(l => l.category === activeCategory);
    if (filterDiff)     list = list.filter(l => l.difficulty === filterDiff);

    if (activeTab === 'in_progress') list = list.filter(l => {
      const p = progressMap[l.id];
      return p && p.progress_pct > 0 && !p.completed;
    });
    if (activeTab === 'completed')   list = list.filter(l => progressMap[l.id]?.completed);
    if (activeTab === 'saved')       list = list.filter(l => progressMap[l.id]?.saved);

    return list;
  }, [lessons, search, activeCategory, filterDiff, activeTab, progressMap]);

  const completedCount = Object.values(progressMap).filter(p => p.completed).length;
  const savedCount     = Object.values(progressMap).filter(p => p.saved).length;
  const inProgressCount= Object.values(progressMap).filter(p => p.progress_pct > 0 && !p.completed).length;

  const catCounts = useMemo(() => {
    const m: Record<string,number> = {};
    lessons.forEach(l => { m[l.category] = (m[l.category]??0)+1; });
    return m;
  }, [lessons]);

  const nextLesson = useMemo(() =>
    lessons.find(l => !progressMap[l.id]?.completed),
  [lessons, progressMap]);

  const hasFilters = !!(search || activeCategory || filterDiff || activeTab !== 'all');

  const resetFilters = () => { setSearch(''); setActiveCategory(''); setFilterDiff(''); setActiveTab('all'); };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-6">

      {/* ── HERO ── */}
      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-0">
          <div className="flex-1 p-6 border-b sm:border-b-0 sm:border-r border-border">
            <p className="text-sm text-muted-foreground mb-1">Welcome back,</p>
            <h2 className="text-2xl font-black text-foreground mb-1">{user?.email?.split('@')[0]} 👋</h2>
            <p className="text-xs text-muted-foreground mb-4">Keep learning, keep growing.</p>
            {stats.streak_days > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400 rounded-full px-3 py-1.5 text-xs font-black">
                <Flame className="h-3.5 w-3.5"/> {stats.streak_days} DAY STREAK
              </div>
            )}
          </div>

          {[
            { label:'Courses Completed', value:`${completedCount}`, sub:`of ${lessons.length} total`, icon:BookOpen, good: completedCount > 0 },
            { label:'Hours Studied',     value:`${stats.hours_studied.toFixed(1)}h`, sub:'Total', icon:Clock, good: stats.hours_studied > 0 },
            { label:'XP Points',         value:`${stats.xp_total} XP`, sub:`Level ${Math.floor(stats.xp_total/200)+1}`, icon:Zap, good: true },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex-1 p-5 border-b sm:border-b-0 sm:border-r last:border-0 border-border">
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{s.label}</p>
                  <Icon className="h-4 w-4 text-muted-foreground/40"/>
                </div>
                <p className={`text-2xl font-black ${s.good ? 'text-foreground' : 'text-muted-foreground/30'}`}>{s.value}</p>
                {s.sub && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">{s.sub}</p>
                )}
                <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${s.label.includes('XP') ? 'bg-violet-500' : 'bg-emerald-500'}`}
                    style={{width:`${Math.min(100,(completedCount/Math.max(lessons.length,1))*100)}%`}}/>
                </div>
              </div>
            );
          })}
        </div>

        {nextLesson && (
          <div className="flex items-center gap-4 px-6 py-3.5 bg-violet-50 dark:bg-violet-500/5 border-t border-violet-200 dark:border-violet-500/15 flex-wrap">
            <Sparkles className="h-4 w-4 text-violet-500 flex-shrink-0"/>
            <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 flex-shrink-0">AI Recommendation</p>
            <p className="text-xs text-muted-foreground flex-shrink-0">Next lesson for you:</p>
            <p className="text-sm font-black text-foreground flex-1">{nextLesson.title}</p>
            <button
              onClick={() => markComplete(nextLesson.id)}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md shadow-violet-500/20 flex-shrink-0">
              Continue Learning
            </button>
          </div>
        )}
      </div>

      {/* ── CATEGORIES ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-foreground">Explore by Category</h3>
          {activeCategory && (
            <button onClick={() => setActiveCategory('')}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
              <RotateCcw className="h-3 w-3"/> View all
            </button>
          )}
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {CATEGORIES.map(cat => (
            <motion.button key={cat.name} onClick={() => setActiveCategory(activeCategory === cat.name ? '' : cat.name)}
              whileHover={{scale:1.02}} whileTap={{scale:0.98}}
              className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                activeCategory === cat.name
                  ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : 'bg-card border-border hover:border-border/60 hover:shadow-sm text-foreground'
              }`}>
              <span className="text-xl">{cat.icon}</span>
              <div className="text-left">
                <p className={`text-xs font-black whitespace-nowrap ${activeCategory === cat.name ? 'text-white' : ''}`}>{cat.name}</p>
                <p className={`text-[10px] ${activeCategory === cat.name ? 'text-white/70' : 'text-muted-foreground'}`}>
                  {catCounts[cat.name] ?? 0} lessons
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex gap-5 items-start">

        <div className="flex-1 min-w-0 space-y-4">

          <div className="space-y-3">
            <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border">
              {([
                { id:'all',         label:'All Lessons',   count: lessons.length },
                { id:'in_progress', label:'In Progress',   count: inProgressCount },
                { id:'completed',   label:'Completed',     count: completedCount },
                { id:'saved',       label:'Saved',         count: savedCount },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === t.id
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                  }`}>
                  {t.label}
                  {t.count > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === t.id ? 'bg-violet-600 text-white' : 'bg-muted-foreground/15 text-muted-foreground'}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none"/>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search lessons, concepts..."
                  className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40"/>
              </div>

              <select value={filterDiff} onChange={e => setFilterDiff(e.target.value)}
                className="text-xs text-muted-foreground bg-background border border-border rounded-xl px-3 py-2 focus:outline-none cursor-pointer">
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>

              {hasFilters && (
                <button onClick={resetFilters}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground text-xs font-semibold hover:bg-muted transition-colors">
                  <RotateCcw className="h-3.5 w-3.5"/> Reset
                </button>
              )}

              <span className="text-xs text-muted-foreground ml-auto">{filtered.length} lessons</span>
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted/30 rounded-2xl animate-pulse"/>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border bg-muted/20">
              <Search className="h-8 w-8 text-muted-foreground/20 mb-3"/>
              <p className="text-sm font-bold text-foreground mb-1">No lessons match</p>
              <p className="text-xs text-muted-foreground mb-4">Try adjusting your filters or search</p>
              <button onClick={resetFilters}
                className="text-xs text-violet-500 hover:opacity-70 transition-opacity">Clear filters →</button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {filtered.slice(0, displayCount).map((lesson, i) => (
                  <motion.div key={lesson.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.03}}>
                    <LessonCard
                      lesson={lesson}
                      progress={progressMap[lesson.id]}
                      onToggleSave={toggleSave}
                      onMarkComplete={markComplete}
                    />
                  </motion.div>
                ))}
              </div>

              {filtered.length > displayCount && (
                <div className="text-center pt-2">
                  <button onClick={() => setDisplayCount(n => n + 10)}
                    className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-muted hover:text-foreground transition-all">
                    Load more lessons <ChevronDown className="h-4 w-4"/>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="w-72 flex-shrink-0 space-y-4 hidden lg:block">

          <AIAssistant/>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-foreground">Your Progress</p>
              <span className="text-[10px] text-muted-foreground">This week</span>
            </div>
            <div className="space-y-2 mb-4">
              {[
                { label:'Completed', value:completedCount, total:lessons.length, color:'bg-emerald-500' },
                { label:'XP Earned',  value:stats.xp_total, total:Math.max(stats.xp_total,500), color:'bg-violet-500' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-bold text-foreground">{s.value}{s.label.includes('XP')?' XP':''}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{width:0}} animate={{width:`${Math.min(100,(s.value/Math.max(s.total,1))*100)}%`}} transition={{duration:0.8,ease}}
                      className={`h-full rounded-full ${s.color}`}/>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-border">
              <div className="flex justify-between text-[10px] mb-1.5">
                <span className="font-bold text-muted-foreground">Weekly Goal</span>
                <span className="text-muted-foreground">{Math.round(stats.hours_studied*60)} / 300 min</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{width:0}} animate={{width:`${Math.min(100,(stats.hours_studied*60/300)*100)}%`}} transition={{duration:0.8}}
                  className="h-full bg-emerald-500 rounded-full"/>
              </div>
              <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                {Math.round((stats.hours_studied*60/300)*100)}%
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-black text-foreground flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-violet-500"/> Top Students
              </p>
            </div>
            <div className="space-y-2.5">
              {[
                { name:'TraderSly',    level:18, xp:3250 },
                { name:'MarketWizard', level:16, xp:2890 },
                { name:'ChartNinja',   level:15, xp:2450 },
              ].map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className={`text-sm font-black w-4 flex-shrink-0 ${i===0?'text-violet-500':i===1?'text-muted-foreground':'text-muted-foreground/60'}`}>
                    {i+1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-500/15 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-black text-violet-600 dark:text-violet-400">{s.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{s.name}</p>
                    <p className="text-[9px] text-muted-foreground">Level {s.level}</p>
                  </div>
                  <span className="text-[10px] font-black text-violet-500 flex-shrink-0">{s.xp.toLocaleString()} XP</span>
                </div>
              ))}

              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <span className="text-sm font-black w-4 flex-shrink-0 text-muted-foreground">4</span>
                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">You</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">You</p>
                  <p className="text-[9px] text-muted-foreground">Level {Math.floor(stats.xp_total/200)+1}</p>
                </div>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{stats.xp_total} XP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
