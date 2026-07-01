import * as React from "react";
import { cn } from "@/lib/utils";
import { Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface ExecutionRow {
  id: string;
  time: string;
  action: string; // entry | partial | exit | sl_hit | tp_hit
  price: number | null;
  size: number | null;
  type: string | null;
  pnl: number | null;
}

interface Props {
  rows: ExecutionRow[];
  currentId?: string | null;
  addOpen?: boolean;
  onAddOpenChange?: (v: boolean) => void;
  onJump: (row: ExecutionRow) => void;
  onAdd: (row: Omit<ExecutionRow, "id">) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
}

const ACTIONS = ["entry", "partial", "exit", "sl_hit", "tp_hit"] as const;

function actionColor(a: string) {
  switch (a) {
    case "entry":
      return "text-primary";
    case "tp_hit":
      return "text-emerald-500";
    case "sl_hit":
      return "text-red-500";
    case "partial":
      return "text-amber-500";
    default:
      return "text-muted-foreground";
  }
}

export function ExecutionsTable({ rows, currentId, addOpen, onAddOpenChange, onJump, onAdd, onDelete }: Props) {
  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = addOpen ?? internalOpen;
  const setOpen = onAddOpenChange ?? setInternalOpen;
  const [action, setAction] = React.useState<string>("entry");
  const [price, setPrice] = React.useState("");
  const [size, setSize] = React.useState("");
  const [type, setType] = React.useState("market");
  const [pnl, setPnl] = React.useState("");

  const submit = async () => {
    await onAdd({
      time: new Date().toISOString(),
      action,
      price: price ? Number(price) : null,
      size: size ? Number(size) : null,
      type,
      pnl: pnl ? Number(pnl) : null,
    });
    setOpen(false);
    setPrice("");
    setSize("");
    setPnl("");
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <h3 className="text-sm font-semibold">Executions</h3>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Add execution
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="px-3 py-6 text-center text-xs text-muted-foreground">
          No executions yet — record entries, partials, and exits to build your timeline.
        </div>
      ) : (
        <div className="max-h-[260px] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card/95 backdrop-blur text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Time</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-right font-medium">Price</th>
                <th className="px-3 py-2 text-right font-medium">Size</th>
                <th className="px-3 py-2 text-left font-medium">Type</th>
                <th className="px-3 py-2 text-right font-medium">PnL</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => onJump(r)}
                  className="cursor-pointer border-t border-border/60 transition hover:bg-accent/40"
                >
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">
                    {new Date(r.time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className={cn("px-3 py-1.5 font-semibold uppercase", actionColor(r.action))}>
                    {r.action.replace("_", " ")}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {r.price?.toFixed(2) ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {r.size ?? "—"}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{r.type ?? "—"}</td>
                  <td
                    className={cn(
                      "px-3 py-1.5 text-right font-mono tabular-nums",
                      (r.pnl ?? 0) > 0 && "text-emerald-500",
                      (r.pnl ?? 0) < 0 && "text-red-500",
                    )}
                  >
                    {r.pnl != null ? (r.pnl > 0 ? "+" : "") + r.pnl.toFixed(2) : "—"}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(r.id);
                      }}
                      className="text-muted-foreground transition hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add execution</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Action</Label>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Price</Label>
                <Input
                  type="number"
                  step="0.0001"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Size</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="market">Market</SelectItem>
                    <SelectItem value="limit">Limit</SelectItem>
                    <SelectItem value="stop">Stop</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">PnL ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pnl}
                  onChange={(e) => setPnl(e.target.value)}
                  className="mt-1"
                  placeholder="optional"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit}>Add execution</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
