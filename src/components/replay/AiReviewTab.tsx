import * as React from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { tierColor, tierFor, tierLabel, type ReplayScores } from "@/lib/replayScoring";

interface Props {
  sessionId: string;
  clientScores: ReplayScores;
  canRun: boolean;
}

interface AiReviewRow {
  market_context?: string | null;
  entry_quality?: string | null;
  risk_management?: string | null;
  execution_quality?: string | null;
  emotional_discipline?: string | null;
  missed_opportunities?: string | null;
  improvements?: string | null;
  generated_at?: string | null;
}

export function AiReviewTab({ sessionId, clientScores, canRun }: Props) {
  const [review, setReview] = React.useState<AiReviewRow | null>(null);
  const [scores, setScores] = React.useState<ReplayScores>(clientScores);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    setScores(clientScores);
  }, [clientScores]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: ai }, { data: sc }] = await Promise.all([
        supabase.from("replay_ai_reviews").select("*").eq("session_id", sessionId).maybeSingle(),
        supabase.from("replay_scores").select("*").eq("session_id", sessionId).maybeSingle(),
      ]);
      if (cancelled) return;
      setReview(ai ?? null);
      if (sc) {
        setScores({
          execution: sc.execution ?? clientScores.execution,
          risk: sc.risk ?? clientScores.risk,
          psychology: sc.psychology ?? clientScores.psychology,
          plan_adherence: sc.plan_adherence ?? clientScores.plan_adherence,
          final_score: sc.final_score ?? clientScores.final_score,
          tier: (sc.tier as ReplayScores["tier"]) ?? tierFor(sc.final_score ?? 0),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const run = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-replay-review", {
        body: { sessionId },
      });
      if (error) throw error;
      const r = (data as any)?.review ?? {};
      const mapped: AiReviewRow = {
        market_context: r.market_context ?? r.verdict ?? null,
        entry_quality: arr(r.what_went_well),
        risk_management: r.risk_management != null ? String(r.risk_management) : null,
        execution_quality: r.execution_score != null ? String(r.execution_score) : null,
        emotional_discipline: r.discipline_score != null ? String(r.discipline_score) : null,
        missed_opportunities: r.ai_suggestion ?? null,
        improvements: arr(r.what_to_improve),
        generated_at: new Date().toISOString(),
      };
      setReview(mapped);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("replay_ai_reviews").upsert(
          { user_id: user.id, session_id: sessionId, ...mapped },
          { onConflict: "session_id" },
        );
        const ex = clamp(r.execution_score);
        const risk = clamp(r.risk_management);
        const psy = clamp(r.discipline_score ?? r.patience);
        const plan = clamp(r.setup_quality);
        const final_score = Math.round((ex + risk + psy + plan) / 4);
        const tier = tierFor(final_score);
        await supabase.from("replay_scores").upsert(
          {
            user_id: user.id,
            session_id: sessionId,
            execution: ex,
            risk,
            psychology: psy,
            plan_adherence: plan,
            final_score,
            tier,
          },
          { onConflict: "session_id" },
        );
        setScores({ execution: ex, risk, psychology: psy, plan_adherence: plan, final_score, tier });
      }
      toast({ title: "AI review ready" });
    } catch (e: any) {
      const msg = e?.message ?? "Review failed";
      if (msg.includes("429")) toast({ title: "Rate limited", description: "Try again shortly", variant: "destructive" });
      else if (msg.includes("402")) toast({ title: "AI credits exhausted", description: "Add credits to continue", variant: "destructive" });
      else toast({ title: "Review failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className={cn("text-xs font-semibold uppercase tracking-wider", tierColor(scores.tier))}>
          {tierLabel(scores.tier)} • {scores.final_score}/100
        </div>
        <Button size="sm" onClick={run} disabled={busy || !canRun}>
          {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {review ? "Re-run" : "Generate AI Review"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ScoreCard label="Entry" value={scores.execution} />
        <ScoreCard label="Risk" value={scores.risk} />
        <ScoreCard label="Execution" value={scores.plan_adherence} />
        <ScoreCard label="Psychology" value={scores.psychology} />
      </div>

      {!review ? (
        <p className="text-xs text-muted-foreground">
          {canRun
            ? "Generate an AI review to grade market context, entry quality, risk, execution, discipline, and missed opportunities."
            : "Add at least one execution to enable the AI review."}
        </p>
      ) : (
        <div className="space-y-2">
          <Section title="Market Context" body={review.market_context} />
          <Section title="Entry Quality" body={review.entry_quality} />
          <Section title="Risk Management" body={scoreLine(review.risk_management)} />
          <Section title="Execution Quality" body={scoreLine(review.execution_quality)} />
          <Section title="Emotional Discipline" body={scoreLine(review.emotional_discipline)} />
          <Section title="Missed Opportunities" body={review.missed_opportunities} />
          <Section title="Improvements" body={review.improvements} />
        </div>
      )}
    </div>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  const t = tierFor(value);
  return (
    <div className="rounded-lg border border-border bg-card/50 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-bold tabular-nums", tierColor(t))}>{value}</div>
    </div>
  );
}

function Section({ title, body }: { title: string; body?: string | null }) {
  if (!body) return null;
  return (
    <div className="rounded-md border border-border bg-card/40 p-2.5">
      <div className="mb-0.5 text-[10px] uppercase tracking-wider text-primary">{title}</div>
      <p className="whitespace-pre-line text-xs leading-relaxed text-foreground">{body}</p>
    </div>
  );
}

function arr(v: any): string | null {
  if (!v) return null;
  if (Array.isArray(v)) return v.filter(Boolean).map((s) => `• ${s}`).join("\n");
  return String(v);
}
function scoreLine(v?: string | null) {
  if (!v) return null;
  return `Score: ${v}/100`;
}
function clamp(v: any) {
  const n = Number(v);
  if (Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
  return 50;
}
