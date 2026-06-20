import * as React from "react";
import { Bot, Sparkles, AlertTriangle, Target, Crosshair, Notebook, ListChecks, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Props {
  sessionId: string;
}

const ACTIONS = [
  { id: "analyze", label: "Analyze My Replay", icon: Sparkles },
  { id: "mistakes", label: "Find Mistakes", icon: AlertTriangle },
  { id: "rr", label: "Improve RR", icon: Target },
  { id: "entry", label: "Improve Entry", icon: Crosshair },
  { id: "journal", label: "Create Journal Entry", icon: Notebook },
  { id: "plan", label: "Generate Action Plan", icon: ListChecks },
] as const;

export function ReplayCoach({ sessionId }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<string | null>(null);

  const run = async (id: typeof ACTIONS[number]["id"]) => {
    setBusy(id);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("ai-replay-review", {
        body: { sessionId },
      });
      if (error) throw error;
      const r = (data as any)?.review ?? {};
      const text =
        id === "mistakes"
          ? toLines(r.what_to_improve)
          : id === "rr"
            ? `Targeted RR coaching:\n${toLines(r.what_to_improve)}\n\nNext focus: ${r.ai_suggestion ?? ""}`
            : id === "entry"
              ? `Entry coaching:\n${toLines(r.what_to_improve)}\n\nDiscipline: ${r.discipline_score ?? "—"}/100`
              : id === "plan"
                ? `Action plan:\n${toLines(r.what_to_improve)}\n\nFocus: ${r.ai_suggestion ?? ""}`
                : `Verdict: ${r.verdict ?? "—"}\n\nWhat went well:\n${toLines(r.what_went_well)}\n\nWhat to improve:\n${toLines(r.what_to_improve)}`;
      setResult(text);

      if (id === "journal" && user) {
        const { error: jErr } = await supabase.from("journal_entries").insert({
          user_id: user.id,
          notes: text,
          summary: "Replay reflection",
          mood: "reflective",
          entry_date: new Date().toISOString().slice(0, 10),
        });
        if (jErr) throw jErr;
        toast({ title: "Journal entry created" });
      }
    } catch (e: any) {
      const msg = e?.message ?? "Coach failed";
      if (msg.includes("429")) toast({ title: "Rate limited", variant: "destructive" });
      else if (msg.includes("402")) toast({ title: "AI credits exhausted", variant: "destructive" });
      else toast({ title: "Coach failed", description: msg, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition hover:scale-105",
        )}
        title="AI Replay Coach"
      >
        <Bot className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed bottom-24 right-6 z-40 w-[340px] max-w-[90vw] rounded-xl border border-border bg-card/95 p-3 shadow-2xl backdrop-blur">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bot className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Replay Coach</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {ACTIONS.map((a) => (
              <Button
                key={a.id}
                size="sm"
                variant="outline"
                onClick={() => run(a.id)}
                disabled={busy !== null}
                className="h-auto justify-start py-1.5 text-[11px]"
              >
                <a.icon className="h-3.5 w-3.5" />
                {busy === a.id ? "Working…" : a.label}
              </Button>
            ))}
          </div>

          {result && (
            <div className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-background/50 p-2 text-xs leading-relaxed whitespace-pre-line">
              {result}
            </div>
          )}
        </div>
      )}
    </>
  );
}

function toLines(v: any): string {
  if (!v) return "—";
  if (Array.isArray(v)) return v.filter(Boolean).map((s) => `• ${s}`).join("\n");
  return String(v);
}
