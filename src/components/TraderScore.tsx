import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Target, Shield, Zap, BarChart2, Info } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Trade {
  result: number;
  discipline_score: number | null;
  execution_score: number | null;
  rr: number | null;
  trade_date: string;
  outcome: string | null;
}

interface ScoreBreakdown {
  winRate: number;       // 0-100 — % of winning trades
  rr: number;            // 0-100 — based on avg R:R or proxy
  discipline: number;    // 0-100 — avg discipline_score*10 or derived
  execution: number;     // 0-100 — avg execution_score*10 or derived
  consistency: number;   // 0-100 — based on stddev of results
  overall: number;       // weighted average
}

// ─── Score calculation ────────────────────────────────────────────────────────
function calculateScores(trades: Trade[]): ScoreBreakdown | null {
  if (trades.length === 0) return null;

  const total = trades.length;
  const wins = trades.filter(t => t.result > 0).length;
  const losses = trades.filter(t => t.result < 0).length;

  // 1. Win Rate score (0–100)
  const winPct = (wins / total) * 100;
  // Scale: 30% wr = 30, 50% = 60, 60% = 75, 70%+ = 90+
  const winRateScore = Math.min(100, Math.round(winPct * 1.3));

  // 2. R:R score
  const tradesWithRR = trades.filter(t => t.rr != null && t.rr > 0);
  let rrScore: number;
  if (tradesWithRR.length > 0) {
    const avgRR = tradesWithRR.reduce((s, t) => s + (t.rr ?? 0), 0) / tradesWithRR.length;
    // Scale: 1:1 = 40, 1:2 = 70, 1:3 = 90, 1:4+ = 100
    rrScore = Math.min(100, Math.round(avgRR * 30));
  } else {
    // Proxy from win rate + avg win/loss ratio
    const avgWin = wins > 0
      ? trades.filter(t => t.result > 0).reduce((s, t) => s + t.result, 0) / wins
      : 0;
    const avgLoss = losses > 0
      ? Math.abs(trades.filter(t => t.result < 0).reduce((s, t) => s + t.result, 0) / losses)
      : 1;
    const impliedRR = avgLoss > 0 ? avgWin / avgLoss : 1;
    rrScore = Math.min(100, Math.round(impliedRR * 30));
  }

  // 3. Discipline score
  const tradesWithDiscipline = trades.filter(t => t.discipline_score != null);
  let disciplineScore: number;
  if (tradesWithDiscipline.length > 0) {
    const avg = tradesWithDiscipline.reduce((s, t) => s + (t.discipline_score ?? 0), 0) / tradesWithDiscipline.length;
    disciplineScore = Math.round(avg * 10);
  } else {
    // Proxy: fewer losses relative to trades = better discipline
    const lossRate = losses / total;
    disciplineScore = Math.round(Math.max(40, (1 - lossRate * 1.5) * 100));
  }

  // 4. Execution score
  const tradesWithExecution = trades.filter(t => t.execution_score != null);
  let executionScore: number;
  if (tradesWithExecution.length > 0) {
    const avg = tradesWithExecution.reduce((s, t) => s + (t.execution_score ?? 0), 0) / tradesWithExecution.length;
    executionScore = Math.round(avg * 10);
  } else {
    // Proxy: win rate + RR combined
    executionScore = Math.round((winRateScore + rrScore) / 2);
  }

  // 5. Consistency score — based on result standard deviation
  const results = trades.map(t => t.result);
  const mean = results.reduce((s, v) => s + v, 0) / results.length;
  const variance = results.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / results.length;
  const stddev = Math.sqrt(variance);
  const cv = mean !== 0 ? Math.abs(stddev / mean) : 1; // coefficient of variation
  // Lower CV = more consistent. CV < 0.5 = great, CV > 2 = poor
  const consistencyScore = Math.min(100, Math.max(10, Math.round(100 - cv * 25)));

  // 6. Overall — weighted
  const overall = Math.round(
    winRateScore * 0.25 +
    rrScore * 0.20 +
    disciplineScore * 0.20 +
    executionScore * 0.20 +
    consistencyScore * 0.15
  );

  return {
    winRate: Math.min(100, Math.max(0, winRateScore)),
    rr: Math.min(100, Math.max(0, rrScore)),
    discipline: Math.min(100, Math.max(0, disciplineScore)),
    execution: Math.min(100, Math.max(0, executionScore)),
    consistency: Math.min(100, Math.max(0, consistencyScore)),
    overall: Math.min(100, Math.max(0, overall)),
  };
}

// ─── Score color ──────────────────────────────────────────────────────────────
function scoreColor(val: number): string {
  if (val >= 75) return 'text-violet-500';
  if (val >= 50) return 'text-primary';
  if (val >= 30) return 'text-amber-500';
  return 'text-red-500';
}

function scoreLabel(val: number): string {
  if (val >= 80) return 'Excellent';
  if (val >= 65) return 'Good';
  if (val >= 50) return 'Average';
  if (val >= 35) return 'Needs Work';
  return 'Poor';
}

// ─── Radial progress ─────────────────────────────────────────────────────────
function RadialScore({ value, size = 80 }: { value: number; size?: number }) {
  const radius = (size - 12) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (value / 100) * circumference;

  const color = value >= 75 ? '#7c3aed' : value >= 50 ? '#a78bfa' : value >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="currentColor" strokeWidth={8}
        className="text-muted/20"
      />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text
        x={size / 2} y={size / 2 + 1}
        textAnchor="middle" dominantBaseline="middle"
        fontSize={size * 0.22} fontWeight="700"
        fill={color}
      >
        {value}
      </text>
    </svg>
  );
}

// ─── Score card ───────────────────────────────────────────────────────────────
function ScoreCard({ label, value, icon: Icon, hint }: {
  label: string; value: number; icon: React.ElementType; hint: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30 text-center"
    >
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <RadialScore value={value} size={72} />
      <span className={`text-xs font-semibold ${scoreColor(value)}`}>
        {scoreLabel(value)}
      </span>
      <span className="text-[10px] text-muted-foreground leading-tight">{hint}</span>
    </motion.div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
export default function TraderScore() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from('trades')
        .select('result, discipline_score, execution_score, rr, trade_date, outcome')
        .eq('user_id', user.id);

      if (err) {
        setError('Could not load trader score.');
        console.error(err);
      } else {
        setTrades(data ?? []);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const scores = useMemo(() => calculateScores(trades), [trades]);

  // ── Loading ──
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Trader Score</CardTitle>
          <CardDescription>Overall performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4">
            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-red-500">{error}</p>
        </CardContent>
      </Card>
    );
  }

  // ── No data ──
  if (!scores) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading">Trader Score</CardTitle>
          <CardDescription>Overall performance metrics</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <BarChart2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Add trades to calculate your score.</p>
        </CardContent>
      </Card>
    );
  }

  const scoreItems = [
    {
      label: 'Win %',
      value: scores.winRate,
      icon: Target,
      hint: `Based on ${trades.filter(t => t.result > 0).length}/${trades.length} wins`,
    },
    {
      label: 'R:R',
      value: scores.rr,
      icon: TrendingUp,
      hint: trades.some(t => t.rr) ? 'From logged R:R' : 'Estimated from results',
    },
    {
      label: 'Discipline',
      value: scores.discipline,
      icon: Shield,
      hint: trades.some(t => t.discipline_score) ? 'From discipline scores' : 'Estimated from patterns',
    },
    {
      label: 'Execution',
      value: scores.execution,
      icon: Zap,
      hint: trades.some(t => t.execution_score) ? 'From execution scores' : 'Estimated from data',
    },
    {
      label: 'Consistency',
      value: scores.consistency,
      icon: BarChart2,
      hint: 'Based on result stability',
    },
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="font-heading">Trader Score</CardTitle>
            <CardDescription>Calculated from your {trades.length} trades</CardDescription>
          </div>
          {/* Overall score */}
          <div className="text-center">
            <RadialScore value={scores.overall} size={64} />
            <p className="text-xs text-muted-foreground mt-1">Overall</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {scoreItems.map(item => (
            <ScoreCard key={item.label} {...item} />
          ))}
        </div>

        {/* Disclaimer if using estimated scores */}
        {!trades.some(t => t.discipline_score || t.execution_score || t.rr) && (
          <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-muted/30">
            <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              Some scores are estimated. Add <strong>R:R</strong>, <strong>discipline</strong>, and <strong>execution</strong> fields to your trades for precise scoring.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
