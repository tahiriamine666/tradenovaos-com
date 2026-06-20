import * as React from "react";
import { Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAIRS, SESSIONS, TIMEFRAMES } from "./types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
  uploadFirst?: boolean;
}

const MARKETS = ["Forex", "Indices", "Crypto", "Stocks", "Commodities"];
const SETUPS = [
  "Liquidity Sweep + FVG",
  "Order Block",
  "Breakout + Retest",
  "Range Reversal",
  "Trend Continuation",
  "News Play",
  "ICT London Reversal",
];

export function NewSessionModal({ open, onOpenChange, onCreated, uploadFirst }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = React.useState("");
  const [pair, setPair] = React.useState("NAS100");
  const [market, setMarket] = React.useState("Indices");
  const [timeframe, setTimeframe] = React.useState("60");
  const [sessionName, setSessionName] = React.useState("");
  const [setup, setSetup] = React.useState("");
  const [direction, setDirection] = React.useState<"long" | "short">("long");
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [outcome, setOutcome] = React.useState<string>("");
  const [rr, setRr] = React.useState("");
  const [entry, setEntry] = React.useState("");
  const [sl, setSl] = React.useState("");
  const [tp, setTp] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [execFile, setExecFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setTitle("");
      setPair("NAS100");
      setMarket("Indices");
      setTimeframe("60");
      setSessionName("");
      setSetup("");
      setDirection("long");
      setDate(new Date().toISOString().slice(0, 10));
      setOutcome("");
      setRr("");
      setEntry("");
      setSl("");
      setTp("");
      setNotes("");
      setFile(null);
      setExecFile(null);
    }
  }, [open]);

  const uploadOne = async (f: File): Promise<string | null> => {
    if (!user) return null;
    const ext = f.name.split(".").pop() || "png";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from("setup-screenshots")
      .upload(path, f, { upsert: false, contentType: f.type });
    if (error) throw error;
    return path;
  };

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const chart_path = file ? await uploadOne(file) : null;
      const exec_path = execFile ? await uploadOne(execFile) : null;

      const { data, error } = await supabase
        .from("replay_sessions")
        .insert({
          user_id: user.id,
          title: title || `${pair} replay`,
          pair,
          timeframe,
          session_name: sessionName || null,
          setup: setup || null,
          bias: direction,
          replay_date: date,
          outcome: outcome || null,
          rr: rr ? Number(rr) : null,
          entry_price: entry ? Number(entry) : null,
          stop_loss: sl ? Number(sl) : null,
          take_profit: tp ? Number(tp) : null,
          notes: notes || null,
          status: "active",
          trades: { chart_path, exec_path, market, annotations: [] } as any,
        })
        .select("id")
        .single();
      if (error) throw error;

      const inserts = [chart_path, exec_path].filter(Boolean).map((p, i) => ({
        user_id: user.id,
        session_id: data.id,
        storage_path: p as string,
        order_index: i,
        annotations: [],
      }));
      if (inserts.length) {
        await supabase.from("replay_screenshots").insert(inserts);
      }

      toast({ title: "Replay session created" });
      onCreated(data.id);
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "Could not create replay", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New Replay Session</DialogTitle>
          <DialogDescription>
            Define the scenario you want to replay, score, and learn from.
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1 md:grid-cols-2">
          <div className="md:col-span-2">
            <Label className="text-xs">Session name</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. London open NAS100 liquidity sweep"
              className="mt-1"
              autoFocus={!uploadFirst}
            />
          </div>

          <div>
            <Label className="text-xs">Pair / Symbol</Label>
            <Select value={pair} onValueChange={setPair}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAIRS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Market</Label>
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MARKETS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Setup used</Label>
            <Select value={setup} onValueChange={setSetup}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select setup" />
              </SelectTrigger>
              <SelectContent>
                {SETUPS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="long">Buy / Long</SelectItem>
                <SelectItem value="short">Sell / Short</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Session</Label>
            <Select value={sessionName || "_none"} onValueChange={(v) => setSessionName(v === "_none" ? "" : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">None</SelectItem>
                {SESSIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Timeframe</Label>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEFRAMES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "D" ? "Daily" : `${t}m`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Result</Label>
            <Select value={outcome || "_none"} onValueChange={(v) => setOutcome(v === "_none" ? "" : v)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">—</SelectItem>
                <SelectItem value="win">Win</SelectItem>
                <SelectItem value="loss">Loss</SelectItem>
                <SelectItem value="breakeven">Breakeven</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">RR achieved</Label>
            <Input
              type="number"
              step="0.1"
              value={rr}
              onChange={(e) => setRr(e.target.value)}
              placeholder="e.g. 2.5"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Entry</Label>
            <Input
              type="number"
              step="0.0001"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Stop Loss</Label>
            <Input
              type="number"
              step="0.0001"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Take Profit</Label>
            <Input
              type="number"
              step="0.0001"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Context, thesis, what you want to learn from this replay…"
              rows={2}
              className="mt-1 resize-none"
            />
          </div>

          <FileSlot label="Trade screenshot" file={file} onChange={setFile} autoFocus={uploadFirst} />
          <FileSlot label="Execution screenshot (optional)" file={execFile} onChange={setExecFile} />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create replay session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FileSlot({
  label,
  file,
  onChange,
  autoFocus,
}: {
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <label className="mt-1 flex h-[60px] cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 text-xs text-muted-foreground hover:bg-muted/50">
        {file ? (
          <>
            <span className="truncate">{file.name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onChange(null);
              }}
              className="text-muted-foreground hover:text-red-500"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <Upload className="h-3.5 w-3.5" />
            Click to upload
          </>
        )}
        <input
          type="file"
          accept="image/*"
          hidden
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}
