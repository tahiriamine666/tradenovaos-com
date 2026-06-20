// Client-side scoring engine for Replay Studio

export type ReplayTier = "elite" | "good" | "needs_work" | "poor";

export interface ScoreInput {
  outcome?: string | null;
  rr?: number | null;
  result?: number | null;
  mistakes?: string[];
  executions?: Array<{ action?: string | null }>;
  notes?: {
    what_i_saw?: string | null;
    why_entered?: string | null;
    why_exited?: string | null;
    mistakes?: string | null;
    lessons?: string | null;
  } | null;
}

export interface ReplayScores {
  execution: number;
  risk: number;
  psychology: number;
  plan_adherence: number;
  final_score: number;
  tier: ReplayTier;
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export function tierFor(score: number): ReplayTier {
  if (score >= 90) return "elite";
  if (score >= 75) return "good";
  if (score >= 60) return "needs_work";
  return "poor";
}

export function tierColor(t: ReplayTier): string {
  switch (t) {
    case "elite":
      return "text-emerald-500";
    case "good":
      return "text-green-500";
    case "needs_work":
      return "text-amber-500";
    case "poor":
      return "text-red-500";
  }
}

export function tierLabel(t: ReplayTier): string {
  return t === "elite" ? "Elite" : t === "good" ? "Good" : t === "needs_work" ? "Needs Work" : "Poor";
}

export function scoreReplay(input: ScoreInput): ReplayScores {
  const mistakes = input.mistakes ?? [];
  const execCount = (input.executions ?? []).length;
  const rr = Number(input.rr ?? 0);
  const isWin = input.outcome === "win";
  const isLoss = input.outcome === "loss";

  // Execution: based on having logged executions + outcome quality
  let execution = 50;
  if (execCount >= 2) execution += 20;
  if (execCount >= 3) execution += 10;
  if (isWin && rr >= 2) execution += 20;
  if (isWin && rr >= 3) execution += 10;
  if (mistakes.includes("Early Exit") || mistakes.includes("Chased Price")) execution -= 20;

  // Risk: penalised by risk-related mistakes
  let risk = 80;
  if (mistakes.includes("Moved SL")) risk -= 30;
  if (mistakes.includes("Oversized")) risk -= 25;
  if (mistakes.includes("No Confirmation")) risk -= 10;
  if (isLoss && rr < -1.5) risk -= 15;
  if (isWin && rr >= 2) risk += 10;

  // Psychology: penalised by emotional mistakes
  let psychology = 80;
  if (mistakes.includes("FOMO")) psychology -= 25;
  if (mistakes.includes("Revenge Trade")) psychology -= 30;
  if (mistakes.includes("Early Entry")) psychology -= 15;
  if (mistakes.includes("Broke Rules")) psychology -= 20;
  if (input.notes?.lessons && input.notes.lessons.trim().length > 20) psychology += 10;

  // Plan adherence: notes filled + no rule breaks
  let plan_adherence = 60;
  const n = input.notes;
  if (n?.what_i_saw && n.what_i_saw.trim().length > 10) plan_adherence += 10;
  if (n?.why_entered && n.why_entered.trim().length > 10) plan_adherence += 10;
  if (n?.why_exited && n.why_exited.trim().length > 10) plan_adherence += 10;
  if (n?.lessons && n.lessons.trim().length > 10) plan_adherence += 10;
  if (mistakes.includes("Broke Rules")) plan_adherence -= 30;

  execution = clamp(execution);
  risk = clamp(risk);
  psychology = clamp(psychology);
  plan_adherence = clamp(plan_adherence);

  const final_score = clamp(
    execution * 0.3 + risk * 0.25 + psychology * 0.25 + plan_adherence * 0.2,
  );
  return { execution, risk, psychology, plan_adherence, final_score, tier: tierFor(final_score) };
}
