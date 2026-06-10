import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle, Brain, Calendar, Check, ChevronDown, ChevronUp,
  Pencil, Plus, RotateCcw, Search, Sparkles, Target, TrendingDown,
  TrendingUp, Trash2, X,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────
interface JournalEntry {
  id: string;
  user_id: string;
  entry_date: string;
  mood: string | null;
  energy_level: number | null;
  confidence_level: number | null;
  rule_adherence: number | null;
  stress_score: number | null;
  stress_label: string | null;
  bias: string | null;
  what_went_well: string | null;
  mistakes: string | null;
  mistakes_list: string[] | null;
  lesson: string | null;
  emotional_trigger: string | null;
  notes: string | null;
  summary: string | null;
  session: string | null;
  session_time: string | null;
  ai_review: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

interface FormState {
  entry_date: string;
  mood: string;
  energy_level: number;
  confidence_level: number;
  rule_adherence: number;
  stress_score: number;
  bias: string;
  session: string;
  session_time: string;
  what_went_well: string;
  mistakes_list: string[];
  mistakes: string;
  lesson: string;
  emotional_trigger: string;
  notes: string;
}

interface GlobalInsight {
  strengths: string[];
  weaknesses: string[];
  next_focus: string[];
  recurring_mistake?: string;
  best_state?: string;
  worst_state?: string;
  trigger?: string;
  session_pattern?: string;
}

// ── Taxonomies ────────────────────────────────────────────────────────────────
const MOODS: { value: string; label: string; tone: "success" | "danger" | "neutral" }[] = [
  { value: "focused",     label: "Focused",     tone: "success" },
  { value: "calm",        label: "Calm",        tone: "success" },
  { value: "confident",   label: "Confident",   tone: "success" },
  { value: "patient",     label: "Patient",     tone: "success" },
  { value: "disciplined", label: "Disciplined", tone: "success" },
  { value: "neutral",     label: "Neutral",     tone: "neutral" },
  { value: "excited",     label: "Excited",     tone: "neutral" },
  { value: "anxious",     label: "Anxious",     tone: "danger"  },
  { value: "frustrated",  label: "Frustrated",  tone: "danger"  },
  { value: "fearful",     label: "Fearful",     tone: "danger"  },
  { value: "tired",       label: "Tired",       tone: "danger"  },
  { value: "distracted",  label: "Distracted",  tone: "danger"  },
];

const COMMON_MISTAKES = [
  "FOMO entry", "Early entry", "Late entry", "Overtrading",
  "Revenge trading", "Moved stop loss", "No stop loss", "Oversized",
  "Ignored plan", "Chased price", "Closed too early", "Held too long",
];

const SESSIONS = ["London", "New York", "Asia", "London/NY Overlap", "Pre-Market"];
const BIASES   = ["Bullish", "Bearish", "Neutral", "Ranging"];

const EMPTY_FORM: FormState = {
  entry_date: new Date().toISOString().split("T")[0],
  mood: "focused",
  energy_level: 7,
  confidence_level: 7,
  rule_adherence: 80,
  stress_score: 3,
  bias: "Neutral",
  session: "",
  session_time: "",
  what_went_well: "",
  mistakes_list: [],
  mistakes: "",
  lesson: "",
  emotional_trigger: "",
  notes: "",
};

const moodTone = (m: string | null | undefined) =>
  MOODS.find((x) => x.value === m)?.tone ?? "neutral";

const stressLabel = (s: number) => (s <= 3 ? "Low" : s <= 7 ? "Medium" : "High");

// ── Entry modal ───────────────────────────────────────────────────────────────
function EntryModal({
  open, onOpenChange, onSaved, editEntry,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSaved: () => void;
  editEntry: JournalEntry | null;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      editEntry
        ? {
            entry_date: editEntry.entry_date,
            mood: editEntry.mood ?? "focused",
            energy_level: editEntry.energy_level ?? 7,
            confidence_level: editEntry.confidence_level ?? 7,
            rule_adherence: Number(editEntry.rule_adherence ?? 80),
            stress_score: editEntry.stress_score ?? 3,
            bias: editEntry.bias ?? "Neutral",
            session: editEntry.session ?? "",
            session_time: editEntry.session_time ?? "",
            what_went_well: editEntry.what_went_well ?? "",
            mistakes_list: editEntry.mistakes_list ?? [],
            mistakes: editEntry.mistakes ?? "",
            lesson: editEntry.lesson ?? "",
            emotional_trigger: editEntry.emotional_trigger ?? "",
            notes: editEntry.notes ?? "",
          }
        : EMPTY_FORM,
    );
  }, [open, editEntry]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const toggleMistake = (m: string) =>
    set(
      "mistakes_list",
      form.mistakes_list.includes(m)
        ? form.mistakes_list.filter((x) => x !== m)
        : [...form.mistakes_list, m],
    );

  const handleSave = async () => {
    if (!user) return;
    if (!form.lesson.trim()) {
      toast({ title: "Lesson required", description: "Write at least one lesson before saving.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        entry_date: form.entry_date,
        mood: form.mood,
        energy_level: form.energy_level,
        confidence_level: form.confidence_level,
        confidence_score: form.confidence_level,
        rule_adherence: form.rule_adherence,
        stress_score: form.stress_score,
        stress_label: stressLabel(form.stress_score),
        bias: form.bias,
        session: form.session || null,
        session_time: form.session_time || null,
        what_went_well: form.what_went_well || null,
        mistakes_list: form.mistakes_list,
        mistakes: form.mistakes || null,
        lesson: form.lesson || null,
        emotional_trigger: form.emotional_trigger || null,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      };
      const { error } = editEntry
        ? await supabase.from("journal_entries").update(payload).eq("id", editEntry.id)
        : await supabase.from("journal_entries").insert(payload);
      if (error) throw error;
      toast({ title: editEntry ? "Entry updated" : "Entry saved" });
      onSaved();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editEntry ? "Edit journal entry" : "New journal entry"}</DialogTitle>
          <DialogDescription>
            Capture your psychology, discipline and lessons. Honesty &gt; optics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Context */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Date</label>
              <Input type="date" value={form.entry_date} onChange={(e) => set("entry_date", e.target.value)} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Session</label>
              <Select value={form.session || "none"} onValueChange={(v) => set("session", v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {SESSIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Market bias</label>
              <Select value={form.bias} onValueChange={(v) => set("bias", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BIASES.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Mood */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">Dominant emotion</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {MOODS.map((m) => {
                const active = form.mood === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => set("mood", m.value)}
                    className={cn(
                      "rounded-md border px-3 py-2 text-sm transition-colors",
                      active
                        ? m.tone === "success"
                          ? "border-success bg-success/10 text-success"
                          : m.tone === "danger"
                            ? "border-danger bg-danger/10 text-danger"
                            : "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sliders */}
          <div className="grid gap-5 sm:grid-cols-2">
            {([
              { key: "confidence_level", label: "Confidence", val: form.confidence_level, min: 1, max: 10, unit: "/10" },
              { key: "energy_level",     label: "Energy",     val: form.energy_level,     min: 1, max: 10, unit: "/10" },
              { key: "rule_adherence",   label: "Rule adherence", val: form.rule_adherence, min: 0, max: 100, unit: "%" },
              { key: "stress_score",     label: `Stress (${stressLabel(form.stress_score)})`, val: form.stress_score, min: 1, max: 10, unit: "/10" },
            ] as const).map((s) => (
              <div key={s.key}>
                <div className="mb-2 flex items-baseline justify-between">
                  <label className="text-xs font-medium text-muted-foreground">{s.label}</label>
                  <span className="text-sm font-medium tabular-nums">{s.val}{s.unit}</span>
                </div>
                <Slider
                  value={[s.val]} min={s.min} max={s.max} step={1}
                  onValueChange={(v) => set(s.key, v[0] as never)}
                />
              </div>
            ))}
          </div>

          {/* Mistakes */}
          <div>
            <label className="mb-2 block text-xs font-medium text-muted-foreground">
              Mistakes made <span className="text-muted-foreground/70">({form.mistakes_list.length})</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {COMMON_MISTAKES.map((m) => {
                const active = form.mistakes_list.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMistake(m)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors text-left",
                      active
                        ? "border-danger bg-danger/10 text-danger"
                        : "border-border text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span className={cn(
                      "flex h-3.5 w-3.5 items-center justify-center rounded-sm border",
                      active ? "border-danger bg-danger text-danger-foreground" : "border-border",
                    )}>
                      {active && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
                    </span>
                    {m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trigger */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Emotional trigger <span className="text-muted-foreground/70">(what set you off?)</span>
            </label>
            <Input
              value={form.emotional_trigger}
              onChange={(e) => set("emotional_trigger", e.target.value)}
              placeholder="e.g. red opening candle after my entry"
            />
          </div>

          {/* What went well + lesson */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">What went well</label>
              <Textarea
                rows={3}
                value={form.what_went_well}
                onChange={(e) => set("what_went_well", e.target.value)}
                placeholder="Disciplined execution, patient entries..."
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                Lesson learned <span className="text-danger">*</span>
              </label>
              <Textarea
                rows={3}
                value={form.lesson}
                onChange={(e) => set("lesson", e.target.value)}
                placeholder="One concrete takeaway you'll act on next session."
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Notes</label>
            <Textarea
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any other observations..."
            />
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : editEntry ? "Update entry" : "Save entry"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Entry card ────────────────────────────────────────────────────────────────
function EntryCard({
  entry, onEdit, onDelete,
}: {
  entry: JournalEntry;
  onEdit: (e: JournalEntry) => void;
  onDelete: (e: JournalEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const tone = moodTone(entry.mood);
  const mood = MOODS.find((m) => m.value === entry.mood);
  const adherence = Number(entry.rule_adherence ?? 0);
  const mistakeCount = entry.mistakes_list?.length ?? 0;

  return (
    <div className="rounded-lg border border-border bg-card transition-colors hover:border-border/80">
      <div className="flex items-start gap-4 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {new Date(entry.entry_date + "T12:00:00").toLocaleDateString(undefined, {
                month: "short", day: "numeric", year: "numeric",
              })}
            </span>
            {entry.session && <span className="text-xs text-muted-foreground">· {entry.session}</span>}
            {mood && (
              <Badge variant="outline" className={cn(
                "text-xs font-normal",
                tone === "success" && "border-success/40 text-success",
                tone === "danger"  && "border-danger/40 text-danger",
              )}>
                {mood.label}
              </Badge>
            )}
            {mistakeCount > 0 && (
              <Badge variant="outline" className="border-danger/40 text-xs text-danger">
                {mistakeCount} mistake{mistakeCount > 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span>Confidence <span className="font-medium text-foreground tabular-nums">{entry.confidence_level ?? "—"}/10</span></span>
            <span>Rules <span className={cn(
              "font-medium tabular-nums",
              adherence >= 80 ? "text-success" : adherence < 50 ? "text-danger" : "text-foreground",
            )}>{adherence}%</span></span>
            <span>Stress <span className="font-medium text-foreground">{entry.stress_label ?? "—"}</span></span>
            {entry.bias && <span>Bias <span className="font-medium text-foreground">{entry.bias}</span></span>}
          </div>

          {entry.lesson && (
            <p className="mt-2 line-clamp-2 text-sm text-foreground/80">
              <span className="font-medium text-foreground">Lesson:</span> {entry.lesson}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onEdit(entry)} aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => onDelete(entry)} aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setOpen((v) => !v)} aria-label="Expand">
            {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {open && (
        <div className="border-t border-border px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {entry.what_went_well && (
              <Section icon={<Check className="h-3.5 w-3.5 text-success" />} title="What went well" tone="success">
                {entry.what_went_well}
              </Section>
            )}
            {mistakeCount > 0 && (
              <Section icon={<AlertCircle className="h-3.5 w-3.5 text-danger" />} title="Mistakes" tone="danger">
                <div className="flex flex-wrap gap-1.5">
                  {entry.mistakes_list!.map((m) => (
                    <span key={m} className="rounded border border-danger/30 bg-danger/10 px-2 py-0.5 text-[11px] text-danger">
                      {m}
                    </span>
                  ))}
                </div>
                {entry.mistakes && <p className="mt-2 text-sm text-foreground/80">{entry.mistakes}</p>}
              </Section>
            )}
            {entry.emotional_trigger && (
              <Section icon={<Brain className="h-3.5 w-3.5 text-primary" />} title="Emotional trigger">
                {entry.emotional_trigger}
              </Section>
            )}
            {entry.lesson && (
              <Section icon={<Target className="h-3.5 w-3.5 text-primary" />} title="Lesson" tone="primary">
                {entry.lesson}
              </Section>
            )}
            {entry.notes && (
              <Section title="Notes">
                {entry.notes}
              </Section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  icon, title, children, tone,
}: {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  tone?: "success" | "danger" | "primary";
}) {
  return (
    <div className={cn(
      "rounded-md border bg-muted/30 p-3",
      tone === "success" && "border-success/20 bg-success/5",
      tone === "danger"  && "border-danger/20 bg-danger/5",
      tone === "primary" && "border-primary/20 bg-primary/5",
      !tone && "border-border",
    )}>
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {title}
      </div>
      <div className="text-sm text-foreground/85 leading-relaxed">{children}</div>
    </div>
  );
}

// ── AI helper ─────────────────────────────────────────────────────────────────
function buildAiPrompt(entries: JournalEntry[]): string {
  const sample = entries.slice(0, 30).map((e) => ({
    date: e.entry_date,
    mood: e.mood,
    confidence: e.confidence_level,
    rules: e.rule_adherence,
    stress: e.stress_label,
    session: e.session,
    mistakes: e.mistakes_list ?? [],
    trigger: e.emotional_trigger,
    lesson: e.lesson,
  }));
  return `You are a trading psychology coach. Analyze the trader's last ${sample.length} journal entries and respond with STRICT JSON only (no markdown), matching exactly:
{
  "strengths": ["short bullet", "short bullet"],
  "weaknesses": ["short bullet", "short bullet"],
  "next_focus": ["actionable bullet", "actionable bullet"],
  "recurring_mistake": "single sentence",
  "best_state": "single sentence describing emotional state with best discipline",
  "worst_state": "single sentence describing emotional state with worst discipline",
  "trigger": "single sentence about top emotional trigger pattern",
  "session_pattern": "single sentence about which session shows best/worst behavior"
}
Rules: keep every bullet under 14 words. Be specific. No fluff.

Entries:
${JSON.stringify(sample)}`;
}

function parseAi(content: string): GlobalInsight | null {
  try {
    const cleaned = content.replace(/```json|```/g, "").trim();
    const obj = JSON.parse(cleaned);
    return {
      strengths: Array.isArray(obj.strengths) ? obj.strengths.slice(0, 5) : [],
      weaknesses: Array.isArray(obj.weaknesses) ? obj.weaknesses.slice(0, 5) : [],
      next_focus: Array.isArray(obj.next_focus) ? obj.next_focus.slice(0, 5) : [],
      recurring_mistake: obj.recurring_mistake,
      best_state: obj.best_state,
      worst_state: obj.worst_state,
      trigger: obj.trigger,
      session_pattern: obj.session_pattern,
    };
  } catch {
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function MindJournal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);

  const [search, setSearch] = useState("");
  const [moodFilter, setMoodFilter] = useState<string>("all");
  const [tab, setTab] = useState<"all" | "mistakes" | "lessons" | "triggers">("all");

  const [insight, setInsight] = useState<GlobalInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("entry_date", { ascending: false });
    if (error) toast({ title: "Could not load journal", description: error.message, variant: "destructive" });
    setEntries((data as JournalEntry[] | null) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (entry: JournalEntry) => {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    const { error } = await supabase.from("journal_entries").delete().eq("id", entry.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Entry deleted" });
    load();
  };

  const runAi = async () => {
    if (entries.length === 0) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-insights", {
        body: { prompt: buildAiPrompt(entries) },
      });
      if (error) throw error;
      const parsed = parseAi(((data as { content?: string })?.content) ?? "");
      if (!parsed) throw new Error("Could not parse AI response");
      setInsight(parsed);
      toast({ title: "Psychology review complete" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: "AI review failed", description: msg, variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  // ── Derived metrics ─────────────────────────────────────────────────────────
  const metrics = useMemo(() => {
    if (entries.length === 0) return null;
    const recent = entries.slice(0, 30);
    const avgConf = recent.reduce((s, e) => s + (e.confidence_level ?? 0), 0) / recent.length;
    const avgRule = recent.reduce((s, e) => s + Number(e.rule_adherence ?? 0), 0) / recent.length;
    const mean = avgConf;
    const variance = recent.reduce((s, e) => s + Math.pow((e.confidence_level ?? mean) - mean, 2), 0) / recent.length;
    const stddev = Math.sqrt(variance);
    const stability = Math.max(0, Math.min(100, Math.round(100 - stddev * 12)));
    return {
      total: entries.length,
      avgConf: Math.round(avgConf * 10) / 10,
      avgRule: Math.round(avgRule),
      stability,
    };
  }, [entries]);

  const sparkConf = useMemo(
    () => [...entries].slice(0, 30).reverse().map((e) => e.confidence_level ?? 0),
    [entries],
  );
  const sparkRules = useMemo(
    () => [...entries].slice(0, 30).reverse().map((e) => Number(e.rule_adherence ?? 0)),
    [entries],
  );

  const moodCounts = useMemo(() => {
    const c: Record<string, number> = {};
    entries.forEach((e) => { if (e.mood) c[e.mood] = (c[e.mood] ?? 0) + 1; });
    return MOODS.map((m) => ({ name: m.label, value: c[m.value] ?? 0, tone: m.tone }))
      .filter((m) => m.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [entries]);

  const mistakeCounts = useMemo(() => {
    const c: Record<string, number> = {};
    entries.flatMap((e) => e.mistakes_list ?? []).forEach((m) => { c[m] = (c[m] ?? 0) + 1; });
    return Object.entries(c).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [entries]);

  const sessionBehavior = useMemo(() => {
    const by: Record<string, { adherence: number; n: number; mistakes: number }> = {};
    entries.forEach((e) => {
      const s = e.session || "Unspecified";
      if (!by[s]) by[s] = { adherence: 0, n: 0, mistakes: 0 };
      by[s].adherence += Number(e.rule_adherence ?? 0);
      by[s].n += 1;
      by[s].mistakes += e.mistakes_list?.length ?? 0;
    });
    return Object.entries(by).map(([session, v]) => ({
      session,
      avgAdherence: Math.round(v.adherence / v.n),
      avgMistakes: Math.round((v.mistakes / v.n) * 10) / 10,
      entries: v.n,
    })).sort((a, b) => b.avgAdherence - a.avgAdherence);
  }, [entries]);

  const trendData = useMemo(() => [...entries].slice(0, 21).reverse().map((e) => ({
    date: new Date(e.entry_date + "T12:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    confidence: e.confidence_level ?? 0,
    rules: Number(e.rule_adherence ?? 0) / 10,
  })), [entries]);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return entries.filter((e) => {
      if (q) {
        const hay = [
          e.mood, e.notes, e.mistakes, e.lesson, e.bias,
          e.emotional_trigger, e.what_went_well, e.session,
          ...(e.mistakes_list ?? []),
        ].filter(Boolean).join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (moodFilter !== "all" && e.mood !== moodFilter) return false;
      if (tab === "mistakes" && (e.mistakes_list?.length ?? 0) === 0 && !e.mistakes?.trim()) return false;
      if (tab === "lessons"  && !e.lesson?.trim()) return false;
      if (tab === "triggers" && !e.emotional_trigger?.trim()) return false;
      return true;
    });
  }, [entries, search, moodFilter, tab]);

  const openEdit = (e: JournalEntry) => { setEditEntry(e); setModalOpen(true); };
  const openNew  = ()                 => { setEditEntry(null); setModalOpen(true); };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader
        title="Mind Journal"
        description="Track emotions, mistakes, rule adherence and lessons. The truth shows up in your patterns."
        actions={
          <Button onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" />
            New entry
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-muted/30" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Brain}
          title="No journal entries yet"
          description="Log your first session to start tracking emotions, mistakes and rule adherence. Your patterns become visible after a few entries."
          actions={
            <Button onClick={openNew}>
              <Plus className="mr-1.5 h-4 w-4" />
              Create first entry
            </Button>
          }
        />
      ) : (
        <>
          {/* Metrics */}
          {metrics && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Total entries"
                value={metrics.total}
                hint="All time"
              />
              <MetricCard
                label="Avg confidence"
                value={`${metrics.avgConf}/10`}
                hint="Last 30 entries"
                tone={metrics.avgConf >= 7 ? "success" : metrics.avgConf < 5 ? "danger" : "neutral"}
                spark={sparkConf}
              />
              <MetricCard
                label="Avg rule adherence"
                value={`${metrics.avgRule}%`}
                hint="Last 30 entries"
                tone={metrics.avgRule >= 80 ? "success" : metrics.avgRule < 50 ? "danger" : "neutral"}
                spark={sparkRules}
              />
              <MetricCard
                label="Emotional stability"
                value={`${metrics.stability}/100`}
                hint="Lower confidence swing = higher score"
                tone={metrics.stability >= 70 ? "success" : metrics.stability < 40 ? "danger" : "neutral"}
              />
            </div>
          )}

          {/* AI panel */}
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-medium text-foreground">AI psychology review</h2>
              </div>
              <Button size="sm" variant={insight ? "ghost" : "default"} onClick={runAi} disabled={aiLoading}>
                {aiLoading ? "Analyzing..." : insight ? "Regenerate" : "Analyze patterns"}
              </Button>
            </div>

            {insight ? (
              <div className="grid gap-4 p-5 lg:grid-cols-3">
                <InsightColumn icon={<TrendingUp className="h-4 w-4 text-success" />} title="Strengths" tone="success" items={insight.strengths} />
                <InsightColumn icon={<TrendingDown className="h-4 w-4 text-danger" />} title="Weaknesses" tone="danger" items={insight.weaknesses} />
                <InsightColumn icon={<Target className="h-4 w-4 text-primary" />} title="Next focus" tone="primary" items={insight.next_focus} />
                <div className="lg:col-span-3 grid gap-3 sm:grid-cols-2 border-t border-border pt-4 mt-1">
                  {insight.recurring_mistake && <InsightLine label="Recurring mistake" value={insight.recurring_mistake} tone="danger" />}
                  {insight.trigger          && <InsightLine label="Top trigger"        value={insight.trigger} />}
                  {insight.best_state       && <InsightLine label="Best state"         value={insight.best_state} tone="success" />}
                  {insight.worst_state      && <InsightLine label="Worst state"        value={insight.worst_state} tone="danger" />}
                  {insight.session_pattern  && <InsightLine label="Session pattern"    value={insight.session_pattern} />}
                </div>
              </div>
            ) : (
              <div className="px-5 py-6 text-sm text-muted-foreground">
                Run an analysis to surface strengths, weaknesses, recurring mistakes, and your next focus.
                Needs at least 3 entries for meaningful patterns.
              </div>
            )}
          </div>

          {/* Analytics */}
          {entries.length >= 2 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartCard title="Confidence trend">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mj-conf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12, borderRadius: 6 }} />
                    <Area type="monotone" dataKey="confidence" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#mj-conf)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Top mistakes">
                {mistakeCounts.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No mistakes logged yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={mistakeCounts} layout="vertical" margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
                      <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12, borderRadius: 6 }} />
                      <Bar dataKey="value" fill="hsl(var(--danger))" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Emotion frequency">
                {moodCounts.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">No moods logged yet.</p>
                ) : (
                  <div className="space-y-2 px-1 py-1">
                    {moodCounts.map((m) => {
                      const pct = Math.round((m.value / entries.length) * 100);
                      return (
                        <div key={m.name} className="flex items-center gap-3">
                          <span className="w-24 text-xs text-muted-foreground">{m.name}</span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                m.tone === "success" ? "bg-success" : m.tone === "danger" ? "bg-danger" : "bg-muted-foreground/40",
                              )}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">{m.value} · {pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Session-specific behavior">
                {sessionBehavior.length === 0 ? (
                  <p className="py-12 text-center text-sm text-muted-foreground">Tag sessions to see patterns.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="py-2 text-left font-medium">Session</th>
                        <th className="py-2 text-right font-medium">Entries</th>
                        <th className="py-2 text-right font-medium">Avg rules</th>
                        <th className="py-2 text-right font-medium">Avg mistakes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionBehavior.map((s) => (
                        <tr key={s.session} className="border-b border-border/60 last:border-0">
                          <td className="py-2 text-foreground">{s.session}</td>
                          <td className="py-2 text-right tabular-nums">{s.entries}</td>
                          <td className={cn(
                            "py-2 text-right tabular-nums font-medium",
                            s.avgAdherence >= 80 ? "text-success" : s.avgAdherence < 50 ? "text-danger" : "text-foreground",
                          )}>{s.avgAdherence}%</td>
                          <td className={cn(
                            "py-2 text-right tabular-nums",
                            s.avgMistakes >= 2 ? "text-danger" : "text-foreground",
                          )}>{s.avgMistakes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </ChartCard>
            </div>
          )}

          {/* Filters + tabs */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search lessons, mistakes, triggers..."
                  className="pl-9"
                />
              </div>
              <Select value={moodFilter} onValueChange={setMoodFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All emotions</SelectItem>
                  {MOODS.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {(search || moodFilter !== "all" || tab !== "all") && (
                <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setMoodFilter("all"); setTab("all"); }}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
                </Button>
              )}
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
              <TabsList>
                <TabsTrigger value="all">All ({entries.length})</TabsTrigger>
                <TabsTrigger value="mistakes">Mistakes</TabsTrigger>
                <TabsTrigger value="lessons">Lessons</TabsTrigger>
                <TabsTrigger value="triggers">Triggers</TabsTrigger>
              </TabsList>

              <TabsContent value={tab} className="mt-4">
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={Search}
                    title="No entries match"
                    description="Try adjusting your search or filters."
                    actions={
                      <Button variant="outline" size="sm" onClick={() => { setSearch(""); setMoodFilter("all"); setTab("all"); }}>
                        Clear filters
                      </Button>
                    }
                  />
                ) : (
                  <div className="space-y-2">
                    {filtered.map((e) => (
                      <EntryCard key={e.id} entry={e} onEdit={openEdit} onDelete={handleDelete} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </>
      )}

      <EntryModal
        open={modalOpen}
        onOpenChange={(o) => { setModalOpen(o); if (!o) setEditEntry(null); }}
        onSaved={load}
        editEntry={editEntry}
      />
    </div>
  );
}

function InsightColumn({
  icon, title, items, tone,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  tone: "success" | "danger" | "primary";
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <h3 className={cn(
          "text-sm font-medium",
          tone === "success" && "text-success",
          tone === "danger"  && "text-danger",
          tone === "primary" && "text-primary",
        )}>{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="text-sm leading-relaxed text-foreground/85">
              <span className="text-muted-foreground">·</span> {it}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InsightLine({
  label, value, tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn(
        "mt-1 text-sm leading-relaxed",
        tone === "success" && "text-success",
        tone === "danger"  && "text-danger",
        !tone && "text-foreground/85",
      )}>{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}
