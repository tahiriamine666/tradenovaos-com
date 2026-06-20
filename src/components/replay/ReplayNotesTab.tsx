import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, Loader2 } from "lucide-react";

interface NotesRow {
  what_i_saw: string;
  why_entered: string;
  why_exited: string;
  mistakes: string;
  lessons: string;
}

const EMPTY: NotesRow = {
  what_i_saw: "",
  why_entered: "",
  why_exited: "",
  mistakes: "",
  lessons: "",
};

export function ReplayNotesTab({ sessionId }: { sessionId: string }) {
  const { user } = useAuth();
  const [notes, setNotes] = React.useState<NotesRow>(EMPTY);
  const [loaded, setLoaded] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoaded(false);
      const { data } = await supabase
        .from("replay_notes")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setNotes({
          what_i_saw: data.what_i_saw ?? "",
          why_entered: data.why_entered ?? "",
          why_exited: data.why_exited ?? "",
          mistakes: data.mistakes ?? "",
          lessons: data.lessons ?? "",
        });
        setSavedAt(data.last_saved_at ? new Date(data.last_saved_at) : null);
      } else {
        setNotes(EMPTY);
        setSavedAt(null);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // Debounced auto-save
  const timerRef = React.useRef<number | null>(null);
  React.useEffect(() => {
    if (!loaded || !user) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      setSaving(true);
      const now = new Date();
      const { error } = await supabase
        .from("replay_notes")
        .upsert(
          {
            user_id: user.id,
            session_id: sessionId,
            ...notes,
            last_saved_at: now.toISOString(),
          },
          { onConflict: "session_id" },
        );
      setSaving(false);
      if (!error) setSavedAt(now);
    }, 800);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, loaded]);

  const fields: { key: keyof NotesRow; label: string; placeholder: string }[] = [
    { key: "what_i_saw", label: "What I saw", placeholder: "Market structure, liquidity, key levels…" },
    { key: "why_entered", label: "Why I entered", placeholder: "Confluences and trigger…" },
    { key: "why_exited", label: "Why I exited", placeholder: "Target, structure shift, time-based…" },
    { key: "mistakes", label: "Mistakes", placeholder: "What went wrong and why…" },
    { key: "lessons", label: "Lessons", placeholder: "Concrete takeaways for next time…" },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground">
        {saving ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" /> Saving…
          </>
        ) : savedAt ? (
          <>
            <Check className="h-3 w-3 text-emerald-500" />
            Saved {savedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </>
        ) : (
          "Auto-save"
        )}
      </div>
      {fields.map((f) => (
        <div key={f.key}>
          <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {f.label}
          </Label>
          <Textarea
            value={notes[f.key]}
            onChange={(e) => setNotes((n) => ({ ...n, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            rows={3}
            className="mt-1 resize-none"
          />
        </div>
      ))}
    </div>
  );
}
