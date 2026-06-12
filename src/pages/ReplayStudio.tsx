import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { usePlan } from "@/hooks/usePlan";
import { toast } from "@/hooks/use-toast";
import { Plus, Save, Trash2, ImagePlus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { Play } from "lucide-react";
import { ProGate } from "@/components/ProGate";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

import { SessionList } from "@/components/replay/SessionList";
import { ChartCanvas } from "@/components/replay/ChartCanvas";
import { ReplayControls } from "@/components/replay/ReplayControls";
import { ExecutionTimeline } from "@/components/replay/ExecutionTimeline";
import { AiReviewPanel } from "@/components/replay/AiReviewPanel";
import { NewSessionModal } from "@/components/replay/NewSessionModal";
import type { Annotation, Execution, ReplaySession } from "@/components/replay/types";
import { COMMON_MISTAKES } from "@/components/replay/types";
import { cn } from "@/lib/utils";

async function signUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  // New replay uploads live in setup-screenshots (path starts with user.id).
  // Legacy uploads live in trade-screenshots at "replay/<user.id>/...".
  const primaryBucket = path.startsWith("replay/") ? "trade-screenshots" : "setup-screenshots";
  const fallbackBucket = primaryBucket === "setup-screenshots" ? "trade-screenshots" : "setup-screenshots";
  const tryBucket = async (b: string) => {
    const { data } = await supabase.storage.from(b).createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  };
  return (await tryBucket(primaryBucket)) ?? (await tryBucket(fallbackBucket));
}


function normalize(row: any): ReplaySession {
  return {
    ...row,
    trades: typeof row.trades === "object" && row.trades !== null ? row.trades : {},
    executions: Array.isArray(row.executions) ? row.executions : [],
    ai_review: typeof row.ai_review === "object" && row.ai_review !== null ? row.ai_review : {},
    mistakes: Array.isArray(row.mistakes) ? row.mistakes : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
  } as ReplaySession;
}

export default function ReplayStudio() {
  const { user } = useAuth();
  const plan = usePlan();
  const isMobile = useIsMobile();

  const [sessions, setSessions] = React.useState<ReplaySession[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [uploadFirst, setUploadFirst] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  const [aiBusy, setAiBusy] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const active = React.useMemo(
    () => sessions.find((s) => s.id === activeId) ?? null,
    [sessions, activeId],
  );

  // Load sessions
  const load = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("replay_sessions")
      .select("*")
      .eq("user_id", user.id)
      .order("replay_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load replays", description: error.message, variant: "destructive" });
      setSessions([]);
    } else {
      const list = (data ?? []).map(normalize);
      setSessions(list);
      if (!activeId && list.length) setActiveId(list[0].id);
    }
    setLoading(false);
  }, [user, activeId]);

  React.useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Sign chart on active change
  React.useEffect(() => {
    setImageUrl(null);
    const path = active?.trades?.chart_path;
    if (!path) return;
    let cancelled = false;
    signUrl(path).then((u) => { if (!cancelled) setImageUrl(u); });
    return () => { cancelled = true; };
  }, [active?.trades?.chart_path, active?.id]);

  // Patch helpers
  const patchActive = async (patch: Partial<ReplaySession>) => {
    if (!active) return;
    setSessions((arr) => arr.map((s) => (s.id === active.id ? { ...s, ...patch } : s)));
    const { error } = await supabase
      .from("replay_sessions")
      .update(patch as any)
      .eq("id", active.id);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
  };

  // Debounced notes
  const [notesDraft, setNotesDraft] = React.useState("");
  const [wentWellDraft, setWentWellDraft] = React.useState("");
  React.useEffect(() => {
    setNotesDraft(active?.notes ?? "");
    setWentWellDraft(active?.what_went_well ?? "");
  }, [active?.id]);
  React.useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => {
      if (notesDraft !== (active.notes ?? "")) patchActive({ notes: notesDraft });
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notesDraft]);
  React.useEffect(() => {
    if (!active) return;
    const id = window.setTimeout(() => {
      if (wentWellDraft !== (active.what_went_well ?? "")) patchActive({ what_went_well: wentWellDraft });
    }, 600);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wentWellDraft]);

  // Executions
  const addExecution = (e: Omit<Execution, "id" | "time">) => {
    if (!active) return;
    const ex: Execution = { ...e, id: crypto.randomUUID(), time: new Date().toISOString() };
    patchActive({ executions: [...active.executions, ex] });
  };
  const deleteExecution = (id: string) => {
    if (!active) return;
    patchActive({ executions: active.executions.filter((e) => e.id !== id) });
  };
  const closeExecution = (id: string, exitPrice: number) => {
    if (!active) return;
    const entry = active.executions.find((e) => e.id === id);
    if (!entry) return;
    // P&L in R = (exit - entry) / stop distance — we don't store stop here, infer from rr
    // Simpler: ask for stop dist via direction sign
    const stopDist = entry.rr && Math.abs((exitPrice - entry.price) / entry.rr);
    const pnlAbs = entry.direction === "long" ? exitPrice - entry.price : entry.price - exitPrice;
    const pnl_r = stopDist ? pnlAbs / stopDist : pnlAbs / Math.max(Math.abs(entry.price * 0.001), 0.0001);
    const closeEx: Execution = {
      id: crypto.randomUUID(),
      time: new Date().toISOString(),
      direction: entry.direction,
      action: "exit",
      price: exitPrice,
      size: entry.size,
      rr: entry.rr,
      pnl_r: Math.round(pnl_r * 100) / 100,
    };
    // mark entry pnl_r as well so timeline tone works
    const updated = active.executions.map((e) =>
      e.id === id ? { ...e, pnl_r: closeEx.pnl_r } : e,
    );
    const totalR =
      [...updated, closeEx]
        .filter((e) => e.action === "exit")
        .reduce((acc, e) => acc + (e.pnl_r ?? 0), 0);
    patchActive({
      executions: [...updated, closeEx],
      outcome: totalR > 0 ? "win" : totalR < 0 ? "loss" : "breakeven",
      rr: Math.round(totalR * 100) / 100,
    });
  };

  // Annotations
  const setAnnotations = (a: Annotation[]) => {
    if (!active) return;
    patchActive({ trades: { ...(active.trades ?? {}), annotations: a } });
  };

  // Chart upload (replace) — uses setup-screenshots with user.id as first folder
  const [uploading, setUploading] = React.useState(false);
  const uploadChart = async (file: File) => {
    if (!user || !active) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG, or WebP image", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 10MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("setup-screenshots")
        .upload(path, file, { upsert: false, contentType: file.type, cacheControl: "3600" });
      if (upErr) throw upErr;

      await patchActive({ trades: { ...(active.trades ?? {}), chart_path: path } });

      const { error: dbErr } = await supabase.from("replay_screenshots").insert({
        user_id: user.id,
        session_id: active.id,
        storage_path: path,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        annotations: [],
        order_index: 0,
      });
      if (dbErr) console.error("replay_screenshots insert error:", dbErr);

      const u = await signUrl(path);
      setImageUrl(u);
      toast({ title: "Chart uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };


  // Mistakes
  const toggleMistake = (m: string) => {
    if (!active) return;
    const has = active.mistakes.includes(m);
    patchActive({ mistakes: has ? active.mistakes.filter((x) => x !== m) : [...active.mistakes, m] });
  };

  // Delete session
  const deleteSession = async () => {
    if (!active) return;
    if (!window.confirm("Delete this replay session?")) return;
    const id = active.id;
    const { error } = await supabase.from("replay_sessions").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setSessions((arr) => arr.filter((s) => s.id !== id));
    setActiveId(null);
  };

  // AI review
  const closedExits = active?.executions.filter((e) => e.action === "exit").length ?? 0;
  const runAi = async () => {
    if (!active) return;
    setAiBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-replay-review", {
        body: { sessionId: active.id },
      });
      if (error) throw error;
      const review = (data as any)?.review ?? {};
      setSessions((arr) => arr.map((s) => (s.id === active.id ? { ...s, ai_review: review } : s)));
      toast({ title: "AI review ready" });
    } catch (e: any) {
      const msg = e?.message ?? "";
      if (msg.includes("429")) toast({ title: "Rate limited", description: "Try again in a moment.", variant: "destructive" });
      else if (msg.includes("402")) toast({ title: "AI credits exhausted", description: "Add credits to continue.", variant: "destructive" });
      else toast({ title: "Review failed", description: msg, variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  const openCreate = (focusUpload: boolean) => {
    setUploadFirst(focusUpload);
    setNewOpen(true);
  };

  // Layout
  const sidebar = (
    <SessionList
      sessions={sessions}
      activeId={activeId}
      onSelect={(id) => { setActiveId(id); setSheetOpen(false); }}
      onNew={() => openCreate(false)}
      loading={loading}
    />
  );

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Replay Studio"
        description="Practice execution on real chart screenshots — no live capital, full feedback."
        actions={
          <>
            {isMobile && sessions.length > 0 && (
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="h-4 w-4" />
                    Sessions
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-4">
                  <SheetHeader className="pb-3">
                    <SheetTitle>Replay sessions</SheetTitle>
                  </SheetHeader>
                  {sidebar}
                </SheetContent>
              </Sheet>
            )}
            <Button onClick={() => openCreate(false)} size="sm">
              <Plus className="h-4 w-4" />
              New Session
            </Button>
          </>
        }
      />

      {sessions.length === 0 && !loading ? (
        <EmptyState
          icon={Play}
          title="Practice Without Risk"
          description="Replay historical market scenarios and improve execution before risking capital."
          actions={
            <>
              <Button onClick={() => openCreate(false)}>
                <Plus className="h-4 w-4" />
                Start Replay
              </Button>
              <Button variant="outline" onClick={() => openCreate(true)}>
                <ImagePlus className="h-4 w-4" />
                Upload Chart
              </Button>
            </>
          }
          className="mt-6"
        />
      ) : (
        <div
          className={cn(
            "grid flex-1 gap-4",
            isMobile ? "grid-cols-1" : "grid-cols-[280px_minmax(0,1fr)_340px]",
          )}
        >
          {!isMobile && <aside className="min-h-0">{sidebar}</aside>}

          <main className="min-w-0 space-y-3">
            {active ? (
              <>
                <ChartCanvas
                  imageUrl={imageUrl}
                  annotations={active.trades?.annotations ?? []}
                  onAnnotationsChange={setAnnotations}
                  onUpload={uploadChart}
                  uploading={uploading}
                />
                <ExecutionTimeline
                  executions={active.executions}
                  onDelete={deleteExecution}
                  onClose={closeExecution}
                />
              </>
            ) : (
              <EmptyState
                icon={Play}
                title="Select a replay"
                description="Pick a session from the left to begin."
              />
            )}
          </main>

          <aside className="min-w-0 space-y-3">
            {active && (
              <>
                <ReplayControls onExecute={addExecution} />

                <div className="rounded-xl border border-border bg-card p-4">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                    Session notes
                  </Label>
                  <Textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Context, thesis, what you saw…"
                    rows={3}
                    className="mt-1.5 resize-none"
                  />
                  <Label className="mt-3 block text-xs uppercase tracking-wider text-muted-foreground">
                    What went well
                  </Label>
                  <Textarea
                    value={wentWellDraft}
                    onChange={(e) => setWentWellDraft(e.target.value)}
                    placeholder="Patience, entry timing, sizing…"
                    rows={2}
                    className="mt-1.5 resize-none"
                  />

                  <Label className="mt-3 block text-xs uppercase tracking-wider text-muted-foreground">
                    Mistakes
                  </Label>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {COMMON_MISTAKES.map((m) => {
                      const on = active.mistakes.includes(m);
                      return (
                        <button
                          key={m}
                          onClick={() => toggleMistake(m)}
                          className={cn(
                            "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                            on
                              ? "border-danger bg-danger/10 text-danger"
                              : "border-border text-muted-foreground hover:text-foreground",
                          )}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <ProGate
                  requiredPlan="pro"
                  feature={{
                    feature: "AI Replay Coach",
                    description:
                      "Get AI scoring on execution, discipline, patience, and risk for every replay.",
                    benefits: [
                      "Final score 0–100 across 4 categories",
                      "What went well / what went wrong",
                      "One clear next focus",
                    ],
                  }}
                  badgePosition="none"
                >
                  {({ locked, openUpgrade }) => (
                    <AiReviewPanel
                      review={active.ai_review}
                      onRun={locked ? openUpgrade : runAi}
                      loading={aiBusy}
                      locked={locked}
                      canRun={closedExits > 0}
                    />
                  )}
                </ProGate>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={deleteSession}
                  className="w-full text-muted-foreground hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete replay
                </Button>
              </>
            )}
          </aside>
        </div>
      )}

      <NewSessionModal
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(id) => { setActiveId(id); load(); }}
        uploadFirst={uploadFirst}
      />
    </div>
  );
}
