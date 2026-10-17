import { useRef, useState } from 'react';
import { AUDIT_AREAS, AUDIT_QUESTIONS, scoreAudit, type AuditAnswers } from '@/lib/publicPsychologyAudit';
import InformationLayout from './InformationLayout';

const FREQUENCY = ['Never', 'Rarely', 'Sometimes', 'Often', 'Consistently'];

export default function PsychologyAudit() {
  const [answers, setAnswers] = useState<AuditAnswers>({});
  const [result, setResult] = useState<ReturnType<typeof scoreAudit>>(null);
  const [error, setError] = useState('');
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const answered = AUDIT_QUESTIONS.filter(q => answers[q.id] !== undefined).length;
  return <InformationLayout path="/psychology-audit" title="A clearer look at your trading habits." eyebrow="FREE PSYCHOLOGY AUDIT · NO ACCOUNT NEEDED" description="Twelve questions. Six areas of your process. An honest starting point for your next review.">
    <section className="info-note" aria-label="About this assessment"><h2>Reflection, not a diagnosis.</h2><p>Think about your recent trading sessions, not your best day. Answer each statement from Never to Consistently. If you have not traded yet, use practice sessions; if you cannot judge a statement, come back after observing your process.</p><p>This is an educational self-assessment, not a validated psychological test, a measure of trading skill, or a prediction of returns. Answers stay in this page’s memory. They are not sent to a database or saved in browser storage. Reloading, leaving this page, or resetting clears them.</p></section>
    <form onSubmit={event => { event.preventDefault(); const scored = scoreAudit(answers); if (!scored) { setError('Please answer all 12 questions before viewing your results.'); return; } setError(''); setResult(scored); requestAnimationFrame(() => resultHeading.current?.focus()); }}>
      <div className="info-progress"><label htmlFor="audit-progress">{answered} of 12 answered</label><progress id="audit-progress" max={12} value={answered} /></div>
      {AUDIT_AREAS.map((area, areaIndex) => <section className="info-section" key={area.id}><p className="info-eyebrow">0{areaIndex + 1} / 06</p><h2>{area.name}</h2>{area.questions.map((text, i) => { const id = `${area.id}-${i}`; return <fieldset className="audit-question" key={id}><legend>{text}</legend><div className="audit-options">{FREQUENCY.map((label, index) => <label key={label}><input type="radio" name={id} value={index + 1} checked={answers[id] === index + 1} onChange={() => { setAnswers(old => ({ ...old, [id]: index + 1 })); setResult(null); setError(''); }} /><span>{label}</span></label>)}</div></fieldset>; })}</section>)}
      {error && <p role="alert" className="info-error">{error}</p>}
      <div className="info-actions"><button className="info-button" type="submit">See my reflection</button><button type="button" className="info-secondary" onClick={() => { setAnswers({}); setResult(null); setError(''); }}>Reset answers</button></div>
    </form>
    {result && <section className="info-results" aria-labelledby="audit-result"><p className="info-eyebrow">YOUR SELF-REPORTED HABITS</p><h2 id="audit-result" ref={resultHeading} tabIndex={-1}>Your reflection score: {result.score}/100</h2><p>A higher score means you reported more consistent constructive habits. It does not mean you should take more risk.</p><div className="info-grid">{result.areas.map(area => <article className="info-card" key={area.id}><h3>{area.name} <span>{area.score}/100</span></h3><p className="info-eyebrow">{area.score >= 75 ? 'RELATIVE STRENGTH' : area.score < 50 ? 'PRIORITY TO WORK ON' : 'ROOM TO DEVELOP'}</p><p>{area.score >= 75 ? 'Keep recording examples of this habit, including the sessions when it is difficult.' : area.advice}</p></article>)}</div><h3>One change for your next session</h3><p>{[...result.areas].sort((a, b) => a.score - b.score)[0].advice} Review whether you followed it afterward, regardless of the result.</p></section>}
    <details className="info-method"><summary>How the score is calculated</summary><p>Every question has equal weight: Never = 1, Rarely = 2, Sometimes = 3, Often = 4, Consistently = 5. Overall score = (sum of all answers − 12) ÷ 48 × 100, rounded to the nearest whole number. Each area uses its two answers: (sum − 2) ÷ 8 × 100. All 12 answers are required.</p><p>Labels are reflection guides chosen for this tool: 75–100 is a relative strength, 50–74 is room to develop, and 0–49 is a priority to work on. They are not clinical or research-validated thresholds.</p></details>
  </InformationLayout>;
}
