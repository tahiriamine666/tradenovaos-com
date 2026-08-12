// AI Trading Assistant side panel for the Trade Plan page.
// Combines deterministic rule-based coaching with an optional AI call
// (trade-plan-analysis edge function) and recommends trading models.
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, AlertTriangle, Zap, Target, ShieldCheck,
  Brain, Gauge, Lightbulb, RefreshCw,
} from 'lucide-react';

export interface AssistantPlan {
  market_bias: string;
  session: string;
  focus: string;
  setups_to_trade: string[];
  confidence: number;
  volatility: string;
  max_daily_loss: number | null;
  max_risk_per_trade: number | null;
  daily_target: number | null;
  max_trades: number | null;
  emotion: string;
  sleep_quality: string;
  discipline_score: number;
  avoid_before_news: boolean;
  news_events: any[];
  checklist: { done: boolean }[];
  ai_analysis: Record<string, any>;
}

interface ModelRec {
  name: string;
  why: string;
  fit: number; // 0-100
}

// ── Rule-based model recommendation ─────────────────────────────────────────
function recommendModels(p: AssistantPlan): ModelRec[] {
  const bias = p.market_bias;
  const session = (p.session || '').toLowerCase();
  const vol = p.volatility;
  const out: ModelRec[] = [];

  const push = (name: string, why: string, fit: number) => out.push({ name, why, fit: Math.max(0, Math.min(100, fit)) });

  if (session.includes('london') || session.includes('overlap')) {
    push('ICT Judas Swing', 'London/NY sessions frequently open with a false move before the real expansion.', 88);
  }
  if (session.includes('new york') || session.includes('overlap')) {
    push('AMD (Accumulation → Manipulation → Distribution)', 'NY session typically manipulates the Asian/London range before distributing.', 86);
  }
  if (session.includes('asia')) {
    push('Asian Range Breakout', 'Low-volatility Asia builds a clean range that London expands from.', 80);
  }
  if (bias === 'bullish' || bias === 'bearish') {
    push('ICT Order Block + FVG Continuation', `Clear ${bias} bias — trade pullbacks into the last ${bias === 'bullish' ? 'bullish' : 'bearish'} OB / fair value gap.`, 84);
    push('Break of Structure Continuation', 'Directional bias favours structure-based continuation entries over reversals.', 78);
  }
  if (bias === 'ranging' || bias === 'neutral') {
    push('Liquidity Sweep Reversal', 'Range conditions favour fading sweeps of range highs/lows.', 82);
    push('Mean Reversion to VWAP / 20 EMA', 'No directional edge — rotate between value extremes instead of chasing.', 74);
  }
  if (vol === 'high') {
    push('Silver Bullet (1h window)', 'High volatility — use a tight, defined time window and take partials fast.', 76);
  }
  if (vol === 'low') {
    push('Wyckoff Accumulation/Distribution', 'Low volatility builds cause; watch for spring/upthrust before expansion.', 72);
  }
  if (p.avoid_before_news && (p.news_events?.length ?? 0) > 0) {
    push('Post-News Retracement', 'You are avoiding pre-news entries — wait for the spike, trade the retracement.', 70);
  }

  // De-dupe by name and sort by fit, adjust by confidence
  const seen = new Set<string>();
  return out
    .filter(m => (seen.has(m.name) ? false : (seen.add(m.name), true)))
    .map(m => ({ ...m, fit: Math.round(m.fit * (0.7 + (p.confidence / 100) * 0.3)) }))
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 4);
}

// ── Rule-based readiness ────────────────────────────────────────────────────
function localReadiness(p: AssistantPlan) {
  let score = 50;
  const warnings: string[] = [];
  const tips: string[] = [];

  if (p.max_daily_loss) score += 10; else warnings.push('No max daily loss set — you have no circuit breaker.');
  if (p.max_risk_per_trade) score += 8; else warnings.push('Risk per trade is undefined.');
  if ((p.max_risk_per_trade ?? 0) > 2) warnings.push(`Risk/trade of ${p.max_risk_per_trade}% is above the 2% guardrail.`);
  if (p.setups_to_trade?.[0]) score += 8; else tips.push('Define a main setup so you only take A+ entries.');
  if (p.session) score += 6; else tips.push('Pick a session to avoid trading all day.');
  if (p.focus?.trim()) score += 6; else tips.push('Write your session focus — a plan you cannot state is not a plan.');

  const done = p.checklist?.filter(i => i.done).length ?? 0;
  const total = p.checklist?.length ?? 0;
  if (total) score += Math.round((done / total) * 12);
  if (total && done < total) tips.push(`Checklist ${done}/${total} — finish it before your first entry.`);

  if (['anxious', 'tired', 'frustrated'].includes(p.emotion)) {
    score -= 12;
    warnings.push(`You logged "${p.emotion}" — reduce size or sit out until neutral.`);
  }
  if (p.sleep_quality === 'poor') { score -= 8; warnings.push('Poor sleep is strongly correlated with impulsive execution.'); }
  if (p.confidence >= 90) tips.push('Very high confidence can turn into overtrading — respect max trades.');
  if (p.confidence <= 30) tips.push('Low confidence — consider paper trading or half size today.');
  if ((p.discipline_score ?? 7) <= 4) warnings.push('Self-rated discipline is low — enable stop-on-rule-break.');
  if (!p.max_trades) tips.push('Cap your max trades to prevent revenge trading.');

  score = Math.max(0, Math.min(100, score));
  const verdict = score >= 78 ? 'Ready to trade' : score >= 55 ? 'Proceed with caution' : 'Do not trade today';
  return { score, warnings, tips, verdict };
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
      <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="h-full rounded-full" style={{ background: color }} />
    </div>
  );
}

export default function AiTradePlanAssistant({
  plan, analyzing, onAnalyze,
}: {
  plan: AssistantPlan;
  analyzing: boolean;
  onAnalyze: () => void;
}) {
  const models = useMemo(() => recommendModels(plan), [plan]);
  const local = useMemo(() => localReadiness(plan), [plan]);
  const ai = (plan.ai_analysis ?? {}) as any;

  const verdict = ai.verdict ?? local.verdict;
  const readiness = ai.readiness_score ?? local.score;
  const warnings: string[] = [...(ai.warnings ?? []), ...local.warnings].slice(0, 5);
  const tips: string[] = [...(ai.suggestions ?? []), ...local.tips].slice(0, 5);
  const aiModels: string[] = ai.recommended_models ?? [];

  const verdictCls =
    verdict === 'Ready to trade' ? 'bg-emerald-500/12 text-emerald-400 border-emerald-500/25'
    : verdict === 'Do not trade today' ? 'bg-red-500/12 text-red-400 border-red-500/25'
    : 'bg-amber-500/12 text-amber-400 border-amber-500/25';

  return (
    <aside className="lg:sticky lg:top-4 space-y-3">
      <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-600/[0.08] to-white/[0.02] overflow-hidden shadow-2xl shadow-black/30">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-white/[0.07]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-violet-500/15 border border-violet-500/25 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            </div>
            <div>
              <p className="text-xs font-black text-white">AI Trading Assistant</p>
              <p className="text-[10px] text-white/30">Live plan review</p>
            </div>
          </div>
          <button onClick={onAnalyze} disabled={analyzing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-violet-500/25 bg-violet-500/10 text-violet-300 text-[10px] font-black hover:bg-violet-500/20 transition disabled:opacity-50">
            <RefreshCw className={`h-3 w-3 ${analyzing ? 'animate-spin' : ''}`} />
            {analyzing ? 'Thinking' : 'Run AI'}
          </button>
        </div>

        {/* Readiness */}
        <div className="px-5 py-4 border-b border-white/[0.06] space-y-3">
          <div className={`inline-flex items-center gap-1.5 text-[10px] font-black px-2.5 py-1 rounded-full border ${verdictCls}`}>
            <Gauge className="h-3 w-3" /> {verdict}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-wider">
              <span>Readiness</span><span className="text-white">{readiness}%</span>
            </div>
            <Bar value={readiness} color="#7c3aed" />
            <div className="flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-wider pt-1">
              <span>Discipline</span><span className="text-white">{ai.discipline_score ?? plan.discipline_score * 10}%</span>
            </div>
            <Bar value={ai.discipline_score ?? plan.discipline_score * 10} color="#10b981" />
            <div className="flex items-center justify-between text-[10px] font-bold text-white/40 uppercase tracking-wider pt-1">
              <span>Risk control</span>
              <span className="text-white">{ai.risk_score ?? (plan.max_daily_loss && plan.max_risk_per_trade ? 85 : 45)}%</span>
            </div>
            <Bar value={ai.risk_score ?? (plan.max_daily_loss && plan.max_risk_per_trade ? 85 : 45)} color="#f59e0b" />
          </div>
        </div>

        {/* Recommended models */}
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <p className="flex items-center gap-1.5 text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">
            <Target className="h-3 w-3 text-violet-400" /> Recommended models
          </p>
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {models.map(m => (
                <motion.div key={m.name} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <p className="text-[11px] font-black text-white/85 leading-tight">{m.name}</p>
                    <span className="text-[10px] font-black text-violet-300 flex-shrink-0">{m.fit}%</span>
                  </div>
                  <Bar value={m.fit} color="#8b5cf6" />
                  <p className="text-[10px] text-white/40 mt-2 leading-relaxed">{m.why}</p>
                </motion.div>
              ))}
            </AnimatePresence>
            {models.length === 0 && (
              <p className="text-[11px] text-white/30">Set a bias and session to get model recommendations.</p>
            )}
            {aiModels.length > 0 && (
              <div className="pt-1 flex flex-wrap gap-1.5">
                {aiModels.map((m, i) => (
                  <span key={i} className="text-[9px] font-bold px-2 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300">
                    AI · {m}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <p className="flex items-center gap-1.5 text-[10px] font-black text-white/40 uppercase tracking-widest mb-2.5">
              <AlertTriangle className="h-3 w-3 text-amber-400" /> Risk warnings
            </p>
            <div className="space-y-1.5">
              {warnings.map((w, i) => (
                <p key={i} className="text-[11px] text-amber-300/75 flex items-start gap-1.5 leading-relaxed">
                  <span className="mt-1 w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />{w}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {tips.length > 0 && (
          <div className="px-5 py-4 border-b border-white/[0.06]">
            <p className="flex items-center gap-1.5 text-[10px] font-black text-white/40 uppercase tracking-widest mb-2.5">
              <Lightbulb className="h-3 w-3 text-violet-400" /> Coaching
            </p>
            <div className="space-y-1.5">
              {tips.map((t, i) => (
                <p key={i} className="text-[11px] text-white/55 flex items-start gap-1.5 leading-relaxed">
                  <Zap className="h-3 w-3 text-violet-400/70 mt-0.5 flex-shrink-0" />{t}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Context strip */}
        <div className="px-5 py-3.5 grid grid-cols-2 gap-2 text-[10px]">
          {[
            { icon: Brain, label: 'Bias', value: plan.market_bias || '—' },
            { icon: Gauge, label: 'Session', value: plan.session || '—' },
            { icon: ShieldCheck, label: 'Risk/trade', value: plan.max_risk_per_trade ? `${plan.max_risk_per_trade}%` : '—' },
            { icon: Target, label: 'Confidence', value: `${plan.confidence}%` },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5 text-white/40">
              <s.icon className="h-3 w-3 text-white/25" />
              <span className="uppercase tracking-wider">{s.label}</span>
              <span className="ml-auto font-bold text-white/70 capitalize truncate">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-[10px] text-white/25 px-1 leading-relaxed">
        Recommendations are generated from your plan inputs and are not financial advice.
      </p>
    </aside>
  );
}
