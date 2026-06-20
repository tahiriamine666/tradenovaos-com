import * as React from "react";
import { ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import type { ReplaySession } from "./types";

interface Props {
  session: ReplaySession;
  imageUrl: string | null;
}

function Row({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-1.5 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono font-medium",
          tone === "good" && "text-emerald-500",
          tone === "bad" && "text-red-500",
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function TradeDetailsTab({ session, imageUrl }: Props) {
  const [zoom, setZoom] = React.useState(false);
  const outcome = session.outcome;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border bg-card/50 p-3">
        <Row label="Pair" value={session.pair ?? "—"} />
        <Row
          label="Date"
          value={
            session.replay_date
              ? new Date(session.replay_date).toLocaleDateString()
              : "—"
          }
        />
        <Row label="Session" value={session.session_name ?? "—"} />
        <Row label="Setup" value={session.setup ?? "—"} />
        <Row label="Timeframe" value={session.timeframe ?? "—"} />
        <Row
          label="Outcome"
          value={(outcome ?? "—").toUpperCase()}
          tone={outcome === "win" ? "good" : outcome === "loss" ? "bad" : undefined}
        />
        <Row
          label="R:R"
          value={session.rr != null ? session.rr.toFixed(2) : "—"}
          tone={(session.rr ?? 0) > 0 ? "good" : (session.rr ?? 0) < 0 ? "bad" : undefined}
        />
        <Row label="Entry" value={session.entry_price?.toFixed(2) ?? "—"} />
        <Row label="Stop Loss" value={session.stop_loss?.toFixed(2) ?? "—"} />
        <Row label="Take Profit" value={session.take_profit?.toFixed(2) ?? "—"} />
      </div>

      <div className="rounded-lg border border-border bg-card/50 p-2">
        <div className="mb-2 flex items-center justify-between px-1">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Trade Screenshot
          </span>
          {imageUrl && (
            <button
              onClick={() => setZoom(true)}
              className="flex items-center gap-1 text-[10px] text-primary hover:underline"
            >
              <ZoomIn className="h-3 w-3" /> Zoom
            </button>
          )}
        </div>
        {imageUrl ? (
          <button
            onClick={() => setZoom(true)}
            className="block w-full overflow-hidden rounded-md"
          >
            <img
              src={imageUrl}
              alt={`${session.pair ?? "Trade"} screenshot`}
              className="h-auto w-full object-contain"
            />
          </button>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
            No screenshot uploaded
          </div>
        )}
      </div>

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-5xl border-none bg-transparent p-0 shadow-none">
          {imageUrl && (
            <img src={imageUrl} alt="Trade screenshot zoomed" className="h-auto w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
