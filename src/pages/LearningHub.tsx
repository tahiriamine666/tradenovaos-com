import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Search, BookOpen, Clock, Bookmark, BookmarkCheck, CheckCircle2,
  Sparkles, ChevronRight, Play, Lock, Flame, Trophy,
  RefreshCw, RotateCcw, ChevronDown, Zap, Filter, X,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Lesson {
  id: string; slug: string; title: string; description: string;
  category: string; subcategory: string | null; difficulty: string;
  read_time_min: number; tags: string[]; xp_reward: number;
  order_index: number; is_premium: boolean; is_pro: boolean;
  thumbnail_url: string | null; video_url: string | null;
  content: string | null;
}

interface Progress {
  lesson_id: string; progress_pct: number;
  completed: boolean; saved: boolean; notes: string | null;
}

interface Stats {
  xp_total: number; streak_days: number;
  hours_studied: number; current_focus: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const DIFFICULTY_CLS: Record<string, string> = {
  beginner:     'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
  intermediate: 'text-foreground/70 bg-muted border-border',
  advanced:     'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20',
};

const GRADIENT_MAP: Record<string, string> = {
  'ICT Concepts':         'from-violet-900 to-violet-700',
  'SMC':                  'from-slate-800 to-slate-600',
  'Price Action':         'from-emerald-900 to-emerald-700',
  'Fundamentals':         'from-gray-800 to-gray-600',
  'Risk Management':      'from-red-900 to-red-700',
  'Trading Psychology':   'from-purple-900 to-purple-700',
  'Prop Firm Strategies': 'from-zinc-800 to-zinc-600',
  'Replay Drills':        'from-indigo-900 to-indigo-700',
};

const CATEGORY_EMOJI: Record<string, string> = {
  'ICT Concepts':'🎯','SMC':'🏦','Price Action':'📈',
  'Fundamentals':'📰','Risk Management':'🛡️','Trading Psychology':'🧠',
  'Prop Firm Strategies':'🏆','Replay Drills':'🎮',
};

function gradient(cat: string) {
  return GRADIENT_MAP[cat] ?? 'from-slate-800 to-slate-600';
}

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

// ── Thumbnail ─────────────────────────────────────────────────────────────────
function Thumb({ lesson }: { lesson: Lesson }) {
  if (lesson.thumbnail_url) {
    return (
      <div className="w-24 flex-shrink-0 rounded-xl overflow-hidden" style={{ minHeight: 72 }}>
        <img src={lesson.thumbnail_url} alt={lesson.title} className="w-full h-full object-cover"/>
      </div>
    );
  }
  const label = lesson.subcategory || lesson.tags?.[0] || lesson.category;
  return (
    <div className={`w-24 flex-shrink-0 rounded-xl bg-gradient-to-br ${gradient(lesson.category)} flex flex-col items-center justify-center p-2 text-center`}
      style={{ minHeight: 72 }}>
      <p className="text-[9px] font-black text-white/40 uppercase tracking-wider">
        {lesson.category.split(' ')[0]}
      </p>
      <p className="text-[10px] font-black text-white leading-tight mt-0.5 uppercase line-clamp-2">
        {label}
      </p>
    </div>
  );
}

// ── AI Assistant ──────────────────────────────────────────────────────────────
function AIAssistant({ lessons }: { lessons: Lesson[] }) {
  const [query,   setQuery]   = useState('');
  const [answer,  setAnswer]  = useState('');
  const [loading, setLoading] = useState(false);

  const ask = async (q?: string) => {
    const text = (q ?? query).trim();
    if (!text) return;
    if (q) setQuery(q);
    setLoading(true); setAnswer('');
    try {
      const ctx = lessons.slice(0, 30)
        .map(l => `${l.title}: ${l.description}`)
        .join('\n');
      const { data, error } = await supabase.functions.invoke('ai-learning-assistant', {
        body: { question: text, context: ctx },
      });
      if (error) throw error;
      setAnswer(data?.answer ?? 'Could not generate answer.');
    } catch { setAnswer('Could not connect. Try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Sparkles className="h-3.5 w-3.5 text-violet-500"/>
        <p className="text-xs font-black text-foreground flex-1">AI Learning Assistant</p>
        <span className="text-[9px] font-bold bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full border border-violet-200 dark:border-violet-500/20">BETA</span>
      </div>
      <div className="p-4 space-y-3">
        <p className="text-[11px] text-muted-foreground">Ask about any concept and get personalized explanations.</p>
        <div className="flex gap-2">
          <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()}
            placeholder="Ask anything..."
            className="flex-1 text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-violet-500/40"/>
          <button onClick={() => ask()} disabled={loading || !query.trim()}
            className="p-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-40">
            {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin"/> : <ChevronRight className="h-3.5 w-3.5"/>}
          </button>
        </div>
        <AnimatePresence>
          {answer && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="rounded-xl border border-violet-200 dark:border-violet-500/20 bg-violet-50 dark:bg-violet-500/5 p-3">
                <p className="text-xs text-foreground/75 leading-relaxed">{answer}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex flex-wrap gap-1.5">
          {['What is an FVG?', 'Explain Order Blocks', 'BOS vs CHOCH?'].map(q => (
            <button key={q} onClick={() => ask(q)}
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
function LessonCard({ lesson, progress, onSave, onComplete, onOpen }: {
  lesson: Lesson; progress: Progress | undefined;
  onSave: (id: string) => void; onComplete: (id: string) => void;
  onOpen: (lesson: Lesson) => void;
}) {
  const pct       = progress?.progress_pct ?? 0;
  const done      = progress?.completed ?? false;
  const saved     = progress?.saved ?? false;
  const isPro     = lesson.is_premium || lesson.is_pro;

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      onClick={() => onOpen(lesson)}
      className="group flex items-start gap-3.5 p-4 rounded-2xl border border-border bg-card hover:border-border/60 hover:shadow-sm transition-all cursor-pointer">

      <Thumb lesson={lesson}/>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className={`text-sm font-black ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {lesson.title}
              </h3>
              {isPro && (
                <span className="flex items-center gap-0.5 text-[9px] font-black bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 px-1.5 py-0.5 rounded-full flex-shrink-0">
                  <Lock className="h-2.5 w-2.5"/> PRO
                </span>
              )}
              {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0"/>}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{lesson.description}</p>
            <div className="flex items-center gap-2 flex-wrap">
              {(lesson.tags ?? []).slice(0, 3).map(t => (
                <span key={t} className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-muted border border-border text-muted-foreground">{t}</span>
              ))}
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border capitalize ${DIFFICULTY_CLS[lesson.difficulty] ?? 'bg-muted border-border text-muted-foreground'}`}>
                {lesson.difficulty}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3"/> {lesson.read_time_min} min
              </span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={e => { e.stopPropagation(); onSave(lesson.id); }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                {saved
                  ? <BookmarkCheck className="h-3.5 w-3.5 text-violet-500"/>
                  : <Bookmark className="h-3.5 w-3.5"/>}
              </button>
              <button onClick={e => { e.stopPropagation(); onComplete(lesson.id); }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <CheckCircle2 className={`h-3.5 w-3.5 ${done ? 'text-emerald-500' : ''}`}/>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs font-black ${done ? 'text-emerald-600 dark:text-emerald-400' : pct > 0 ? 'text-foreground' : 'text-muted-foreground/30'}`}>
                {pct}%
              </span>
              {done ? (
                <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500"/>
                </div>
              ) : (
                <button onClick={e => { e.stopPropagation(); onOpen(lesson); }}
                  className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center hover:border-violet-500/40 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                  <Play className="h-3 w-3 text-muted-foreground/60 ml-0.5"/>
                </button>
              )}
            </div>
            <span className="text-[9px] font-bold text-violet-500 dark:text-violet-400">+{lesson.xp_reward} XP</span>
          </div>
        </div>

        {pct > 0 && (
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease }}
              className={`h-full rounded-full ${done ? 'bg-emerald-500' : 'bg-violet-500'}`}/>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Lesson Detail Drawer ──────────────────────────────────────────────────────
function LessonDetailDrawer({ lesson, progress, gradient, onClose, onComplete, onSave, nextLesson, onOpen }: {
  lesson: Lesson;
  progress: Progress | undefined;
  gradient: string;
  onClose: () => void;
  onComplete: (id: string) => void;
  onSave: (id: string) => void;
  nextLesson: Lesson | null;
  onOpen: (lesson: Lesson) => void;
}) {
  const done  = progress?.completed ?? false;
  const saved = progress?.saved ?? false;
  const pct   = progress?.progress_pct ?? 0;
  const isPro = lesson.is_premium || lesson.is_pro;

  const DIFF_COLOR: Record<string, string> = {
    beginner:     'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20',
    intermediate: 'text-foreground/70 bg-muted border-border',
    advanced:     'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20',
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="flex-1 bg-black/50 dark:bg-black/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className="relative w-full sm:w-[520px] h-full bg-background border-l border-border flex flex-col overflow-hidden shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 border-b border-border">
          <div className={`h-1.5 bg-gradient-to-r ${gradient}`}/>
          <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-md">
                  {lesson.category}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${DIFF_COLOR[lesson.difficulty] ?? 'bg-muted border-border text-muted-foreground'}`}>
                  {lesson.difficulty}
                </span>
                {isPro && (
                  <span className="flex items-center gap-0.5 text-[9px] font-black bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/20 px-1.5 py-0.5 rounded-full">
                    <Lock className="h-2.5 w-2.5"/> PRO
                  </span>
                )}
                {done && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5"/> Completed
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-foreground leading-tight">{lesson.title}</h2>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Clock className="h-3 w-3"/> {lesson.read_time_min} min read</span>
                <span className="text-violet-500 dark:text-violet-400 font-bold">+{lesson.xp_reward} XP</span>
              </div>
            </div>
            <button onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5">
              <X className="h-4 w-4"/>
            </button>
          </div>

          {pct > 0 && (
            <div className="px-5 pb-3">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Progress</span>
                <span className="font-bold">{pct}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${done ? 'bg-emerald-500' : 'bg-violet-500'}`}
                  style={{ width: `${pct}%` }}/>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-5 pb-4">
            <button
              onClick={() => onComplete(lesson.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black transition-all ${
                done
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20'
              }`}>
              <CheckCircle2 className="h-4 w-4"/>
              {done ? 'Completed ✓' : 'Mark as Completed'}
            </button>
            <button
              onClick={() => onSave(lesson.id)}
              className={`px-4 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                saved
                  ? 'bg-violet-50 dark:bg-violet-500/10 border-violet-200 dark:border-violet-500/20 text-violet-600 dark:text-violet-400'
                  : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}>
              {saved ? <BookmarkCheck className="h-4 w-4"/> : <Bookmark className="h-4 w-4"/>}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {(lesson.tags ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-5 pt-4">
              {(lesson.tags ?? []).map(tag => (
                <span key={tag} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {lesson.description && (
            <div className="px-5 pt-4 pb-2">
              <p className="text-sm text-muted-foreground leading-relaxed">{lesson.description}</p>
            </div>
          )}

          <div className="mx-5 border-t border-border my-3"/>

          <div className="px-5 pb-6">
            {lesson.content ? (
              <div className="prose-sm space-y-3">
                {lesson.content.split('\n').map((line, i) => {
                  if (line.startsWith('## ')) {
                    return <h3 key={i} className="text-base font-black text-foreground mt-5 mb-2 first:mt-0">{line.replace('## ', '')}</h3>;
                  }
                  if (line.startsWith('**') && line.endsWith('**')) {
                    return <p key={i} className="text-sm font-bold text-foreground">{line.replace(/\*\*/g, '')}</p>;
                  }
                  if (line.startsWith('- ')) {
                    return (
                      <div key={i} className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1.5 flex-shrink-0"/>
                        <p className="text-sm text-foreground/75 leading-relaxed">{line.replace('- ', '')}</p>
                      </div>
                    );
                  }
                  if (/^[1-5]\. /.test(line)) {
                    const num = line.split('. ')[0];
                    const text = line.split('. ').slice(1).join('. ');
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <span className="text-[10px] font-black text-violet-500 dark:text-violet-400 bg-violet-100 dark:bg-violet-500/15 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{num}</span>
                        <p className="text-sm text-foreground/75 leading-relaxed">{text}</p>
                      </div>
                    );
                  }
                  if (line.startsWith('|') && line.endsWith('|')) return null;
                  if (line.trim() === '' || line.startsWith('---')) {
                    return <div key={i} className="h-2"/>;
                  }
                  if (line.includes('**')) {
                    const parts = line.split('**');
                    return (
                      <p key={i} className="text-sm text-foreground/75 leading-relaxed">
                        {parts.map((part, j) =>
                          j % 2 === 1
                            ? <span key={j} className="font-bold text-foreground">{part}</span>
                            : part
                        )}
                      </p>
                    );
                  }
                  return (
                    <p key={i} className="text-sm text-foreground/75 leading-relaxed">{line}</p>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/20 mb-3"/>
                <p className="text-sm text-muted-foreground">Lesson content coming soon</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Check back later</p>
              </div>
            )}
          </div>
        </div>

        {nextLesson && (
          <div className="flex-shrink-0 border-t border-border bg-muted/30 px-5 py-4">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Up Next</p>
            <button
              onClick={() => onOpen(nextLesson)}
              className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-background hover:bg-muted/50 hover:border-border/60 transition-all text-left group">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{nextLesson.title}</p>
                <p className="text-[10px] text-muted-foreground">{nextLesson.category} · {nextLesson.read_time_min} min</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0"/>
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LearningHub() {
  const { user } = useAuth();

  const [lessons,   setLessons]   = useState<Lesson[]>([]);
  const [progMap,   setProgMap]   = useState<Record<string, Progress>>({});
  const [stats,     setStats]     = useState<Stats>({ xp_total: 0, streak_days: 0, hours_studied: 0, current_focus: null });
  const [loading,   setLoading]   = useState(true);

  const [search,     setSearch]     = useState('');
  const [activeTab,  setActiveTab]  = useState<'all'|'in_progress'|'completed'|'saved'>('all');
  const [activeCat,  setActiveCat]  = useState('');
  const [filterDiff, setFilterDiff] = useState('');
  const [showMore,   setShowMore]   = useState(10);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [lr, pr, sr] = await Promise.all([
      supabase.from('lessons').select('*').order('category').order('order_index'),
      supabase.from('lesson_progress').select('*').eq('user_id', user.id),
      supabase.from('learning_stats').select('*').eq('user_id', user.id).maybeSingle(),
    ]);
    if (lr.data) setLessons(lr.data as Lesson[]);
    const pm: Record<string, Progress> = {};
    (pr.data ?? []).forEach((p: Progress) => { pm[p.lesson_id] = p; });
    setProgMap(pm);
    if (sr.data) setStats(sr.data as Stats);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    console.log('[LearningHub] activeCat:', activeCat);
    console.log('[LearningHub] lessons.length:', lessons.length);
    if (lessons.length > 0) console.log('[LearningHub] sample lesson.category:', lessons[0].category);
  }, [activeCat, lessons]);

  const categories = useMemo(() => {
    const map: Record<string, number> = {};
    lessons.forEach(l => { map[l.category] = (map[l.category] ?? 0) + 1; });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [lessons]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return lessons.filter(l => {
      if (q) {
        const haystack = [l.title, l.description ?? '', l.category, l.subcategory ?? '', ...(l.tags ?? [])].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (activeCat  && l.category   !== activeCat)  return false;
      if (filterDiff && l.difficulty !== filterDiff)  return false;
      if (activeTab === 'in_progress') {
        const p = progMap[l.id];
        return p && p.progress_pct > 0 && !p.completed;
      }
      if (activeTab === 'completed') return !!progMap[l.id]?.completed;
      if (activeTab === 'saved')     return !!progMap[l.id]?.saved;
      return true;
    });
  }, [lessons, search, activeCat, filterDiff, activeTab, progMap]);

  const completedCount   = useMemo(() => Object.values(progMap).filter(p => p.completed).length, [progMap]);
  const savedCount       = useMemo(() => Object.values(progMap).filter(p => p.saved).length, [progMap]);
  const inProgressCount  = useMemo(() => Object.values(progMap).filter(p => p.progress_pct > 0 && !p.completed).length, [progMap]);

  const nextLesson = useMemo(() => lessons.find(l => !progMap[l.id]?.completed), [lessons, progMap]);

  const upsertProgress = async (lessonId: string, patch: Partial<Progress>) => {
    if (!user) return;
    const existing = progMap[lessonId] ?? {};
    const next = { ...existing, ...patch };
    setProgMap(prev => ({ ...prev, [lessonId]: { ...prev[lessonId], ...patch, lesson_id: lessonId } as Progress }));
    await supabase.from('lesson_progress').upsert(
      { user_id: user.id, lesson_id: lessonId, progress_pct: next.progress_pct ?? 0, completed: next.completed ?? false, saved: next.saved ?? false, notes: next.notes ?? null, completed_at: next.completed ? new Date().toISOString() : null, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,lesson_id' }
    );
  };

  const toggleSave = async (lessonId: string) => {
    const cur = progMap[lessonId]?.saved ?? false;
    await upsertProgress(lessonId, { saved: !cur });
    toast({ title: !cur ? '🔖 Saved' : 'Removed from saved' });
  };

  const toggleComplete = async (lessonId: string) => {
    const lesson = lessons.find(l => l.id === lessonId);
    const cur = progMap[lessonId]?.completed ?? false;
    const newDone = !cur;
    await upsertProgress(lessonId, { completed: newDone, progress_pct: newDone ? 100 : 0 });
    if (newDone && lesson) {
      toast({ title: `✅ +${lesson.xp_reward} XP` });
      const newXP = stats.xp_total + lesson.xp_reward;
      const newHrs = stats.hours_studied + lesson.read_time_min / 60;
      await supabase.from('learning_stats').upsert(
        { user_id: user!.id, xp_total: newXP, hours_studied: newHrs, last_study_date: new Date().toISOString().split('T')[0], streak_days: stats.streak_days, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
      await supabase.rpc('update_learning_streak', { p_user_id: user!.id });
      setStats(s => ({ ...s, xp_total: newXP, hours_studied: newHrs }));
    } else if (!newDone) {
      toast({ title: 'Marked incomplete' });
    }
  };

  const hasFilters = !!(search || activeCat || filterDiff || activeTab !== 'all');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      <div className="rounded-3xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-0 divide-y sm:divide-y-0 sm:divide-x divide-border">

          <div className="flex-1 p-6">
            <p className="text-sm text-muted-foreground mb-0.5">Welcome back,</p>
            <h2 className="text-2xl font-black text-foreground mb-1">
              {user?.email?.split('@')[0] ?? 'Trader'} 👋
            </h2>
            <p className="text-xs text-muted-foreground mb-4">Keep learning, keep growing.</p>
            {stats.streak_days > 0 && (
              <div className="inline-flex items-center gap-1.5 bg-violet-100 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 text-violet-700 dark:text-violet-400 rounded-full px-3 py-1.5 text-xs font-black">
                <Flame className="h-3.5 w-3.5"/> {stats.streak_days} DAY STREAK
              </div>
            )}
          </div>

          {[
            { label: 'Courses Completed', value: `${completedCount}`,                       sub: `of ${lessons.length}` },
            { label: 'Hours Studied',      value: `${stats.hours_studied.toFixed(1)}h`,      sub: 'Total' },
            { label: 'XP Points',          value: `${stats.xp_total} XP`,                    sub: `Level ${Math.floor(stats.xp_total / 200) + 1}` },
          ].map(s => (
            <div key={s.label} className="flex-1 p-5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-2">{s.label}</p>
              <p className="text-2xl font-black text-foreground">{s.value}</p>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">{s.sub}</p>
              <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full"
                  style={{ width: `${Math.min(100, (completedCount / Math.max(lessons.length, 1)) * 100)}%` }}/>
              </div>
            </div>
          ))}
        </div>

        {nextLesson && (
          <div className="flex items-center gap-4 px-6 py-3.5 bg-violet-50 dark:bg-violet-500/5 border-t border-violet-200 dark:border-violet-500/15 flex-wrap">
            <Sparkles className="h-4 w-4 text-violet-500 flex-shrink-0"/>
            <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 flex-shrink-0">AI Recommendation</p>
            <p className="text-xs text-muted-foreground flex-shrink-0">Next lesson for you:</p>
            <p className="text-sm font-black text-foreground flex-1 min-w-0 truncate">{nextLesson.title}</p>
            <button onClick={() => toggleComplete(nextLesson.id)}
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md shadow-violet-500/20 flex-shrink-0">
              Continue Learning
            </button>
          </div>
        )}
      </div>

      {categories.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-foreground">Explore by Category</h3>
            {activeCat && (
              <button onClick={() => setActiveCat('')}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                <RotateCcw className="h-3 w-3"/> All
              </button>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {categories.map(cat => (
              <motion.button key={cat.name}
                onClick={() => {
                  const next = activeCat === cat.name ? '' : cat.name;
                  setActiveCat(next);
                  setShowMore(10);
                  console.log('[LearningHub] category clicked:', next);
                }}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className={`flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all ${
                  activeCat === cat.name
                    ? 'bg-violet-600 border-violet-600 text-white shadow-lg shadow-violet-500/20'
                    : 'bg-card border-border hover:border-border/60 hover:shadow-sm text-foreground'
                }`}>
                <span className="text-xl">{CATEGORY_EMOJI[cat.name] ?? '📚'}</span>
                <div className="text-left">
                  <p className={`text-xs font-black whitespace-nowrap ${activeCat === cat.name ? 'text-white' : ''}`}>{cat.name}</p>
                  <p className={`text-[10px] ${activeCat === cat.name ? 'text-white/70' : 'text-muted-foreground'}`}>{cat.count} lessons</p>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-5 items-start">

        <div className="flex-1 min-w-0 space-y-4">

          <div className="flex gap-1 p-1 rounded-xl bg-muted border border-border">
            {([
              { id: 'all',         label: 'All Lessons', count: lessons.length },
              { id: 'in_progress', label: 'In Progress', count: inProgressCount },
              { id: 'completed',   label: 'Completed',   count: completedCount },
              { id: 'saved',       label: 'Saved',       count: savedCount },
            ] as const).map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === t.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                }`}>
                {t.label}
                {t.count > 0 && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                    activeTab === t.id ? 'bg-violet-600 text-white' : 'bg-muted-foreground/15 text-muted-foreground'
                  }`}>{t.count}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none"/>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search lessons, concepts, tags..."
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
              <button onClick={() => { setSearch(''); setActiveCat(''); setFilterDiff(''); setActiveTab('all'); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-muted-foreground text-xs font-semibold hover:bg-muted transition-colors">
                <RotateCcw className="h-3.5 w-3.5"/> Reset
              </button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{filtered.length} lessons</span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted/30 rounded-2xl animate-pulse"/>)}
            </div>
          ) : filtered.length === 0 && activeCat !== '' ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border bg-muted/20">
              <span className="text-4xl mb-3">{CATEGORY_EMOJI[activeCat] ?? '📚'}</span>
              <p className="text-sm font-bold text-foreground mb-1">No lessons found in "{activeCat}" yet</p>
              <p className="text-xs text-muted-foreground mb-4">Check back soon — more content is being added.</p>
              <button onClick={() => { setActiveCat(''); setShowMore(10); }}
                className="text-xs text-violet-500 dark:text-violet-400 hover:opacity-70 transition-opacity border border-violet-200 dark:border-violet-500/20 px-3 py-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-500/10">
                ← View all lessons
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border bg-muted/20">
              <Search className="h-8 w-8 text-muted-foreground/20 mb-3"/>
              <p className="text-sm font-bold text-foreground mb-1">No lessons match</p>
              <p className="text-xs text-muted-foreground mb-4">Try adjusting your search or filters</p>
              <button onClick={() => { setSearch(''); setActiveCat(''); setFilterDiff(''); setActiveTab('all'); }}
                className="text-xs text-violet-500 hover:opacity-70 transition-opacity">Clear filters →</button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {filtered.slice(0, showMore).map((lesson, i) => (
                  <motion.div key={lesson.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.025, ease }}>
                    <LessonCard
                      lesson={lesson}
                      progress={progMap[lesson.id]}
                      onSave={toggleSave}
                      onComplete={toggleComplete}
                    />
                  </motion.div>
                ))}
              </div>
              {filtered.length > showMore && (
                <div className="text-center pt-2">
                  <button onClick={() => setShowMore(n => n + 10)}
                    className="flex items-center gap-2 mx-auto px-6 py-3 rounded-xl border border-border text-muted-foreground text-sm font-semibold hover:bg-muted hover:text-foreground transition-all">
                    Load more lessons <ChevronDown className="h-4 w-4"/>
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="w-72 flex-shrink-0 space-y-4 hidden lg:block">

          <AIAssistant lessons={lessons}/>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-black text-foreground mb-4">Your Progress</p>
            <div className="space-y-3">
              {[
                { label: 'Lessons Done', val: completedCount, total: Math.max(lessons.length, 1), color: 'bg-emerald-500' },
                { label: 'XP Earned',    val: stats.xp_total,  total: Math.max(stats.xp_total, 500), color: 'bg-violet-500', suffix: ' XP' },
              ].map(s => (
                <div key={s.label}>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-bold text-foreground">{s.val}{s.suffix ?? ''}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (s.val / s.total) * 100)}%` }}
                      transition={{ duration: 0.8, ease }}
                      className={`h-full rounded-full ${s.color}`}/>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex justify-between text-[10px] mb-1.5">
                <span className="font-bold text-muted-foreground">Weekly Goal</span>
                <span className="text-muted-foreground">{Math.round(stats.hours_studied * 60)} / 300 min</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (stats.hours_studied * 60 / 300) * 100)}%` }}
                  transition={{ duration: 0.8 }} className="h-full bg-emerald-500 rounded-full"/>
              </div>
              <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                {Math.round((stats.hours_studied * 60 / 300) * 100)}%
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs font-black text-foreground mb-3 flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5 text-violet-500"/> Top Students
            </p>
            <div className="space-y-2.5">
              {[
                { name:'TraderSly',    level:18, xp:3250 },
                { name:'MarketWizard', level:16, xp:2890 },
                { name:'ChartNinja',   level:15, xp:2450 },
              ].map((s, i) => (
                <div key={s.name} className="flex items-center gap-3">
                  <span className={`text-sm font-black w-4 ${i===0?'text-violet-500':'text-muted-foreground/60'}`}>{i+1}</span>
                  <div className="w-7 h-7 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-black text-foreground">{s.name[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{s.name}</p>
                    <p className="text-[9px] text-muted-foreground">Level {s.level}</p>
                  </div>
                  <span className="text-[10px] font-black text-violet-500 dark:text-violet-400">{s.xp.toLocaleString()} XP</span>
                </div>
              ))}
              <div className="flex items-center gap-3 pt-2 border-t border-border">
                <span className="text-sm font-black w-4 text-muted-foreground/50">4</span>
                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/15 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">You</span>
                </div>
                <div className="flex-1"><p className="text-xs font-bold text-foreground">You</p><p className="text-[9px] text-muted-foreground">Level {Math.floor(stats.xp_total / 200) + 1}</p></div>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">{stats.xp_total} XP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
