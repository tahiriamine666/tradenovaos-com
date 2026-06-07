import * as React from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "danger" | "primary";

interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  /** Small contextual hint shown under the value (e.g. "vs last month"). */
  hint?: React.ReactNode;
  /** Sparkline points. Pass [] or omit to hide the chart. */
  spark?: number[];
  /** Tone controls value color + sparkline color. */
  tone?: Tone;
  className?: string;
}

const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-foreground",
  success: "text-success",
  danger: "text-danger",
  primary: "text-primary",
};

const TONE_STROKE: Record<Tone, string> = {
  neutral: "hsl(var(--muted-foreground))",
  success: "hsl(var(--success))",
  danger: "hsl(var(--danger))",
  primary: "hsl(var(--primary))",
};

/**
 * KPI card used across Command Center, Trade Vault, Analytics. Number
 * first, no pastel icon boxes, single-tone sparkline only when data
 * exists. Tone is informational (green for wins, red for losses) — do
 * NOT use tone purely for decoration.
 */
export function MetricCard({ label, value, hint, spark, tone = "neutral", className }: MetricCardProps) {
  const data = (spark ?? []).map((y, i) => ({ x: i, y }));
  const stroke = TONE_STROKE[tone];

  return (
    <div
      className={cn(
        "relative rounded-xl border border-border bg-card p-5 transition-colors hover:border-border/80",
        className,
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className={cn("mt-2 font-heading text-2xl font-semibold tabular-nums sm:text-[28px]", TONE_TEXT[tone])}>
        {value}
      </div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      {data.length > 1 && (
        <div className="mt-3 h-10">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="y"
                stroke={stroke}
                strokeWidth={1.5}
                fill={`url(#spark-${label})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
