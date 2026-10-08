import { useState } from 'react';
import { Brain, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Current emotion choices, followed by older options kept so historical values stay selectable. */
export const EMOTIONS = ['Calm', 'Focused', 'Hesitant', 'FOMO', 'Frustrated', 'Revenge', 'Overconfident', 'Tired', 'Anxious', 'Neutral'] as const;
export const LEGACY_EMOTIONS = ['Confident', 'Distracted'] as const;

export type PlanStatus = 'yes' | 'no' | 'partial';
export type Psychology = {
  emotion_before: string | null;
  emotion_after: string | null;
  confidence_score: number | null;
  discipline_score: number | null;
  stress_score: number | null;
  patience_score: number | null;
  execution_score: number | null;
  followed_plan: boolean | null;
  plan_status: PlanStatus | null;
  impulsive_entry: boolean | null;
  fomo: boolean | null;
  revenge_trade: boolean | null;
  hesitation: boolean | null;
  overconfidence: boolean | null;
  psychology_note: string | null;
};

export const EMPTY_PSYCHOLOGY: Psychology = {
  emotion_before: null, emotion_after: null, confidence_score: null, discipline_score: null, stress_score: null, patience_score: null,
  execution_score: null, followed_plan: null, plan_status: null, impulsive_entry: null, fomo: null, revenge_trade: null, hesitation: null,
  overconfidence: null, psychology_note: null,
};

export function psychologyFrom(row: any): Psychology {
  if (!row) return EMPTY_PSYCHOLOGY;
  return Object.fromEntries(Object.keys(EMPTY_PSYCHOLOGY).map((k) => [k, row[k] ?? null])) as Psychology;
}

export function hasPsychology(p: Partial<Psychology> | null | undefined) {
  return !!p && Object.keys(EMPTY_PSYCHOLOGY).some((k) => (p as any)[k] !== null && (p as any)[k] !== undefined && (p as any)[k] !== '');
}

/**
 * Scores are STORED on the historical 1–10 scale and SHOWN on a 1–5 scale.
 * UI → storage: stored = ui × 2. Storage → UI: ui = stored / 2 (legacy odd values show as x.5, never rounded).
 */
export const toStored = (ui: number | null) => (ui == null ? null : ui * 2);
export const toUi = (stored: number | null) => (stored == null ? null : stored / 2);

/** Plan status → legacy boolean. Partial leaves the existing boolean untouched (no destructive conversion). */
export function withPlanStatus(p: Psychology, status: PlanStatus | null): Psychology {
  return { ...p, plan_status: status, followed_plan: status === 'yes' ? true : status === 'no' ? false : status === null ? null : p.followed_plan };
}
export const effectivePlanStatus = (p: Pick<Psychology, 'plan_status' | 'followed_plan'>): PlanStatus | null =>
  p.plan_status ?? (p.followed_plan === true ? 'yes' : p.followed_plan === false ? 'no' : null);

const selectCls = 'w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30';
const chip = (on: boolean) => cn('h-7 flex-1 rounded border text-[11px] font-semibold transition-colors', on ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:bg-muted');

function Scale5({ label, value, onChange }: { label: string; value: number | null; onChange: (stored: number | null) => void }) {
  const ui = toUi(value);
  return (
    <div>
      <p className="mb-1.5 flex justify-between text-xs font-medium text-muted-foreground">{label}
        <span className="font-mono text-foreground">{ui == null ? '—' : `${ui}/5`}{ui != null && !Number.isInteger(ui) && <span className="ml-1 text-muted-foreground">(legacy)</span>}</span></p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${label} ${n} of 5`} aria-pressed={ui === n} onClick={() => onChange(ui === n ? null : toStored(n))} className={chip(ui === n)}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-1">
        {([true, false] as const).map((b) => (
          <button key={String(b)} type="button" aria-label={`${label} ${b ? 'yes' : 'no'}`} aria-pressed={value === b} onClick={() => onChange(value === b ? null : b)} className={chip(value === b)}>{b ? 'Yes' : 'No'}</button>
        ))}
      </div>
    </div>
  );
}

export function PsychologyFields({ value, onChange, collapsible = true }: { value: Psychology; onChange: (p: Psychology) => void; collapsible?: boolean }) {
  const [open, setOpen] = useState(!collapsible || hasPsychology(value));
  const set = <K extends keyof Psychology>(k: K, v: Psychology[K]) => onChange({ ...value, [k]: v });
  const plan = effectivePlanStatus(value);
  const emotionOptions = (cur: string | null) => [...EMOTIONS, ...LEGACY_EMOTIONS, ...(cur && ![...EMOTIONS, ...LEGACY_EMOTIONS].includes(cur as any) ? [cur] : [])];
  const body = (
    <div className={cn('space-y-3', collapsible && 'border-t border-border px-3 py-3')}>
      <div className="grid grid-cols-2 gap-3">
        {(['emotion_before', 'emotion_after'] as const).map((k) => (
          <div key={k}>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor={`psy-${k}`}>{k === 'emotion_before' ? 'Emotion before' : 'Emotion after'}</label>
            <select id={`psy-${k}`} value={value[k] ?? ''} onChange={(e) => set(k, e.target.value || null)} className={selectCls}>
              <option value="">—</option>
              {emotionOptions(value[k]).map((em) => <option key={em} value={em}>{em}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Scale5 label="Confidence" value={value.confidence_score} onChange={(v) => set('confidence_score', v)} />
        <Scale5 label="Discipline" value={value.discipline_score} onChange={(v) => set('discipline_score', v)} />
        <Scale5 label="Patience" value={value.patience_score} onChange={(v) => set('patience_score', v)} />
        <Scale5 label="Stress" value={value.stress_score} onChange={(v) => set('stress_score', v)} />
        <Scale5 label="Execution" value={value.execution_score} onChange={(v) => set('execution_score', v)} />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Followed plan</p>
        <div className="flex gap-1">
          {(['yes', 'partial', 'no'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={plan === s} onClick={() => onChange(withPlanStatus(value, plan === s ? null : s))} className={cn(chip(plan === s), 'capitalize')}>{s}</button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Toggle label="Impulsive entry" value={value.impulsive_entry} onChange={(v) => set('impulsive_entry', v)} />
        <Toggle label="FOMO" value={value.fomo} onChange={(v) => set('fomo', v)} />
        <Toggle label="Revenge" value={value.revenge_trade} onChange={(v) => set('revenge_trade', v)} />
        <Toggle label="Hesitation" value={value.hesitation} onChange={(v) => set('hesitation', v)} />
        <Toggle label="Overconfidence" value={value.overconfidence} onChange={(v) => set('overconfidence', v)} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted-foreground" htmlFor="psy-note">Psychology note</label>
        <textarea id="psy-note" value={value.psychology_note ?? ''} onChange={(e) => set('psychology_note', e.target.value || null)} rows={2}
          placeholder="How did you feel and why?" className={cn(selectCls, 'resize-none')} />
      </div>
    </div>
  );
  if (!collapsible) return body;
  return (
    <div className="rounded-lg border border-border bg-muted/10">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between px-3 py-2.5 text-left">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground"><Brain className="h-4 w-4 text-primary" /> Psychology</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-300', open && 'rotate-180')} />
      </button>
      {open && body}
    </div>
  );
}
