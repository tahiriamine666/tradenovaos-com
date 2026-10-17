export const AUDIT_AREAS = [
  { id: 'discipline', name: 'Discipline', questions: ['I write my entry, exit and invalidation rules before a trade.', 'I follow my plan even when a different trade looks tempting.'], advice: 'Write a three-item entry checklist. Skip the trade if any condition is missing.' },
  { id: 'fomo', name: 'FOMO', questions: ['I let a move go when my planned entry has already passed.', 'I wait for my own criteria instead of following someone else’s urgency.'], advice: 'Define an acceptable entry zone before the session. Record missed moves without chasing them.' },
  { id: 'revenge', name: 'Response to losses', questions: ['After a loss, I pause before deciding whether another setup qualifies.', 'I keep my risk rules unchanged instead of trying to win losses back quickly.'], advice: 'Choose a post-loss pause in advance. Review the last trade before considering the next one.' },
  { id: 'frequency', name: 'Overtrading', questions: ['I stop when I reach my pre-set session limits.', 'I stay out of the market when I am bored or no valid setup is present.'], advice: 'Set a maximum number of trades before the session and log why each trade qualified.' },
  { id: 'emotion', name: 'Emotional control', questions: ['I notice stress or excitement before it changes my decisions.', 'I step away when I cannot follow my normal decision process.'], advice: 'Rate your emotional state before entry. If you feel unable to follow your rules, take a break.' },
  { id: 'risk', name: 'Risk management', questions: ['I define the amount I am prepared to lose before entering.', 'I respect my planned loss limit instead of increasing exposure to avoid a loss.'], advice: 'Write your trade and session loss limits before trading. Review adherence separately from profit.' },
] as const;

export const AUDIT_QUESTIONS = AUDIT_AREAS.flatMap(area => area.questions.map((text, index) => ({ id: `${area.id}-${index}`, text, area: area.name })));
export type AuditAnswers = Record<string, number>;

/** Equal-weight reflection score. All statements describe constructive habits. */
export function scoreAudit(answers: AuditAnswers) {
  if (AUDIT_QUESTIONS.some(q => !Number.isInteger(answers[q.id]) || answers[q.id] < 1 || answers[q.id] > 5)) return null;
  const areas = AUDIT_AREAS.map(area => {
    const total = area.questions.reduce((sum, _, i) => sum + answers[`${area.id}-${i}`] - 1, 0);
    return { id: area.id, name: area.name, score: Math.round(total / (area.questions.length * 4) * 100), advice: area.advice };
  });
  const total = AUDIT_QUESTIONS.reduce((sum, q) => sum + answers[q.id] - 1, 0);
  return { score: Math.round(total / (AUDIT_QUESTIONS.length * 4) * 100), areas };
}
