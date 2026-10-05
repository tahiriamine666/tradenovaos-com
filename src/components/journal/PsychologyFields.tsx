import { useState } from 'react';
import { Brain, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export const EMOTIONS = ['Calm', 'Focused', 'Confident', 'Anxious', 'FOMO', 'Frustrated', 'Revenge', 'Tired', 'Distracted'] as const;

export type Psychology = {
  emotion_before: string | null;
  emotion_after: string | null;
  confidence_score: number | null;
  psych_discipline_score: number | null;
  stress_score: number | null;
  followed_plan: boolean | null;
  impulsive_entry: boolean | null;
  psychology_note: string | null;
};

export const EMPTY_PSYCHOLOGY: Psychology = {
  emotion_before: null, emotion_after: null, confidence_score: null, psych_discipline_score: null,
  stress_score: null, followed_plan: null, impulsive_entry: null, psychology_note: null,
};

export function psychologyFrom(row: any): Psychology {
  if (!row) return EMPTY_PSYCHOLOGY;
  return Object.fromEntries(Object.keys(EMPTY_PSYCHOLOGY).map((k) => [k, row[k] ?? null])) as Psychology;
}

export function hasPsychology(p: Partial<Psychology> | null | undefined) {
  return !!p && Object.keys(EMPTY_PSYCHOLOGY).some((k) => (p as any)[k] !== null && (p as any)[k] !== undefined && (p as any)[k] !== '');
}

const selectCls = 'w-full text-sm rounded-lg border border-border bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30';

function Scale({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-pressed={value === n} onClick={() => onChange(value === n ? null : n)}
            className={cn('h-8 flex-1 rounded-md border text-xs font-semibold transition-colors',
              value === n ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}>{n}</button>
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
          <button key={String(b)} type="button" aria-pressed={value === b} onClick={() => onChange(value === b ? null : b)}
            className={cn('h-8 flex-1 rounded-md border text-xs font-semibold transition-colors',
              value === b ? 'border-primary bg-primary/20 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}>{b ? 'Yes' : 'No'}</button>
        ))}
      </div>
    </div>
  );
}

export function PsychologyFields({ value, onChange }: { value: Psychology; onChange: (p: Psychology) => void }) {
  const [open, setOpen] = useState(hasPsychology(value));
  const set = <K extends keyof Psychology>(k: K, v: Psychology[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="rounded-lg border border-border bg-muted/10">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground"><Brain className="h-4 w-4 text-primary" /> Psychology</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform duration-300', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <div className="grid grid-cols-2 gap-3">
            {(['emotion_before', 'emotion_after'] as const).map((k) => (
              <div key={k}>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">{k === 'emotion_before' ? 'Emotion before' : 'Emotion after'}</label>
                <select value={value[k] ?? ''} onChange={(e) => set(k, e.target.value || null)} className={selectCls}>
                  <option value="">—</option>
                  {EMOTIONS.map((em) => <option key={em} value={em}>{em}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Scale label="Confidence" value={value.confidence_score} onChange={(v) => set('confidence_score', v)} />
            <Scale label="Discipline" value={value.psych_discipline_score} onChange={(v) => set('psych_discipline_score', v)} />
            <Scale label="Stress" value={value.stress_score} onChange={(v) => set('stress_score', v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Toggle label="Followed plan" value={value.followed_plan} onChange={(v) => set('followed_plan', v)} />
            <Toggle label="Impulsive entry" value={value.impulsive_entry} onChange={(v) => set('impulsive_entry', v)} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Psychology note</label>
            <textarea value={value.psychology_note ?? ''} onChange={(e) => set('psychology_note', e.target.value || null)} rows={2}
              placeholder="How did you feel and why?" className={cn(selectCls, 'resize-none')} />
          </div>
        </div>
      )}
    </div>
  );
}
