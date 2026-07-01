import * as React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Plus,
  Search,
  Calendar,
  Trash2,
  Filter,
  TrendingUp,
  Trophy,
  Target,
  AlertCircle,
  Activity,
  ListVideo,
  PanelRightOpen,
  PanelRightClose,
  ArrowLeft,

} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { Play } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import { NewSessionModal } from "@/components/replay/NewSessionModal";
import { TradingViewChart } from "@/components/replay/TradingViewChart";
import { ReplayControlBar } from "@/components/replay/ReplayControlBar";
import { ExecutionsTable, type ExecutionRow } from "@/components/replay/ExecutionsTable";
import { MarkerStrip, type ReplayMarker } from "@/components/replay/MarkerStrip";
import { NewsBadges } from "@/components/replay/NewsBadges";
import { TradeDetailsTab } from "@/components/replay/TradeDetailsTab";
import { ReplayNotesTab } from "@/components/replay/ReplayNotesTab";
import { AiReviewTab } from "@/components/replay/AiReviewTab";
import { PlaybookMatchTab } from "@/components/replay/PlaybookMatchTab";
import { ReplayCoach } from "@/components/replay/ReplayCoach";
import { scoreReplay, tierColor, tierFor, tierLabel } from "@/lib/replayScoring";
import type { ReplaySession } from "@/components/replay/types";

async function signUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
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

  const [sessions, setSessions] = React.useState<ReplaySession[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [symbolFilter, setSymbolFilter] = React.useState<string>("all");
  const [setupFilter, setSetupFilter] = React.useState<string>("all");

  // Replay player state
  const [executions, setExecutions] = React.useState<ExecutionRow[]>([]);
  const [markers, setMarkers] = React.useState<ReplayMarker[]>([]);
  const [stepIndex, setStepIndex] = React.useState(0);
  const [playing, setPlaying] = React.useState(false);
  const [speed, setSpeed] = React.useState(1);
  const [scoresVersion, setScoresVersion] = React.useState(0);
  const [panelOpen, setPanelOpen] = React.useState(false);
  const [addExecOpen, setAddExecOpen] = React.useState(false);

  // Aggregated KPIs (from sessions list)
  const allScoresRef = React.useRef<Record<string, number>>({});

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
    }
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    load();
  }, [load]);

  // Load executions, markers, scores when active session changes
  React.useEffect(() => {
    if (!active) {
      setExecutions([]);
      setMarkers([]);
      setStepIndex(0);
      setImageUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: ex }, { data: mk }] = await Promise.all([
        supabase
          .from("replay_executions")
          .select("*")
          .eq("session_id", active.id)
          .order("order_index", { ascending: true })
          .order("time", { ascending: true }),
        supabase.from("replay_markers").select("*").eq("session_id", active.id),
      ]);
      if (cancelled) return;
      setExecutions(
        (ex ?? []).map((r) => ({
          id: r.id,
          time: r.time,
          action: r.action,
          price: r.price as number | null,
          size: r.size as number | null,
          type: r.type,
          pnl: r.pnl as number | null,
        })),
      );
      setMarkers(
        (mk ?? []).map((m) => ({
          id: m.id,
          kind: m.kind as ReplayMarker["kind"],
          price: m.price as number | null,
          time: m.time,
          label: m.label,
        })),
      );
      setStepIndex(0);
    })();

    // Trade screenshot
    setImageUrl(null);
    const path = (active.trades as any)?.chart_path;
    if (path) {
      signUrl(path).then((u) => !cancelled && setImageUrl(u));
    }
    return () => {
      cancelled = true;
    };
  }, [active?.id]);

  // Load all scores for KPI (once on sessions load)
  React.useEffect(() => {
    if (!user || sessions.length === 0) return;
    (async () => {
      const { data } = await supabase
        .from("replay_scores")
        .select("session_id, final_score, tier")
        .eq("user_id", user.id);
      const map: Record<string, number> = {};
      for (const s of data ?? []) {
        if (s.final_score != null) map[s.session_id as string] = s.final_score;
      }
      allScoresRef.current = map;
      setScoresVersion((v) => v + 1);
    })();
  }, [user, sessions.length]);

  // Execution playback tick (walks through logged executions — not chart candles).
  React.useEffect(() => {
    if (!playing) return;
    if (executions.length < 2) {
      console.log("[replay] playback halted: need ≥2 executions, have", executions.length);
      setPlaying(false);
      return;
    }
    const intervalMs = Math.max(80, Math.round(1500 / speed));
    console.log("[replay] tick start", { speed, intervalMs, total: executions.length });
    const t = window.setInterval(() => {
      setStepIndex((i) => {
        if (i >= executions.length - 1) {
          console.log("[replay] playback complete");
          setPlaying(false);
          return i;
        }
        const next = i + 1;
        console.log("[replay] advance step", { from: i, to: next });
        return next;
      });
    }, intervalMs);
    return () => {
      console.log("[replay] tick cleanup");
      window.clearInterval(t);
    };
  }, [playing, speed, executions.length]);

  // Persist a new execution
  const addExecution = async (row: Omit<ExecutionRow, "id">) => {
    if (!user || !active) return;
    const order_index = executions.length;
    const { data, error } = await supabase
      .from("replay_executions")
      .insert({
        user_id: user.id,
        session_id: active.id,
        time: row.time,
        action: row.action,
        price: row.price,
        size: row.size,
        type: row.type,
        pnl: row.pnl,
        order_index,
      })
      .select("*")
      .single();
    if (error) {
      toast({ title: "Failed to add", description: error.message, variant: "destructive" });
      return;
    }
    setExecutions((arr) => [
      ...arr,
      {
        id: data.id,
        time: data.time,
        action: data.action,
        price: data.price as number | null,
        size: data.size as number | null,
        type: data.type,
        pnl: data.pnl as number | null,
      },
    ]);
    // Auto-marker
    const kindMap: Record<string, ReplayMarker["kind"]> = {
      entry: "entry",
      partial: "partial",
      exit: "exit",
      sl_hit: "sl",
      tp_hit: "tp",
    };
    const kind = kindMap[row.action] ?? "exit";
    const { data: m } = await supabase
      .from("replay_markers")
      .insert({
        user_id: user.id,
        session_id: active.id,
        kind,
        price: row.price,
        time: row.time,
        label: `${row.action} @ ${row.price ?? "—"}`,
      })
      .select("*")
      .single();
    if (m)
      setMarkers((arr) => [
        ...arr,
        { id: m.id, kind: m.kind as ReplayMarker["kind"], price: m.price as number | null, time: m.time, label: m.label },
      ]);
  };

  const deleteExecution = async (id: string) => {
    const { error } = await supabase.from("replay_executions").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setExecutions((arr) => arr.filter((e) => e.id !== id));
  };

  const deleteSession = async () => {
    if (!active) return;
    if (!window.confirm("Delete this replay session?")) return;
    const { error } = await supabase.from("replay_sessions").delete().eq("id", active.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setSessions((arr) => arr.filter((s) => s.id !== active.id));
    setActiveId(null);
  };

  // Filtered sessions
  const filtered = React.useMemo(() => {
    return sessions.filter((s) => {
      if (search) {
        const q = search.toLowerCase();
        const hay = `${s.title ?? ""} ${s.pair ?? ""} ${s.setup ?? ""} ${s.session_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (dateFrom && s.replay_date < dateFrom) return false;
      if (dateTo && s.replay_date > dateTo) return false;
      if (symbolFilter !== "all" && s.pair !== symbolFilter) return false;
      if (setupFilter !== "all" && (s.setup ?? "") !== setupFilter) return false;
      return true;
    });
  }, [sessions, search, dateFrom, dateTo, symbolFilter, setupFilter]);

  const uniqueSymbols = React.useMemo(
    () => Array.from(new Set(sessions.map((s) => s.pair).filter(Boolean))) as string[],
    [sessions],
  );
  const uniqueSetups = React.useMemo(
    () => Array.from(new Set(sessions.map((s) => s.setup).filter(Boolean))) as string[],
    [sessions],
  );

  // KPIs
  const kpis = React.useMemo(() => {
    const totalSessions = sessions.length;
    let totalExecs = 0;
    let wins = 0;
    let losses = 0;
    let rrTotal = 0;
    let rrCount = 0;
    const mistakeCount: Record<string, number> = {};
    for (const s of sessions) {
      totalExecs += (s.executions?.length ?? 0);
      if (s.outcome === "win") wins++;
      else if (s.outcome === "loss") losses++;
      if (typeof s.rr === "number") {
        rrTotal += s.rr;
        rrCount++;
      }
      for (const m of s.mistakes ?? []) mistakeCount[m] = (mistakeCount[m] ?? 0) + 1;
    }
    const scoresMap = allScoresRef.current;
    const scoreVals = Object.values(scoresMap);
    const avgScore = scoreVals.length
      ? Math.round(scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length)
      : null;
    const winRate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
    const avgRr = rrCount ? rrTotal / rrCount : null;
    const topMistake =
      Object.entries(mistakeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    return { totalSessions, totalExecs, avgScore, winRate, avgRr, topMistake };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, scoresVersion]);

  // Client-side replay score for the active session
  const clientScores = React.useMemo(() => {
    if (!active) return scoreReplay({});
    return scoreReplay({
      outcome: active.outcome,
      rr: active.rr,
      result: active.result,
      mistakes: active.mistakes,
      executions: executions.map((e) => ({ action: e.action })),
    });
  }, [active, executions]);

  const currentExec = executions[stepIndex];

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Replay Studio"
        description="Replay trades, score execution, compare to your playbooks — make every session count."
        actions={
          <>
            <Select
              value={activeId ?? "_all"}
              onValueChange={(v) => setActiveId(v === "_all" ? null : v)}
            >
              <SelectTrigger className="hidden h-9 w-[180px] md:flex">
                <SelectValue placeholder="All sessions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All sessions</SelectItem>
                {sessions.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title ?? s.pair ?? "Untitled"} •{" "}
                    {new Date(s.replay_date).toLocaleDateString()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setNewOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              New Replay Session
            </Button>
          </>
        }
      />

      {/* KPI strip + filters — hidden when a session is active so chart fills viewport */}
      {!active && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
            <KpiCard icon={ListVideo} label="Sessions" value={kpis.totalSessions} />
            <KpiCard icon={Activity} label="Replayed Trades" value={kpis.totalExecs} />
            <KpiCard
              icon={Trophy}
              label="Avg Replay Score"
              value={kpis.avgScore ?? "—"}
              accent={
                kpis.avgScore != null ? tierColor(tierFor(kpis.avgScore)) : undefined
              }
            />
            <KpiCard
              icon={Target}
              label="Win Rate"
              value={kpis.winRate != null ? `${kpis.winRate}%` : "—"}
              accent={
                kpis.winRate != null
                  ? kpis.winRate >= 50
                    ? "text-emerald-500"
                    : "text-red-500"
                  : undefined
              }
            />
            <KpiCard
              icon={TrendingUp}
              label="Avg RR"
              value={kpis.avgRr != null ? kpis.avgRr.toFixed(2) : "—"}
              accent={
                kpis.avgRr != null
                  ? kpis.avgRr >= 1
                    ? "text-emerald-500"
                    : "text-red-500"
                  : undefined
              }
            />
            <KpiCard
              icon={AlertCircle}
              label="Top Mistake"
              value={kpis.topMistake ?? "—"}
              small
            />
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sessions…"
                className="pl-8"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[140px]"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <Select value={symbolFilter} onValueChange={setSymbolFilter}>
              <SelectTrigger className="w-[130px]">
                <Filter className="h-3.5 w-3.5" />
                <SelectValue placeholder="Symbol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All symbols</SelectItem>
                {uniqueSymbols.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={setupFilter} onValueChange={setSetupFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Setup" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All setups</SelectItem>
                {uniqueSetups.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}

      {/* Body */}
      {sessions.length === 0 && !loading ? (
        <EmptyState
          icon={Play}
          title="Replay Studio"
          description="Create your first replay session to analyze a trade and grade execution."
          actions={
            <Button onClick={() => setNewOpen(true)}>
              <Plus className="h-4 w-4" />
              New Replay Session
            </Button>
          }
          className="mt-6"
        />
      ) : !active ? (
        <SessionGrid sessions={filtered} onSelect={setActiveId} scores={allScoresRef.current} />
      ) : (
        <div className="grid flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_380px]">
          <main className="min-w-0 space-y-3">
            <NewsBadges date={active.replay_date} />
            <div className="h-[520px]">
              <TradingViewChart symbol={active.pair ?? "NAS100"} interval={active.timeframe ?? "60"} />
            </div>
            <MarkerStrip markers={markers} />
            <ReplayControlBar
              total={executions.length}
              index={Math.min(stepIndex, Math.max(executions.length - 1, 0))}
              playing={playing}
              speed={speed}
              currentTime={currentExec?.time}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onRestart={() => {
                setPlaying(false);
                setStepIndex(0);
              }}
              onStep={(d) =>
                setStepIndex((i) => Math.max(0, Math.min(executions.length - 1, i + d)))
              }
              onSeek={(i) => setStepIndex(i)}
              onSpeed={setSpeed}
            />
            <ExecutionsTable
              rows={executions}
              onAdd={addExecution}
              onDelete={deleteExecution}
              onJump={(r) => setStepIndex(executions.findIndex((e) => e.id === r.id))}
            />
          </main>

          <aside className="min-w-0">
            <div className="sticky top-2 space-y-2 rounded-xl border border-border bg-card/60 p-3 backdrop-blur">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    Active session
                  </div>
                  <div className="font-semibold">
                    {active.title ?? active.pair ?? "Untitled"}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={deleteSession}
                  className="text-muted-foreground hover:text-red-500"
                  title="Delete session"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="details" className="text-xs">
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="text-xs">
                    Notes
                  </TabsTrigger>
                  <TabsTrigger value="ai" className="text-xs">
                    AI Review
                  </TabsTrigger>
                  <TabsTrigger value="playbook" className="text-xs">
                    Playbook
                  </TabsTrigger>
                </TabsList>
                <div className="mt-3 max-h-[70vh] overflow-auto pr-1">
                  <TabsContent value="details" className="mt-0">
                    <TradeDetailsTab session={active} imageUrl={imageUrl} />
                  </TabsContent>
                  <TabsContent value="notes" className="mt-0">
                    <ReplayNotesTab sessionId={active.id} />
                  </TabsContent>
                  <TabsContent value="ai" className="mt-0">
                    <AiReviewTab
                      sessionId={active.id}
                      clientScores={clientScores}
                      canRun={executions.length > 0}
                    />
                  </TabsContent>
                  <TabsContent value="playbook" className="mt-0">
                    <PlaybookMatchTab session={active} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </aside>
        </div>
      )}

      <NewSessionModal
        open={newOpen}
        onOpenChange={setNewOpen}
        onCreated={(id) => {
          setActiveId(id);
          load();
        }}
      />

      {active && <ReplayCoach sessionId={active.id} />}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
  small,
}: {
  icon: any;
  label: string;
  value: React.ReactNode;
  accent?: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3 backdrop-blur transition hover:border-primary/30">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-bold tabular-nums",
          small ? "text-sm" : "text-2xl",
          accent ?? "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function SessionGrid({
  sessions,
  onSelect,
  scores,
}: {
  sessions: ReplaySession[];
  onSelect: (id: string) => void;
  scores: Record<string, number>;
}) {
  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No sessions match your filters.
      </div>
    );
  }
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {sessions.map((s) => {
        const score = scores[s.id];
        const tier = score != null ? tierFor(score) : null;
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className="group flex flex-col gap-2 rounded-xl border border-border bg-card/60 p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {s.pair ?? "—"} • {s.timeframe ?? ""}m
              </span>
              {score != null && tier && (
                <span className={cn("text-xs font-bold tabular-nums", tierColor(tier))}>
                  {score}
                </span>
              )}
            </div>
            <div className="font-semibold group-hover:text-primary">
              {s.title ?? `${s.pair} replay`}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{new Date(s.replay_date).toLocaleDateString()}</span>
              <span className="flex items-center gap-2">
                {s.outcome && (
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.5 font-semibold uppercase",
                      s.outcome === "win"
                        ? "bg-emerald-500/15 text-emerald-500"
                        : s.outcome === "loss"
                          ? "bg-red-500/15 text-red-500"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {s.outcome}
                  </span>
                )}
                {s.rr != null && (
                  <span className="font-mono">{s.rr.toFixed(2)}R</span>
                )}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
