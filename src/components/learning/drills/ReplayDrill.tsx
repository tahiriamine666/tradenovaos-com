import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Play, CheckCircle2, XCircle, Trophy, Target, Brain,
  RefreshCw, FileText, BarChart3, Sparkles, Lock, Download,
  Clock, Zap, ChevronRight, Activity,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

// ── Types ────────────────────────────────────────────────────────────────────
export interface DrillPausePoint {
  id: string;
  dimension: string;
  prompt: string;
  type: "yes_no" | "choice" | "pick_candle" | "action";
  options: string[];
  correct: number;
  points: number;
  /** Per-option points (used by entry-timing tiered scoring). */
  tiers?: number[];
  explain?: string;
}
export interface DrillScenario {
  id: string;
  title: string;
  setup_brief: string;
  tradingview: { symbol: string; interval: string; studies?: string[] };
  pause_points: DrillPausePoint[];
}
export interface DrillRubricDim { key: string; label: string; points: number; }
export interface DrillConfig {
  intro?: string;
  topics?: string[];
  examples?: Array<{ label: string; type: string; caption: string }>;
  scoring_rubric?: { dimensions: DrillRubricDim[]; pass_threshold: number };
  scenarios?: DrillScenario[];
  resources?: Array<{ key: string; title: string; kind: "checklist"|"cheatsheet"|"journal" }>;
  ai_coach?: { buttons: Array<{ key: string; label: string; prompt: string }> };
}

interface LessonLike {
  id: string;
  slug: string;
  title: string;
  category: string;
  description: string;
  drill_config?: DrillConfig;
}

// ── TradingView widget ──────────────────────────────────────────────────────
function TVChart({ symbol, interval, studies }: { symbol: string; interval: string; studies?: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const isDark = document.documentElement.classList.contains("dark");
    const containerId = `tv_${Math.random().toString(36).slice(2)}`;
    const div = document.createElement("div");
    div.id = containerId;
    div.style.height = "100%";
    div.style.width = "100%";
    ref.current.appendChild(div);
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      const w: any = window as any;
      if (!w.TradingView) return;
      new w.TradingView.widget({
        autosize: true,
        symbol,
        interval,
        timezone: "Etc/UTC",
        theme: isDark ? "dark" : "light",
        style: "1",
        locale: "en",
        toolbar_bg: isDark ? "#0f172a" : "#f8fafc",
        hide_top_toolbar: false,
        hide_legend: false,
        withdateranges: true,
        studies: studies ?? [],
        container_id: containerId,
      });
    };
    ref.current.appendChild(script);
  }, [symbol, interval, JSON.stringify(studies)]);
  return <div ref={ref} className="w-full h-full" />;
}

// ── Scoring ─────────────────────────────────────────────────────────────────
function scorePausePoint(pp: DrillPausePoint, choice: number): number {
  if (choice === undefined || choice === null) return 0;
  if (Array.isArray(pp.tiers) && pp.tiers[choice] !== undefined) return pp.tiers[choice];
  return choice === pp.correct ? pp.points : 0;
}

// ── Drill Practice Tab ──────────────────────────────────────────────────────
export function DrillPractice({ lesson, onCompletedLesson }: {
  lesson: LessonLike;
  onCompletedLesson: () => void;
}) {
  const { user } = useAuth();
  const cfg = lesson.drill_config ?? {};
  const scenarios = cfg.scenarios ?? [];
  const rubric = cfg.scoring_rubric ?? { dimensions: [], pass_threshold: 70 };

  const [activeId, setActiveId] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, { completed: boolean; best_score: number }>>({});
  const [loadingProgress, setLoadingProgress] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("academy_drill_progress")
        .select("scenario_id, completed, best_score")
        .eq("user_id", user.id)
        .eq("lesson_id", lesson.id);
      const map: Record<string, { completed: boolean; best_score: number }> = {};
      (data ?? []).forEach((r: any) => { map[r.scenario_id] = { completed: r.completed, best_score: r.best_score }; });
      setProgress(map);
      setLoadingProgress(false);
    })();
  }, [user, lesson.id]);

  const allDone = scenarios.length > 0 && scenarios.every(s => progress[s.id]?.completed);
  useEffect(() => { if (allDone) onCompletedLesson(); /* eslint-disable-next-line */ }, [allDone]);

  const active = scenarios.find(s => s.id === activeId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-base font-black text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-violet-500" /> Interactive Replay Drills
          </p>
          <p className="text-xs text-muted-foreground">{cfg.intro || "Run each scenario, answer pause-point decisions, beat your best score."}</p>
        </div>
        <div className="text-xs text-muted-foreground">
          {Object.values(progress).filter(p => p.completed).length}/{scenarios.length} completed
        </div>
      </div>

      {scenarios.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No drill scenarios available yet.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {scenarios.map((s, i) => {
          const p = progress[s.id];
          const done = !!p?.completed;
          return (
            <button key={s.id} onClick={() => setActiveId(s.id)}
              className={`text-left rounded-2xl border p-4 transition-all hover:border-violet-400 dark:hover:border-violet-500/50 hover:shadow-sm ${done ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50/50 dark:bg-emerald-500/5" : "border-border bg-card"}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${done ? "bg-emerald-500 text-white" : "bg-violet-600 text-white"}`}>{done ? <CheckCircle2 className="h-4 w-4"/> : i + 1}</span>
                  <p className="text-sm font-black text-foreground">{s.title}</p>
                </div>
                {p?.best_score ? <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Best {p.best_score}</span> : null}
              </div>
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{s.setup_brief}</p>
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">{s.tradingview.symbol} · {s.tradingview.interval}m</span>
                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1"><Play className="h-3 w-3"/> {s.pause_points.length} decisions</span>
              </div>
            </button>
          );
        })}
      </div>

      {loadingProgress ? null : allDone && (
        <div className="rounded-2xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10 p-5 text-center">
          <Trophy className="h-8 w-8 text-emerald-500 mx-auto mb-2"/>
          <p className="text-lg font-black text-foreground">Drill Complete</p>
          <p className="text-xs text-muted-foreground">Every scenario passed — XP awarded.</p>
        </div>
      )}

      {active && (
        <ScenarioRunner
          lesson={lesson}
          scenario={active}
          rubric={rubric}
          alreadyAttempted={(progress[active.id]?.best_score ?? 0) > 0}
          onClose={() => setActiveId(null)}
          onAttempt={(scoreInfo) => {
            setProgress(prev => ({
              ...prev,
              [active.id]: {
                completed: prev[active.id]?.completed || scoreInfo.passed,
                best_score: Math.max(prev[active.id]?.best_score ?? 0, scoreInfo.score),
              }
            }));
          }}
        />
      )}
    </div>
  );
}

// ── Scenario Runner Modal ───────────────────────────────────────────────────
function ScenarioRunner({ lesson, scenario, rubric, alreadyAttempted, onClose, onAttempt }: {
  lesson: LessonLike;
  scenario: DrillScenario;
  rubric: { dimensions: DrillRubricDim[]; pass_threshold: number };
  alreadyAttempted: boolean;
  onClose: () => void;
  onAttempt: (r: { score: number; passed: boolean }) => void;
}) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useRef<number>(Date.now());

  const totalQ = scenario.pause_points.length;
  const pp = scenario.pause_points[step];
  const allAnswered = scenario.pause_points.every(q => answers[q.id] !== undefined);

  const computeResult = () => {
    let total = 0;
    const dimAgg: Record<string, { earned: number; max: number }> = {};
    scenario.pause_points.forEach(q => {
      const earned = scorePausePoint(q, answers[q.id]);
      total += earned;
      const d = q.dimension;
      if (!dimAgg[d]) dimAgg[d] = { earned: 0, max: 0 };
      dimAgg[d].earned += earned;
      dimAgg[d].max += q.points;
    });
    const max = scenario.pause_points.reduce((s, q) => s + q.points, 0);
    const scaled = max > 0 ? Math.round((total / max) * 100) : 0;
    const dimensionScores: Record<string, number> = {};
    Object.entries(dimAgg).forEach(([k, v]) => { dimensionScores[k] = v.max > 0 ? Math.round((v.earned / v.max) * 100) : 0; });
    return { score: scaled, raw: total, max, dimensionScores, passed: scaled >= rubric.pass_threshold };
  };

  const submit = async () => {
    if (!user) { toast({ title: "Sign in required" }); return; }
    setSubmitting(true);
    const r = computeResult();
    const duration = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
    const firstAttemptSuccess = !alreadyAttempted && r.passed;

    let xp = 0;
    try {
      const { data: attempt, error } = await (supabase as any)
        .from("academy_drill_attempts")
        .insert({
          user_id: user.id,
          lesson_id: lesson.id,
          scenario_id: scenario.id,
          answers: scenario.pause_points.map(q => ({ id: q.id, choice: answers[q.id] })),
          dimension_scores: r.dimensionScores,
          score: r.score,
          max_score: 100,
          passed: r.passed,
          duration_sec: duration,
        })
        .select("id")
        .single();
      if (error) throw error;

      const { data: xpDelta } = await (supabase as any).rpc("award_drill_xp", {
        p_lesson_id: lesson.id,
        p_score: r.score,
        p_passed: r.passed,
        p_first_attempt_success: firstAttemptSuccess,
      });
      xp = (xpDelta as number) ?? 0;
      if (attempt?.id) {
        await (supabase as any).from("academy_drill_attempts").update({ xp_awarded: xp }).eq("id", attempt.id);
      }
    } catch (e: any) {
      toast({ title: "Could not save attempt", description: e?.message ?? "Try again.", variant: "destructive" as any });
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setSubmitted(true);
    onAttempt({ score: r.score, passed: r.passed });
    toast({ title: r.passed ? `🎉 Passed — +${xp} XP` : `Scored ${r.score}/100 — +${xp} XP` });
  };

  const result = submitted ? computeResult() : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl bg-card border border-border rounded-2xl shadow-2xl overflow-hidden my-auto">
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-gradient-to-r from-violet-600/10 to-transparent">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-black text-violet-600 dark:text-violet-400">Replay Drill</p>
            <p className="text-sm font-black text-foreground truncate">{scenario.title}</p>
          </div>
          <button onClick={onClose} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-muted">Close</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-0">
          <div className="lg:col-span-3 h-[360px] sm:h-[460px] border-b lg:border-b-0 lg:border-r border-border bg-muted/20">
            <TVChart symbol={scenario.tradingview.symbol} interval={scenario.tradingview.interval} studies={scenario.tradingview.studies} />
          </div>

          <div className="lg:col-span-2 p-5 max-h-[460px] overflow-y-auto">
            {!submitted ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Decision {step + 1} / {totalQ}</p>
                  <div className="flex gap-1">
                    {scenario.pause_points.map((q, i) => (
                      <span key={q.id} className={`h-1.5 w-6 rounded-full ${i < step ? "bg-violet-500" : i === step ? "bg-violet-300 dark:bg-violet-700" : "bg-muted"}`}/>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground mb-2">{scenario.setup_brief}</p>
                <p className="text-sm font-bold text-foreground mb-4">{pp.prompt}</p>

                <div className="space-y-2 mb-4">
                  {pp.options.map((opt, i) => {
                    const selected = answers[pp.id] === i;
                    return (
                      <button key={i}
                        onClick={() => setAnswers(prev => ({ ...prev, [pp.id]: i }))}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm text-left transition-all ${selected ? "border-violet-400 dark:border-violet-500/60 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400" : "border-border bg-muted/30 text-foreground/80 hover:bg-muted"}`}>
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-black ${selected ? "border-violet-500 bg-violet-500 text-white" : "border-border"}`}>{["A","B","C","D"][i]}</span>
                        <span className="flex-1">{opt}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}
                    className="px-3 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground disabled:opacity-40 hover:bg-muted">Back</button>
                  {step < totalQ - 1 ? (
                    <button disabled={answers[pp.id] === undefined} onClick={() => setStep(s => Math.min(totalQ - 1, s + 1))}
                      className="px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-black hover:bg-violet-500 disabled:opacity-40">Next</button>
                  ) : (
                    <button disabled={!allAnswered || submitting} onClick={submit}
                      className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-black hover:bg-emerald-500 disabled:opacity-40 flex items-center gap-1.5">
                      {submitting ? <RefreshCw className="h-3.5 w-3.5 animate-spin"/> : <Trophy className="h-3.5 w-3.5"/>}
                      Submit Drill
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className={`rounded-2xl p-5 text-center border ${result!.passed ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/10" : "border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10"}`}>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Final Score</p>
                  <p className="text-5xl font-black text-foreground">{result!.score}<span className="text-xl text-muted-foreground">/100</span></p>
                  <p className={`text-xs font-black mt-1 ${result!.passed ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{result!.passed ? "PASSED" : `Need ${rubric.pass_threshold}+ to pass`}</p>
                </div>

                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Dimensions</p>
                  <div className="space-y-2">
                    {Object.entries(result!.dimensionScores).map(([k, v]) => {
                      const dim = rubric.dimensions.find(d => d.key === k);
                      return (
                        <div key={k}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-foreground">{dim?.label ?? k}</p>
                            <p className="text-xs font-black text-foreground">{v}</p>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full ${v >= 70 ? "bg-emerald-500" : v >= 40 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${v}%` }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <details className="rounded-xl border border-border bg-muted/30 p-3">
                  <summary className="text-xs font-bold cursor-pointer">Review answers</summary>
                  <div className="space-y-2 mt-3">
                    {scenario.pause_points.map((q, i) => {
                      const c = answers[q.id];
                      const earned = scorePausePoint(q, c);
                      const ok = earned >= q.points;
                      return (
                        <div key={q.id} className="text-xs">
                          <p className="font-semibold text-foreground">{i + 1}. {q.prompt}</p>
                          <p className={ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                            Your answer: {q.options[c]} · +{earned}/{q.points}
                          </p>
                          {!ok && <p className="text-muted-foreground">Correct: {q.options[q.correct]}</p>}
                          {q.explain && <p className="text-muted-foreground italic mt-0.5">{q.explain}</p>}
                        </div>
                      );
                    })}
                  </div>
                </details>

                <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-xs font-black hover:bg-violet-500">Done</button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Drill Examples Tab ──────────────────────────────────────────────────────
export function DrillExamples({ lesson }: { lesson: LessonLike }) {
  const examples = lesson.drill_config?.examples ?? [];
  const colorFor = (t: string) =>
    t === "good" || t === "perfect"
      ? "border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-500/5"
      : t === "early" || t === "late" || t === "average"
      ? "border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/5"
      : "border-red-300 dark:border-red-500/40 bg-red-50 dark:bg-red-500/5";
  const iconFor = (t: string) =>
    t === "good" || t === "perfect" ? <CheckCircle2 className="h-5 w-5 text-emerald-500"/> :
    t === "fake" || t === "bad" ? <XCircle className="h-5 w-5 text-red-500"/> :
    <Activity className="h-5 w-5 text-amber-500"/>;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-black text-foreground mb-1">Visual Comparison</h3>
        <p className="text-sm text-muted-foreground">Side-by-side patterns to anchor recognition before practice.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {examples.map((e, i) => (
          <div key={i} className={`rounded-2xl border p-4 ${colorFor(e.type)}`}>
            <div className="flex items-center gap-2 mb-2">{iconFor(e.type)}<p className="text-sm font-black text-foreground">{e.label}</p></div>
            <p className="text-xs text-foreground/80 leading-relaxed">{e.caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Drill Analytics (sidebar / footer) ──────────────────────────────────────
export function DrillAnalytics({ lesson }: { lesson: LessonLike }) {
  const { user } = useAuth();
  const [roll, setRoll] = useState<any>(null);
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const [{ data: r }, { data: a }] = await Promise.all([
        (supabase as any).from("academy_drill_scores").select("*").eq("user_id", user.id).eq("lesson_id", lesson.id).maybeSingle(),
        (supabase as any).from("academy_drill_attempts").select("score, submitted_at, scenario_id").eq("user_id", user.id).eq("lesson_id", lesson.id).order("submitted_at", { ascending: false }).limit(10),
      ]);
      if (cancelled) return;
      setRoll(r); setRecent(a ?? []);
    })();
    return () => { cancelled = true; };
  }, [user, lesson.id]);

  const scenarios = lesson.drill_config?.scenarios ?? [];
  const completion = roll ? Math.round((Math.min(roll.attempts, scenarios.length) / Math.max(1, scenarios.length)) * 100) : 0;
  const dimLabel = (k?: string | null) => k ? (lesson.drill_config?.scoring_rubric?.dimensions.find(d => d.key === k)?.label ?? k) : "—";

  const metrics = [
    { l: "Attempts", v: roll?.attempts ?? 0, icon: <RefreshCw className="h-3.5 w-3.5"/> },
    { l: "Best Score", v: roll?.best_score ?? 0, icon: <Trophy className="h-3.5 w-3.5"/> },
    { l: "Avg Score", v: roll ? Math.round(Number(roll.avg_score)) : 0, icon: <BarChart3 className="h-3.5 w-3.5"/> },
    { l: "Time Spent", v: roll ? `${Math.round((roll.total_time_sec ?? 0) / 60)}m` : "0m", icon: <Clock className="h-3.5 w-3.5"/> },
  ];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-black text-foreground mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-500"/> Drill Analytics</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {metrics.map(m => (
          <div key={m.l} className="rounded-xl bg-muted/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">{m.icon}{m.l}</p>
            <p className="text-xl font-black text-foreground mt-0.5">{m.v}</p>
          </div>
        ))}
      </div>
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-[10px] uppercase font-bold text-muted-foreground">Completion</p>
          <p className="text-[10px] font-black text-foreground">{completion}%</p>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-600 to-violet-400" style={{ width: `${completion}%` }}/>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/5 p-2.5">
          <p className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Strongest</p>
          <p className="text-xs font-black text-foreground truncate">{dimLabel(roll?.strongest_dimension)}</p>
        </div>
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/5 p-2.5">
          <p className="text-[10px] uppercase font-bold text-red-600 dark:text-red-400">Weakest</p>
          <p className="text-xs font-black text-foreground truncate">{dimLabel(roll?.weakest_dimension)}</p>
        </div>
      </div>
      <div>
        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Last attempts</p>
        <div className="flex items-end gap-1 h-12">
          {recent.length === 0 && <p className="text-xs text-muted-foreground italic">No attempts yet.</p>}
          {recent.slice().reverse().map((a, i) => (
            <div key={i} title={`${a.score}/100`} className="flex-1 rounded-t bg-violet-500/80" style={{ height: `${Math.max(8, a.score)}%` }}/>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Drill AI Coach ──────────────────────────────────────────────────────────
export function DrillAiCoach({ lesson, isPaid }: { lesson: LessonLike; isPaid: boolean }) {
  const { user } = useAuth();
  const buttons = lesson.drill_config?.ai_coach?.buttons ?? [];
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState("");

  const ask = async (b: { key: string; label: string; prompt: string }) => {
    if (!isPaid) { toast({ title: "AI Coach is Pro/Elite", description: "Upgrade to unlock the AI Coach." }); return; }
    if (!user) return;
    setActive(b.key); setLoading(true); setAnswer("");
    try {
      const { data: roll } = await (supabase as any).from("academy_drill_scores").select("*").eq("user_id", user.id).eq("lesson_id", lesson.id).maybeSingle();
      const { data: lastAttempt } = await (supabase as any).from("academy_drill_attempts").select("*").eq("user_id", user.id).eq("lesson_id", lesson.id).order("submitted_at", { ascending: false }).limit(1).maybeSingle();
      const ctx = `Drill: ${lesson.title}\nCategory: ${lesson.category}\nRollup: ${JSON.stringify(roll ?? {})}\nLast attempt: ${JSON.stringify(lastAttempt ?? {})}`;
      const { data, error } = await supabase.functions.invoke("ai-learning-assistant", {
        body: { question: `${ctx}\n\nInstruction: ${b.prompt}` },
      });
      if (error) throw error;
      const a = (data as any)?.answer ?? "No response.";
      setAnswer(a);
      await (supabase as any).from("academy_drill_ai_reviews").insert({
        user_id: user.id, lesson_id: lesson.id,
        attempt_id: lastAttempt?.id ?? null,
        mode: b.key, prompt: b.prompt, answer: a,
      });
    } catch (e: any) {
      setAnswer(e?.message?.includes("Upgrade") ? "Upgrade to Pro or Elite to use the AI Coach." : "Could not reach AI Coach. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-sm font-black text-foreground mb-1 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-500"/> AI Drill Coach
        {!isPaid && <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1"><Lock className="h-3 w-3"/> PRO</span>}
      </p>
      <p className="text-xs text-muted-foreground mb-3">Tailored coaching from your last drill attempt.</p>
      <div className="grid grid-cols-1 gap-1.5">
        {buttons.map(b => (
          <button key={b.key} onClick={() => ask(b)} disabled={loading}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left text-xs font-medium transition-all disabled:opacity-40 ${active === b.key ? "border-violet-300 dark:border-violet-500/40 bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400" : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
            <Brain className="h-3.5 w-3.5 text-violet-500 flex-shrink-0"/>{b.label}
          </button>
        ))}
      </div>
      {(loading || answer) && (
        <div className="mt-3 rounded-xl border border-violet-200 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5 p-3">
          {loading ? (
            <p className="text-xs text-violet-700 dark:text-violet-400 flex items-center gap-2"><RefreshCw className="h-3.5 w-3.5 animate-spin"/> Coaching...</p>
          ) : (
            <p className="text-xs leading-relaxed text-foreground whitespace-pre-wrap">{answer}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Drill Resources (downloadable artefacts) ────────────────────────────────
export function DrillResources({ lesson }: { lesson: LessonLike }) {
  const cfg = lesson.drill_config ?? {};
  const resources = cfg.resources ?? [];
  const download = (filename: string, body: string) => {
    const blob = new Blob([body], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const build = (kind: string) => {
    const parts: string[] = [`# ${lesson.title} — ${kind}\n`];
    if (kind === "Checklist") {
      (cfg.topics ?? []).forEach(t => parts.push(`- [ ] ${t}\n`));
    } else if (kind === "Cheat Sheet") {
      parts.push(`## Scoring Dimensions\n`);
      (cfg.scoring_rubric?.dimensions ?? []).forEach(d => parts.push(`- **${d.label}** — up to ${d.points} pts\n`));
      parts.push(`\n## Examples\n`);
      (cfg.examples ?? []).forEach(e => parts.push(`- **${e.label}** (${e.type}) — ${e.caption}\n`));
    } else {
      parts.push(`## Trade Journal Template\n\n`);
      (cfg.scenarios ?? []).forEach((s, i) => {
        parts.push(`### Scenario ${i + 1}: ${s.title}\n`);
        parts.push(`- Symbol: ${s.tradingview.symbol} (${s.tradingview.interval}m)\n`);
        parts.push(`- Setup: ${s.setup_brief}\n`);
        parts.push(`- My decisions:\n`);
        s.pause_points.forEach((p, k) => parts.push(`  ${k + 1}. ${p.prompt} → \n`));
        parts.push(`- Score: \n- Notes: \n\n`);
      });
    }
    return parts.join("");
  };
  const fileFor = (kind: string) => `${lesson.slug}-${kind.toLowerCase().replace(/\s+/g, "-")}.md`;
  const labelFor = (k: string) => k === "checklist" ? "Checklist" : k === "cheatsheet" ? "Cheat Sheet" : "Journal Template";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 mb-3">
      <p className="text-sm font-black text-foreground mb-1 flex items-center gap-2"><FileText className="h-4 w-4 text-violet-500"/> Drill Resources</p>
      <p className="text-xs text-muted-foreground mb-3">Auto-generated from this drill — yours to keep.</p>
      <div className="space-y-2">
        {resources.map(r => (
          <button key={r.key} onClick={() => download(fileFor(labelFor(r.kind)), build(labelFor(r.kind)))}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background hover:bg-muted/40 transition-colors text-left">
            <Download className="h-4 w-4 text-violet-500 flex-shrink-0"/>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{r.title}</p>
              <p className="text-[11px] text-muted-foreground">{labelFor(r.kind)} · .md</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground"/>
          </button>
        ))}
      </div>
    </div>
  );
}
