// ─── AIInsights.tsx ───────────────────────────────────────────────────────────
// Uses Anthropic Claude API directly to analyze real trade data from Supabase.
// Saves insights to ai_insights table for history.

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Brain, Sparkles, TrendingUp, AlertTriangle, Target,
  RefreshCw, ChevronDown, ChevronUp, Clock, Zap,
  CheckCircle2, XCircle, BarChart3,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Trade {
  id: string;
  pair: string;
  side: string | null;
  result: number;
  trade_date: string;
  setup: string | null;
  discipline_score: number | null;
  execution_score: number | null;
  rr: number | null;
  notes: string | null;
  outcome: string | null;
}

interface SavedInsight {
  id: string;
  insight_type: string;
  content: string;
  trades_analyzed: number;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

interface ParsedInsight {
  summary: string;
  strengths: string[];
  mistakes: string[];
  patterns: string[];
  improvements: string[];
  score: number;
}

// ─── Insight type config ──────────────────────────────────────────────────────
const INSIGHT_TYPES = [
  {
    id: 'daily_summary',
    label: 'Daily Summary',
    icon: Zap,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    description: 'Analyze today\'s trades',
    prompt: (trades: Trade[]) => `Analyze these trading results for today and provide a concise performance review.`,
  },
  {
    id: 'pattern_analysis',
    label: 'Pattern Analysis',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    description: 'Find recurring patterns',
    prompt: (trades: Trade[]) => `Identify recurring patterns, both positive and negative, across these trades.`,
  },
  {
    id: 'mistake_detection',
    label: 'Mistake Detection',
    icon: AlertTriangle,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    description: 'Detect trading mistakes',
    prompt: (trades: Trade[]) => `Focus specifically on identifying trading mistakes, emotional decisions, and rule violations.`,
  },
  {
    id: 'improvement',
    label: 'Improvement Plan',
    icon: Target,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    description: 'Personalized action steps',
    prompt: (trades: Trade[]) => `Based on this trading data, create a specific, actionable improvement plan for the next week.`,
  },
];

// ─── Build analysis prompt ────────────────────────────────────────────────────
function buildPrompt(trades: Trade[], insightType: string): string {
  const type = INSIGHT_TYPES.find(t => t.id === insightType);

  const wins = trades.filter(t => t.result > 0);
  const losses = trades.filter(t => t.result < 0);
  const totalPnl = trades.reduce((s, t) => s + t.result, 0);
  const winRate = trades.length > 0 ? Math.round((wins.length / trades.length) * 100) : 0;

  const tradesSummary = trades.slice(0, 20).map(t => ({
    pair: t.pair,
    side: t.side,
    result: t.result,
    date: t.trade_date,
    setup: t.setup || 'unknown',
    discipline: t.discipline_score,
    execution: t.execution_score,
    rr: t.rr,
    notes: t.notes,
  }));

  return `You are an expert trading coach analyzing a trader's performance data. ${type?.prompt(trades) ?? ''}

TRADING DATA:
- Total trades analyzed: ${trades.length}
- Win rate: ${winRate}%
- Net P&L: $${totalPnl.toFixed(2)}
- Winning trades: ${wins.length} (avg: $${wins.length > 0 ? (wins.reduce((s,t) => s+t.result,0)/wins.length).toFixed(2) : '0'})
- Losing trades: ${losses.length} (avg: $${losses.length > 0 ? Math.abs(losses.reduce((s,t) => s+t.result,0)/losses.length).toFixed(2) : '0'})

TRADE DETAILS (most recent ${Math.min(20, trades.length)}):
${JSON.stringify(tradesSummary, null, 2)}

Respond ONLY with a valid JSON object in this exact format (no markdown, no backticks):
{
  "summary": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "mistakes": ["mistake 1", "mistake 2", "mistake 3"],
  "patterns": ["pattern 1", "pattern 2", "pattern 3"],
  "improvements": ["specific action 1", "specific action 2", "specific action 3"],
  "score": 75
}

Rules:
- score is 0-100 based on overall trading performance
- Each array has 2-4 items, specific and actionable
- Base everything strictly on the data provided
- Be honest, not flattering
- Keep each item under 15 words`;
}

// ─── Insight card ─────────────────────────────────────────────────────────────
function InsightCard({ insight, onExpand }: { insight: SavedInsight; onExpand?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = INSIGHT_TYPES.find(t => t.id === insight.insight_type) ?? INSIGHT_TYPES[0];

  let parsed: ParsedInsight | null = null;
  try { parsed = JSON.parse(insight.content); } catch { }

  const date = new Date(insight.created_at).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div
            className="flex items-center justify-between p-4 cursor-pointer"
            onClick={() => setExpanded(v => !v)}
          >
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${typeConfig.bg}`}>
                <typeConfig.icon className={`h-4 w-4 ${typeConfig.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{typeConfig.label}</p>
                <p className="text-xs text-muted-foreground">{date} · {insight.trades_analyzed} trades</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {parsed && (
                <div className={`text-lg font-bold font-heading ${
                  parsed.score >= 70 ? 'text-emerald-500' :
                  parsed.score >= 50 ? 'text-amber-500' : 'text-red-500'
                }`}>
                  {parsed.score}
                </div>
              )}
              {expanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </div>
          </div>

          <AnimatePresence>
            {expanded && parsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                  {/* Summary */}
                  <div className="bg-muted/30 rounded-lg p-3">
                    <p className="text-sm text-foreground leading-relaxed">{parsed.summary}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Strengths */}
                    {parsed.strengths.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
                        </p>
                        <ul className="space-y-1.5">
                          {parsed.strengths.map((s, i) => (
                            <li key={i} className="text-xs text-foreground flex items-start gap-2">
                              <span className="text-emerald-500 mt-0.5 flex-shrink-0">•</span>
                              {s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Mistakes */}
                    {parsed.mistakes.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-600 dark:text-red-400 mb-2 flex items-center gap-1">
                          <XCircle className="h-3.5 w-3.5" /> Mistakes
                        </p>
                        <ul className="space-y-1.5">
                          {parsed.mistakes.map((m, i) => (
                            <li key={i} className="text-xs text-foreground flex items-start gap-2">
                              <span className="text-red-500 mt-0.5 flex-shrink-0">•</span>
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Patterns */}
                    {parsed.patterns.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1">
                          <BarChart3 className="h-3.5 w-3.5" /> Patterns
                        </p>
                        <ul className="space-y-1.5">
                          {parsed.patterns.map((p, i) => (
                            <li key={i} className="text-xs text-foreground flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Improvements */}
                    {parsed.improvements.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1">
                          <Target className="h-3.5 w-3.5" /> Action Items
                        </p>
                        <ul className="space-y-1.5">
                          {parsed.improvements.map((item, i) => (
                            <li key={i} className="text-xs text-foreground flex items-start gap-2">
                              <span className="text-purple-500 mt-0.5 flex-shrink-0">{i + 1}.</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Generate panel ────────────────────────────────────────────────────────────
function GeneratePanel({
  trades,
  onGenerated,
  userId,
}: {
  trades: Trade[];
  onGenerated: () => void;
  userId: string;
}) {
  const [selectedType, setSelectedType] = useState('pattern_analysis');
  const [generating, setGenerating] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const dateRange = trades.length > 0
    ? { start: [...trades].sort((a, b) => a.trade_date.localeCompare(b.trade_date))[0].trade_date,
        end: [...trades].sort((a, b) => b.trade_date.localeCompare(a.trade_date))[0].trade_date }
    : null;

  const handleGenerate = async () => {
    if (trades.length === 0) {
      setError('No trades to analyze. Add some trades first.');
      return;
    }
    setGenerating(true);
    setStreamedText('');
    setError(null);

    try {
      const prompt = buildPrompt(trades, selectedType);

      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-insights', {
        body: { prompt },
      });

      if (aiError) throw new Error(aiError.message ?? 'AI request failed');
      if (aiData?.error) throw new Error(aiData.error);
      const rawContent: string = aiData?.content ?? '';

      // Simulate streaming display
      setStreamedText('Analyzing...');
      await new Promise(r => setTimeout(r, 400));
      setStreamedText('Processing your trades...');
      await new Promise(r => setTimeout(r, 400));

      // Parse JSON
      let parsed: ParsedInsight;
      try {
        const clean = rawContent.replace(/```json|```/g, '').trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error('Could not parse AI response. Please try again.');
      }

      // Save to Supabase
      const { error: saveErr } = await supabase
        .from('ai_insights')
        .insert({
          user_id: userId,
          insight_type: selectedType,
          content: JSON.stringify(parsed),
          type: selectedType,
          trades_analyzed: trades.length,
          period_start: dateRange?.start ?? null,
          period_end: dateRange?.end ?? null,
        });

      if (saveErr) console.error('Failed to save insight:', saveErr);

      setStreamedText('');
      toast({ title: 'AI analysis complete!', description: `${trades.length} trades analyzed.` });
      onGenerated();

    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
      setStreamedText('');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="font-heading text-base">Generate AI Analysis</CardTitle>
            <CardDescription className="text-xs">
              {trades.length} trades available · {dateRange ? `${dateRange.start} → ${dateRange.end}` : 'No date range'}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* Type selector */}
        <div className="grid grid-cols-2 gap-2">
          {INSIGHT_TYPES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedType(t.id)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                selectedType === t.id
                  ? `${t.bg} border-current ${t.color}`
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              <t.icon className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium leading-tight">{t.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{t.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Generating animation */}
        <AnimatePresence>
          {generating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-muted/30 rounded-xl p-4 flex items-center gap-3">
                <div className="flex gap-1">
                  {[0, 1, 2].map(i => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 rounded-full bg-primary"
                      animate={{ y: [0, -6, 0] }}
                      transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{streamedText || 'Analyzing your trades...'}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 text-xs text-red-500 bg-red-500/10 rounded-lg p-3">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Trades preview */}
        {trades.length === 0 ? (
          <div className="text-center py-4">
            <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Add trades to enable AI analysis.</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" />
            <span>Claude will analyze all <strong className="text-foreground">{trades.length} trades</strong> — patterns, emotions, setups, and performance.</span>
          </div>
        )}

        <Button
          onClick={handleGenerate}
          disabled={generating || trades.length === 0}
          className="w-full rounded-xl gap-2"
        >
          {generating
            ? <><RefreshCw className="h-4 w-4 animate-spin" /> Analyzing...</>
            : <><Sparkles className="h-4 w-4" /> Generate {INSIGHT_TYPES.find(t => t.id === selectedType)?.label}</>
          }
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AIInsights() {
  const { user } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [insights, setInsights] = useState<SavedInsight[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(true);
  const [loadingInsights, setLoadingInsights] = useState(true);

  // Fetch trades
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('trades')
        .select('id, pair, side, result, trade_date, setup, discipline_score, execution_score, rr, notes, outcome')
        .eq('user_id', user.id)
        .order('trade_date', { ascending: false });
      setTrades((data ?? []).map((t: any) => ({ ...t, result: t.result ?? 0 })) as Trade[]);
      setLoadingTrades(false);
    };
    load();
  }, [user]);

  // Fetch saved insights
  const fetchInsights = useCallback(async () => {
    if (!user) return;
    setLoadingInsights(true);
    const { data } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setInsights((data ?? []) as SavedInsight[]);
    setLoadingInsights(false);
  }, [user]);

  useEffect(() => { fetchInsights(); }, [fetchInsights]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold font-heading text-foreground">AI Insights</h2>
        <p className="text-muted-foreground text-sm">Claude analyzes your real trade data to find patterns and improvements</p>
      </div>

      {/* Stats row */}
      {!loadingTrades && trades.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Trades Available</p>
              <p className="text-2xl font-bold font-heading text-primary">{trades.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Analyses Done</p>
              <p className="text-2xl font-bold font-heading text-primary">{insights.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Latest Score</p>
              <p className="text-2xl font-bold font-heading text-primary">
                {insights.length > 0
                  ? (() => { try { return JSON.parse(insights[0].content).score; } catch { return '—'; } })()
                  : '—'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Generate panel */}
      {loadingTrades
        ? <Skeleton className="h-64 rounded-xl" />
        : <GeneratePanel trades={trades} onGenerated={fetchInsights} userId={user?.id ?? ''} />
      }

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-foreground">Analysis History</h3>
          <Button variant="ghost" size="sm" onClick={fetchInsights} className="h-7 gap-1.5 text-xs">
            <RefreshCw className="h-3 w-3" /> Refresh
          </Button>
        </div>

        {loadingInsights ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : insights.length === 0 ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-10 text-center">
              <Brain className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No analyses yet</p>
              <p className="text-sm text-muted-foreground">Generate your first AI insight above.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {insights.map(insight => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
