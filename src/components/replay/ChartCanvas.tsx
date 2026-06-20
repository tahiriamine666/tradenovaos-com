import * as React from "react";
import { Upload, ImageIcon, MousePointer, Minus, ArrowUpRight, Square, Type, Undo2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import type { Annotation } from "./types";

type Tool = "select" | "line" | "arrow" | "rect" | "text";

interface Props {
  imageUrl: string | null;
  annotations: Annotation[];
  onAnnotationsChange: (a: Annotation[]) => void;
  onUpload: (file: File) => Promise<void> | void;
  uploading?: boolean;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function ChartCanvas({
  imageUrl,
  annotations,
  onAnnotationsChange,
  onUpload,
  uploading,
}: Props) {
  const [tool, setTool] = React.useState<Tool>("select");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [drawing, setDrawing] = React.useState<Annotation | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFile = async (f?: File) => {
    if (!f) return;
    await onUpload(f);
  };

  const norm = (e: React.MouseEvent) => {
    const r = containerRef.current!.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)),
      y: Math.max(0, Math.min(1, (e.clientY - r.top) / r.height)),
    };
  };

  const onMouseDown = (e: React.MouseEvent) => {
    if (tool === "select" || !imageUrl) return;
    const p = norm(e);
    if (tool === "text") {
      const text = window.prompt("Text:")?.trim();
      if (!text) return;
      onAnnotationsChange([
        ...annotations,
        { id: uid(), type: "text", x1: p.x, y1: p.y, x2: p.x, y2: p.y, text },
      ]);
      return;
    }
    setDrawing({ id: uid(), type: tool, x1: p.x, y1: p.y, x2: p.x, y2: p.y });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drawing) return;
    const p = norm(e);
    setDrawing({ ...drawing, x2: p.x, y2: p.y });
  };
  const onMouseUp = () => {
    if (!drawing) return;
    onAnnotationsChange([...annotations, drawing]);
    setDrawing(null);
  };

  const undo = () => onAnnotationsChange(annotations.slice(0, -1));
  const clear = () => onAnnotationsChange([]);

  const tools: { id: Tool; icon: typeof Minus; label: string }[] = [
    { id: "select", icon: MousePointer, label: "Select" },
    { id: "line", icon: Minus, label: "Line" },
    { id: "arrow", icon: ArrowUpRight, label: "Arrow" },
    { id: "rect", icon: Square, label: "Rect" },
    { id: "text", icon: Type, label: "Text" },
  ];

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-border px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.label}
                disabled={!imageUrl && t.id !== "select"}
                className={cn(
                  "rounded-md p-1.5 text-muted-foreground transition-colors disabled:opacity-40",
                  tool === t.id
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
              </button>
            );
          })}
          <div className="mx-1 h-5 w-px bg-border" />
          <button
            onClick={undo}
            disabled={annotations.length === 0}
            title="Undo"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            onClick={clear}
            disabled={annotations.length === 0}
            title="Clear"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
        {imageUrl && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="h-3.5 w-3.5" />
            Replace
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <div
        ref={containerRef}
        className={cn(
          "relative flex-1 select-none bg-muted/20",
          tool !== "select" && imageUrl ? "cursor-crosshair" : "",
        )}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt="Trading chart replay screenshot with annotations"
              draggable={false}
              className="pointer-events-none absolute inset-0 h-full w-full object-contain"
            />
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
              <defs>
                <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill="hsl(var(--primary))" />
                </marker>
              </defs>
              {[...annotations, ...(drawing ? [drawing] : [])].map((a) => {
                const stroke = "hsl(var(--primary))";
                if (a.type === "line")
                  return (
                    <line
                      key={a.id}
                      x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                      stroke={stroke} strokeWidth={0.003} vectorEffect="non-scaling-stroke"
                    />
                  );
                if (a.type === "arrow")
                  return (
                    <line
                      key={a.id}
                      x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2}
                      stroke={stroke} strokeWidth={0.003} vectorEffect="non-scaling-stroke"
                      markerEnd="url(#arr)"
                    />
                  );
                if (a.type === "rect") {
                  const x = Math.min(a.x1, a.x2);
                  const y = Math.min(a.y1, a.y2);
                  const w = Math.abs(a.x2 - a.x1);
                  const h = Math.abs(a.y2 - a.y1);
                  return (
                    <rect
                      key={a.id} x={x} y={y} width={w} height={h}
                      fill="hsl(var(--primary) / 0.1)" stroke={stroke}
                      strokeWidth={0.003} vectorEffect="non-scaling-stroke"
                    />
                  );
                }
                if (a.type === "text")
                  return (
                    <text
                      key={a.id} x={a.x1} y={a.y1}
                      fill={stroke} fontSize="0.025"
                      style={{ paintOrder: "stroke", stroke: "hsl(var(--background))", strokeWidth: 0.004 }}
                    >
                      {a.text}
                    </text>
                  );
                return null;
              })}
            </svg>
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <EmptyState
              icon={ImageIcon}
              title="Upload a chart screenshot"
              description="Drop a TradingView screenshot to begin annotating and practicing execution."
              actions={
                <Button onClick={() => inputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Upload Chart"}
                </Button>
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
