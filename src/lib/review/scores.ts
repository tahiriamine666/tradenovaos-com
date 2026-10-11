// Weekly Performance Scorecard. Deterministic 0–100 scores built ONLY from the existing
// stats functions (performance / execution / psychology / planning) — those calculations are
// not changed here. A component is used only when it has enough recorded evidence
// (MIN_SAMPLE); a category with no usable component returns score = null ("Not enough data"),
// so missing information is never shown as poor performance.
import type { execution, performance, planning, psychology } from "./stats";

export const MIN_SAMPLE = 3;
export type ScoreComponent = { label: string; value: number | null; detail: string };
export type CategoryScore = { key: string; title: string; summary: string; score: number | null; components: ScoreComponent[] };

const clamp = (x: number) => Math.max(0, Math.min(100, x));
const round = (x: number) => Math.round(clamp(x));
const pct = (n: number, d: number) => (d > 0 ? (100 * n) / d : 0);
function finish(key: string, title: string, summary: string, components: ScoreComponent[]): CategoryScore {
  const vals = components.map((c) => c.value).filter((v): v is number => v != null);
  return { key, title, summary, components, score: vals.length ? round(vals.reduce((a, b) => a + b, 0) / vals.length) : null };
}
const need = (n: number) => `Needs ${MIN_SAMPLE}+ recorded (${n} so far)`;

export function statusOf(score: number | null) {
  if (score == null) return "Not enough data";
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  return "Needs improvement";
}

export function performanceScore(p: ReturnType<typeof performance>, rrRecorded: number): CategoryScore {
  const enough = p.resolved >= MIN_SAMPLE;
  const grossLossKnown = p.losses > 0;
  return finish("performance", "Trading Performance", "Profitability, win rate and reward relative to risk.", [
    { label: "Win rate", value: enough && p.winRate != null ? p.winRate : null, detail: enough ? `${p.wins} wins of ${p.resolved} resolved trades` : need(p.resolved) },
    {
      label: "Profit factor (2.0 = full marks)",
      value: !enough ? null : grossLossKnown ? clamp((p.profitFactor ?? 0) * 50) : p.wins > 0 ? 100 : 0,
      detail: !enough ? need(p.resolved) : grossLossKnown ? `Profit factor ${(p.profitFactor ?? 0).toFixed(2)}` : p.wins > 0 ? "No losing trades" : "No winning trades",
    },
    {
      label: "Average R:R (2.0 = full marks)",
      value: enough && p.avgRR != null && rrRecorded >= MIN_SAMPLE ? clamp(p.avgRR * 50) : null,
      detail: p.avgRR != null && rrRecorded >= MIN_SAMPLE ? `Average ${p.avgRR.toFixed(2)}R over ${rrRecorded} trade(s)` : need(rrRecorded),
    },
  ]);
}

export function executionScore(e: ReturnType<typeof execution>): CategoryScore {
  const plan = e.plan && e.plan.recorded >= MIN_SAMPLE ? pct(e.plan.yes + e.plan.partial * 0.5, e.plan.recorded) : null;
  const check = e.checklist && e.checklist.recorded >= MIN_SAMPLE ? pct(e.checklist.completed, e.checklist.recorded) : null;
  const imp = e.impulsive && e.impulsive.recorded >= MIN_SAMPLE ? 100 - pct(e.impulsive.count, e.impulsive.recorded) : null;
  const rules = [e.lateEntries, e.earlyExits, e.movedStop, e.revenge].filter((f): f is { count: number; recorded: number } => !!f && f.recorded >= MIN_SAMPLE);
  const rulesVal = rules.length ? 100 - rules.reduce((a, f) => a + pct(f.count, f.recorded), 0) / rules.length : null;
  return finish("execution", "Execution", "Following the plan, checklist and execution rules without impulsive entries.", [
    { label: "Followed plan (partial = half)", value: plan, detail: e.plan ? `${e.plan.yes} yes · ${e.plan.partial} partial · ${e.plan.no} no` : need(0) },
    { label: "Checklist completed", value: check, detail: e.checklist ? `${e.checklist.completed} of ${e.checklist.recorded}` : need(0) },
    { label: "Avoided impulsive entries", value: imp, detail: e.impulsive ? `${e.impulsive.count} impulsive of ${e.impulsive.recorded}` : need(0) },
    { label: "Execution rules kept (late entry, early exit, moved stop, revenge)", value: rulesVal, detail: rules.length ? `${rules.length} rule type(s) with enough records` : "Not recorded on enough trades" },
  ]);
}

export function psychologyScore(psy: ReturnType<typeof psychology>): CategoryScore {
  const core = psy.psychScore != null && psy.psychScored >= MIN_SAMPLE ? ((psy.psychScore - 1) / 9) * 100 : null;
  const flags = [psy.fomo, psy.revenge, psy.hesitation, psy.overconfidence].filter((f): f is { count: number; recorded: number } => !!f && f.recorded >= MIN_SAMPLE);
  const control = flags.length ? 100 - flags.reduce((a, f) => a + pct(f.count, f.recorded), 0) / flags.length : null;
  return finish("psychology", "Psychology", "Discipline, patience, confidence, stress and emotional control.", [
    { label: "Discipline, patience, confidence & low stress", value: core, detail: psy.psychScore != null ? `Average ${(psy.psychScore / 2).toFixed(1)}/5 from ${psy.psychScored} trade(s)` : need(0) },
    { label: "Emotional control (no FOMO, revenge, hesitation, overconfidence)", value: control, detail: flags.length ? `${flags.length} emotion flag(s) with enough records` : "Not recorded on enough trades" },
  ]);
}

export function planningScore(pl: ReturnType<typeof planning>, tradeCount: number, tradingDays: number): CategoryScore {
  const active = tradeCount > 0 || pl.dailyPlans > 0 || pl.weeklyOutlooks > 0;
  const coverage = pl.tradesWithPlan && pl.tradesWithPlan.total >= MIN_SAMPLE ? pct(pl.tradesWithPlan.count, pl.tradesWithPlan.total) : null;
  const weekly = !active ? null : pl.weeklyOutlooks === 0 ? 0 : pl.weeklyComplete > 0 ? 100 : 50;
  const prep = pl.checklistRate;
  const adherence = [pl.setupMatch && pl.setupMatch.recorded >= MIN_SAMPLE ? pct(pl.setupMatch.matched, pl.setupMatch.recorded) : null,
    pl.riskOver && pl.riskOver.recorded >= MIN_SAMPLE ? 100 - pct(pl.riskOver.over, pl.riskOver.recorded) : null].filter((x): x is number => x != null);
  return finish("planning", "Planning", "Daily plans, Weekly Outlook, checklist preparation and plan adherence.", [
    { label: "Trades with a daily plan", value: coverage, detail: pl.tradesWithPlan ? `${pl.tradesWithPlan.count} of ${pl.tradesWithPlan.total} trades · ${pl.planDays} plan day(s) over ${tradingDays} trading day(s)` : need(0) },
    { label: "Weekly Outlook (complete = full, started = half)", value: weekly, detail: active ? `${pl.weeklyComplete} complete of ${pl.weeklyOutlooks}` : "No trading or planning activity" },
    { label: "Plan checklist preparation", value: prep, detail: prep != null ? `${prep.toFixed(0)}% of plan checklist items checked` : "No plan checklist items" },
    { label: "Plan adherence (planned setup, risk within plan)", value: adherence.length ? adherence.reduce((a, b) => a + b, 0) / adherence.length : null, detail: adherence.length ? "From recorded setups and risk %" : "Not recorded on enough trades" },
  ]);
}

/** Overall only when every category has a score — otherwise it would silently reweight around missing data. */
export function overallScore(cats: CategoryScore[]) {
  if (!cats.length || cats.some((c) => c.score == null)) return null;
  return Math.round(cats.reduce((a, c) => a + (c.score as number), 0) / cats.length);
}
