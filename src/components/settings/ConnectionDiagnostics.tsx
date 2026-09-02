// Live connection diagnostics: shows each MetaApi sync step and the exact error on failure.

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, CircleDashed, Clock } from 'lucide-react';

export type StepStatus = 'ok' | 'error' | 'pending' | 'running' | 'waiting' | 'skipped';

export interface DiagStep {
  id: string;
  label: string;
  status: StepStatus;
  detail?: string;
  error?: string;
}

export const DIAG_STEPS: { id: string; label: string }[] = [
  { id: 'db_saved', label: 'Account saved to database' },
  { id: 'metaapi_account', label: 'MetaApi account created' },
  { id: 'deployed', label: 'Account deployed' },
  { id: 'connected', label: 'Connected to broker' },
  { id: 'balance', label: 'Balance loaded' },
  { id: 'equity', label: 'Equity loaded' },
  { id: 'history', label: 'Trade history loaded' },
  { id: 'history_store', label: 'Trades stored' },

  { id: 'dashboard', label: 'Dashboard synchronized' },
];

export function initialSteps(): DiagStep[] {
  return DIAG_STEPS.map(s => ({ ...s, status: 'waiting' as StepStatus }));
}

/** Merge server-reported steps (last write wins) onto the full checklist. */
export function mergeSteps(server: DiagStep[] | undefined, done: boolean, failure?: string): DiagStep[] {
  const byId = new Map<string, DiagStep>();
  for (const s of server ?? []) byId.set(s.id, s);
  let seenIncomplete = false;
  return DIAG_STEPS.map(base => {
    const found = byId.get(base.id);
    if (found) {
      if (found.status !== 'ok') seenIncomplete = true;
      return { ...base, ...found };
    }
    if (seenIncomplete || done) {
      const step: DiagStep = { ...base, status: done ? 'error' : 'waiting' };
      if (done && failure && !seenIncomplete) step.error = failure;
      seenIncomplete = true;
      return step;
    }
    seenIncomplete = true;
    return { ...base, status: done ? 'error' : 'running' };
  });
}

function Icon({ status }: { status: StepStatus }) {
  if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === 'error') return <XCircle className="h-4 w-4 text-red-500" />;
  if (status === 'running') return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
  if (status === 'pending') return <Clock className="h-4 w-4 text-amber-500" />;
  return <CircleDashed className="h-4 w-4 text-muted-foreground/40" />;
}

export default function ConnectionDiagnostics({
  open, onOpenChange, title, steps, running, error,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  steps: DiagStep[];
  running: boolean;
  error?: string | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Live status of every step of the MetaApi connection and sync.
          </DialogDescription>
        </DialogHeader>

        <ul className="space-y-2.5 py-1">
          {steps.map(s => (
            <li key={s.id} className="flex items-start gap-2.5">
              <span className="mt-0.5"><Icon status={s.status} /></span>
              <div className="min-w-0">
                <p className={`text-sm ${s.status === 'error' ? 'text-red-500' : s.status === 'ok' ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {s.label}
                </p>
                {s.detail && <p className="text-[11px] text-muted-foreground break-words">{s.detail}</p>}
                {s.error && <p className="text-[11px] text-red-500 break-words">{s.error}</p>}
              </div>
            </li>
          ))}
        </ul>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
            <p className="text-xs font-medium text-red-500">Connection error</p>
            <p className="text-[11px] text-red-500/90 mt-0.5 break-words">{error}</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" size="sm" disabled={running} onClick={() => onOpenChange(false)}>
            {running ? 'Running…' : 'Close'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
