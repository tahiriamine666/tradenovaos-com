// Per-user Weekly Review question template. Answers are keyed by stable question ids,
// never by position, so editing wording, reordering or removing a question cannot
// re-associate or erase saved answers. Removed questions stay in the template as
// inactive entries so their labels remain readable on historical reviews.
import { QUESTIONS } from "./stats";

export type ReviewQuestion = { id: string; text: string; active: boolean };

/** The four defaults reuse the original ids so answers written to the old 14-question form still line up. */
export const DEFAULT_QUESTIONS: ReviewQuestion[] = [
  { id: "did_well", text: "What did I do well this week?", active: true },
  { id: "went_wrong", text: "What were my biggest mistakes?", active: true },
  { id: "learned", text: "What did I learn this week?", active: true },
  { id: "improve_next", text: "What will I improve next week?", active: true },
];

const LEGACY_LABELS: Record<string, string> = Object.fromEntries(QUESTIONS.map(([k, q]) => [k, q]));

/** Parse a stored template defensively; falls back to the defaults when nothing usable is stored. */
export function normalizeTemplate(raw: unknown): ReviewQuestion[] {
  if (!Array.isArray(raw)) return DEFAULT_QUESTIONS.map((q) => ({ ...q }));
  const seen = new Set<string>();
  const out: ReviewQuestion[] = [];
  for (const q of raw) {
    if (!q || typeof q !== "object") continue;
    const id = typeof (q as any).id === "string" ? (q as any).id.trim() : "";
    const text = typeof (q as any).text === "string" ? (q as any).text : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, text, active: (q as any).active !== false });
  }
  return out.some((q) => q.active) || out.length ? out : DEFAULT_QUESTIONS.map((q) => ({ ...q }));
}

export const activeQuestions = (t: ReviewQuestion[]) => t.filter((q) => q.active);

/** Label for any answer id: template text (even if removed), else the original question wording, else the id. */
export function labelFor(id: string, t: ReviewQuestion[]) {
  const q = t.find((x) => x.id === id);
  if (q && q.text.trim()) return q.text;
  return LEGACY_LABELS[id] ?? id.replace(/_/g, " ");
}

/** Saved, non-empty answers whose question is not on the active template — shown read-only so nothing is lost. */
export function otherAnswers(answers: Record<string, unknown>, t: ReviewQuestion[]) {
  const active = new Set(activeQuestions(t).map((q) => q.id));
  return Object.entries(answers)
    .filter(([k, v]) => !active.has(k) && v != null && String(v).trim() !== "")
    .map(([id, v]) => ({ id, label: labelFor(id, t), value: String(v) }));
}

export const newQuestionId = () =>
  `q_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}`;

/**
 * Merge an edited active list back into the full template: removed questions become inactive
 * (kept for history), active ones take the edited order. Empty new questions are dropped.
 */
export function applyEdit(previous: ReviewQuestion[], editedActive: { id: string; text: string }[]): ReviewQuestion[] {
  const kept = editedActive
    .map((q) => ({ id: q.id, text: q.text.trim() }))
    .filter((q) => q.text || previous.some((p) => p.id === q.id));
  const activeIds = new Set(kept.map((q) => q.id));
  const prevText = new Map(previous.map((p) => [p.id, p.text]));
  return [
    ...kept.map((q) => ({ id: q.id, text: q.text || prevText.get(q.id) || "", active: true })),
    ...previous.filter((p) => !activeIds.has(p.id)).map((p) => ({ ...p, active: false })),
  ];
}

/** Restore defaults: the four defaults become active (in order); every other question is kept inactive. */
export function restoreDefaults(previous: ReviewQuestion[]): ReviewQuestion[] {
  return applyEdit(previous, DEFAULT_QUESTIONS);
}
