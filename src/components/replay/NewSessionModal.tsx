import * as React from "react";
import { Upload } from "lucide-react";
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
  /** If true, focus on the upload step right away. */
  uploadFirst?: boolean;
}

export function NewSessionModal({ open, onOpenChange, onCreated, uploadFirst }: Props) {
  const { user } = useAuth();
  const [title, setTitle] = React.useState("");
  const [pair, setPair] = React.useState("NAS100");
  const [timeframe, setTimeframe] = React.useState("60");
  const [sessionName, setSessionName] = React.useState("");
  const [setup, setSetup] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setTitle(""); setPair("NAS100"); setTimeframe("60"); setSessionName(""); setSetup(""); setFile(null);
    }
  }, [open]);

  const submit = async () => {
    if (!user) return;
    setBusy(true);
    try {
      let chart_path: string | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "png";
        const path = `replay/${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("trade-screenshots")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (upErr) throw upErr;
        chart_path = path;
      }

      const { data, error } = await supabase
        .from("replay_sessions")
        .insert({
          user_id: user.id,
          title: title || `${pair} replay`,
          pair,
          timeframe,
          session_name: sessionName || null,
          setup: setup || null,
          status: "active",
          trades: { chart_path, annotations: [] } as any,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast({ title: "Replay created" });
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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New replay session</DialogTitle>
          <DialogDescription>
            Upload a chart screenshot and define the scenario you want to practice.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <Label className="text-xs">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. London open NAS100 sweep"
              className="mt-1"
              autoFocus={!uploadFirst}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Pair</Label>
              <Select value={pair} onValueChange={setPair}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAIRS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Timeframe</Label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIMEFRAMES.map((t) => <SelectItem key={t} value={t}>{t === "D" ? "Daily" : `${t}m`}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Session</Label>
              <Select value={sessionName || "_none"} onValueChange={(v) => setSessionName(v === "_none" ? "" : v)}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {SESSIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Setup</Label>
            <Input
              value={setup}
              onChange={(e) => setSetup(e.target.value)}
              placeholder="e.g. liquidity sweep + FVG"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="text-xs">Chart screenshot</Label>
            <label className="mt-1 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-sm text-muted-foreground hover:bg-muted/50">
              <Upload className="h-4 w-4" />
              {file ? file.name : "Click to upload (optional)"}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                autoFocus={uploadFirst}
              />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Creating…" : "Create replay"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
