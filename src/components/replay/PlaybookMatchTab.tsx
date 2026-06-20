import * as React from "react";
import { Check, X, BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { ReplaySession } from "./types";

interface Playbook {
  id: string;
  name: string | null;
  title: string | null;
  emoji: string | null;
  rules_array: string[] | null;
  rules: string | null;
  pairs: string[] | null;
  sessions: string[] | null;
}

function rulesOf(p: Playbook): string[] {
  if (Array.isArray(p.rules_array) && p.rules_array.length) return p.rules_array;
  if (p.rules) return p.rules.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function scoreRule(rule: string, session: ReplaySession): boolean {
  const r = rule.toLowerCase();
  const text = [
    session.notes ?? "",
    session.what_went_well ?? "",
    session.setup ?? "",
    (session.tags ?? []).join(" "),
  ]
    .join(" ")
    .toLowerCase();
  // Heuristic: keyword presence
  const words = r.split(/\W+/).filter((w) => w.length > 3);
  if (!words.length) return false;
  const hits = words.filter((w) => text.includes(w)).length;
  return hits / words.length >= 0.4;
}

export function PlaybookMatchTab({ session }: { session: ReplaySession }) {
  const { user } = useAuth();
  const [playbooks, setPlaybooks] = React.useState<Playbook[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("playbooks")
        .select("id,name,title,emoji,rules_array,rules,pairs,sessions")
        .eq("user_id", user.id);
      setPlaybooks((data ?? []) as Playbook[]);
      setLoading(false);
    })();
  }, [user]);

  const scored = React.useMemo(() => {
    return playbooks
      .map((p) => {
        const rules = rulesOf(p);
        let pairBonus = 0;
        if (session.pair && p.pairs?.length && p.pairs.includes(session.pair)) pairBonus = 5;
        if (session.session_name && p.sessions?.length && p.sessions.includes(session.session_name))
          pairBonus += 5;
        const matched = rules.filter((r) => scoreRule(r, session));
        const broken = rules.filter((r) => !matched.includes(r));
        const base = rules.length ? Math.round((matched.length / rules.length) * 100) : 0;
        const pct = Math.min(100, base + pairBonus);
        return { playbook: p, rules, matched, broken, pct };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [playbooks, session]);

  if (loading) {
    return <div className="text-xs text-muted-foreground">Loading playbooks…</div>;
  }
  if (!playbooks.length) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
        <BookOpen className="h-5 w-5" />
        Create a playbook in Playbook Lab to enable matching.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {scored.map(({ playbook, rules, matched, broken, pct }) => (
        <div key={playbook.id} className="rounded-lg border border-border bg-card/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{playbook.emoji ?? "📓"}</span>
              <span className="text-sm font-semibold">{playbook.name ?? playbook.title ?? "Playbook"}</span>
            </div>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-bold tabular-nums",
                pct >= 80
                  ? "bg-emerald-500/15 text-emerald-500"
                  : pct >= 50
                    ? "bg-amber-500/15 text-amber-500"
                    : "bg-red-500/15 text-red-500",
              )}
            >
              {pct}% match
            </span>
          </div>
          {rules.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No rules defined for this playbook.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {matched.map((r, i) => (
                <li key={`m${i}`} className="flex items-start gap-1.5 text-emerald-500">
                  <Check className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="text-foreground">{r}</span>
                </li>
              ))}
              {broken.map((r, i) => (
                <li key={`b${i}`} className="flex items-start gap-1.5 text-red-500">
                  <X className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="text-muted-foreground line-through">{r}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
