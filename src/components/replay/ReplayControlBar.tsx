import * as React from "react";
import { Play, Pause, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 2, 5, 10, 20] as const;

interface Props {
  total: number;
  index: number;
  playing: boolean;
  speed: number;
  currentTime?: string | null;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onStep: (dir: -1 | 1) => void;
  onSeek: (i: number) => void;
  onSpeed: (s: number) => void;
}

export function ReplayControlBar({
  total,
  index,
  playing,
  speed,
  currentTime,
  onPlay,
  onPause,
  onRestart,
  onStep,
  onSeek,
  onSpeed,
}: Props) {
  // keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") {
        e.preventDefault();
        playing ? onPause() : onPlay();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        onStep(-1);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        onStep(1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [playing, onPlay, onPause, onStep]);

  const pct = total > 1 ? Math.round((index / (total - 1)) * 100) : 0;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-card/80 p-3 backdrop-blur">
      <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className="font-semibold">Execution playback</span>
        <span className="hidden normal-case tracking-normal md:inline">
          Steps through your logged executions. Use TradingView's Bar Replay button in the chart toolbar to rewind candles.
        </span>
      </div>
      <div className="flex items-center gap-2">

        <Button size="icon" variant="ghost" onClick={onRestart} title="Restart">
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onStep(-1)} title="Step back (←)">
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          onClick={playing ? onPause : onPlay}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
          title={playing ? "Pause (Space)" : "Play (Space)"}
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onStep(1)} title="Step forward (→)">
          <SkipForward className="h-4 w-4" />
        </Button>

        <div className="mx-2 h-6 w-px bg-border" />

        <div className="flex items-center gap-1">
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => onSpeed(s)}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium transition",
                speed === s
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs tabular-nums text-muted-foreground">
          <span>
            Step <span className="font-semibold text-foreground">{total ? index + 1 : 0}</span> / {total}
          </span>
          {currentTime && <span className="font-mono">{currentTime}</span>}
          <span className="font-semibold text-primary">{pct}%</span>
        </div>
      </div>

      <Slider
        value={[index]}
        min={0}
        max={Math.max(total - 1, 0)}
        step={1}
        onValueChange={([v]) => onSeek(v)}
        disabled={total < 2}
      />
    </div>
  );
}
