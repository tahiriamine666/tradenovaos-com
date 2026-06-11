import * as React from "react";
import { Sparkles, RefreshCw, CheckCircle2, AlertTriangle, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReviewShape {
  verdict?: string;
  discipline_score?: number;
  execution_score?: number;
  patience?: number;
  risk_management?: number;
  setup_quality?: number;
  what_went_well?: string[] | string;
  what_to_improve?: string[] | string;
  ai_suggestion?: string;
}

interface Props {
  review: ReviewShape | null | undefined;
  onRun: () => void;
  loading?: boolean;
  locked?: boolean;
  canRun: boolean;
}

function asList(v: any): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter(Boolean).map(String);
  return String(v).split(/\n|•/).map((s) => s.trim()).filter(Boolean);
}

export function AiReviewPanel({ review, onRun, loading, locked, canRun }: Props) {
  const ex = review?.execution_score ?? null;
  const di = review?.discipline_score ?? null;
  const pa = review?.patience ?? null;
  const rm = review?.risk_management ?? null;
  const scores = [ex, di, pa, rm].filter((n): n is number => typeof n === "number");
  const final = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const wellList = asList(review?.what_went_well);
  const improveList = asList(review?.what_to_improve);
  const riskMistakes = improveList.filter((s) => /risk|stop|size|loss/i.test(s));
  const nextFocus = improveList[improveList.length - 1] ?? review?.ai_suggestion ?? null;

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-sm font-semibold text-foreground">AI Replay Coach</h3>
        <Button size="sm" variant="outline" onClick={onRun} disabled={loading || !canRun}>
          {loading ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5" />
          )}
          {review && Object.keys(review).length > 0 ? "Re-run" : "Run Review"}
        </Button>
      </div>

      {!canRun && (
        <p className="text-xs text-muted-foreground">
          Record at least one execution and close the trade to run a review.
        </p>
      )}

      {final != null && (
        <div className="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-3">
          <ScoreRing value={final} />
          <div className="grid flex-1 grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <ScoreRow label="Execution" v={ex} />
            <ScoreRow label="Discipline" v={di} />
            <ScoreRow label="Patience" v={pa} />
            <ScoreRow label="Risk Mgmt" v={rm} />
          </div>
        </div>
      )}

      {review?.verdict && (
        <p className="text-sm font-medium text-foreground">{review.verdict}</p>
      )}

      {wellList.length > 0 && (
        <Section icon={CheckCircle2} tone="success" title="What went well" items={wellList} />
      )}
      {improveList.length > 0 && (
        <Section icon={AlertTriangle} tone="danger" title="What went wrong" items={improveList} />
      )}
      {riskMistakes.length > 0 && (
        <Section icon={AlertTriangle} tone="danger" title="Risk mistakes" items={riskMistakes} />
      )}
      {review?.ai_suggestion && (
        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            Missed opportunities
          </p>
          <p className="text-sm leading-relaxed text-foreground">{review.ai_suggestion}</p>
        </div>
      )}
      {nextFocus && (
        <div className="flex gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-primary">Next focus</p>
            <p className="text-sm text-foreground">{nextFocus}</p>
          </div>
        </div>
      )}

      {!review || Object.keys(review).length === 0 ? (
        <p className="text-xs text-muted-foreground">
          The coach scores your replay on Execution, Discipline, Patience, and Risk Management, then
          suggests one next focus.
        </p>
      ) : null}
    </div>
  );
}

function ScoreRing({ value }: { value: number }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  const stroke =
    value >= 75 ? "hsl(var(--success))" : value >= 50 ? "hsl(var(--primary))" : "hsl(var(--danger))";
  return (
    <div className="relative h-14 w-14">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
        <circle
          cx="30"
          cy="30"
          r={r}
          stroke={stroke}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center font-heading text-sm font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}
function ScoreRow({ label, v }: { label: string; v: number | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{v ?? "—"}</span>
    </div>
  );
}
function Section({
  icon: Icon,
  tone,
  title,
  items,
}: {
  icon: typeof CheckCircle2;
  tone: "success" | "danger";
  title: string;
  items: string[];
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", tone === "success" ? "text-success" : "text-danger")} />
        <p className="text-xs font-medium text-foreground">{title}</p>
      </div>
      <ul className="space-y-1 pl-5 text-xs leading-relaxed text-muted-foreground">
        {items.map((s, i) => (
          <li key={i} className="list-disc">
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}
