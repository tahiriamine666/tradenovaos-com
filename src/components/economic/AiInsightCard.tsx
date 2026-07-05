import { Sparkles } from "lucide-react";
import { generateInsight } from "@/lib/economic-calendar/insight";
import type { EconomicEvent } from "@/lib/economic-calendar/types";

export function AiInsightCard({ event }: { event: EconomicEvent }) {
  const bullets = generateInsight(event);
  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h4 className="font-heading text-sm font-semibold text-foreground">AI Economic Analysis</h4>
      </div>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        {bullets.map((b, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-primary" />
            <span className="leading-relaxed">{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
