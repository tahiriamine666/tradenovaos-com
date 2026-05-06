// ─── LearningHub.tsx ──────────────────────────────────────────────────────────
// Replaces static Learning Hub — each lesson opens a detail modal

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Brain, ChevronRight, X, Clock, BookOpen, Target, TrendingUp, Shield, Zap } from 'lucide-react';

// ─── Lessons data ─────────────────────────────────────────────────────────────
const LESSONS = [
  {
    id: 1,
    title: 'How to build a daily trading plan',
    category: 'Planning',
    duration: '8 min read',
    icon: Target,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    content: `A daily trading plan is the foundation of consistent performance. Before the market opens, you should define 3 things:\n\n**1. Market Bias**\nDetermine if you're bullish, bearish, or neutral for the day. Use higher timeframe analysis — weekly and daily charts — to identify the dominant trend.\n\n**2. Key Levels**\nMark support and resistance zones where price has reacted previously. These are your decision points — where you'll look for entries or exits.\n\n**3. Setups to Trade**\nChoose maximum 2 setups for the day. The more focused your list, the better your execution. Write down: the setup name, entry conditions, stop loss placement, and target.\n\n**Daily Ritual:**\n- Review yesterday's trades (5 min)\n- Check economic calendar for news\n- Mark key levels on chart\n- Write bias and setups\n- Set max daily loss rule\n\nTraders who plan consistently outperform reactive traders by 40% over time. The plan isn't about predicting markets — it's about having a framework to operate within.`,
    tags: ['Discipline', 'Pre-market'],
  },
  {
    id: 2,
    title: 'Top 7 mistakes killing your consistency',
    category: 'Psychology',
    duration: '12 min read',
    icon: Shield,
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    content: `Consistency is the holy grail of trading. Here are the 7 patterns that destroy it:\n\n**1. Revenge Trading**\nAfter a loss, taking an impulsive trade to "win it back." The emotional state is compromised — stop after 2 consecutive losses.\n\n**2. Moving Stop Losses**\nWidening stops to avoid being stopped out is the #1 cause of large losses. Your stop is your maximum risk — never move it against you.\n\n**3. FOMO Entries**\nChasing price after a move has happened. If you missed the entry, let it go. Another setup will come.\n\n**4. Overtrading**\nTaking 10 trades when your edge only exists in 3 specific setups. Quality > Quantity.\n\n**5. Ignoring the Plan**\nTaking trades that weren't on your watchlist. If it wasn't planned, it's a gamble.\n\n**6. Position Sizing Errors**\nRisking 5% on one trade after a 3% loss. Keep risk consistent — 0.5% to 1% per trade.\n\n**7. Not Reviewing Trades**\nWithout a journal and review process, you repeat the same mistakes. Review weekly, identify patterns, adjust.`,
    tags: ['Psychology', 'Risk Management'],
  },
  {
    id: 3,
    title: 'Replay drills for breakout traders',
    category: 'Practice',
    duration: '6 min read',
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    content: `Replay drills are the fastest way to improve pattern recognition without risking capital.\n\n**The 10-Day Drill**\nPick any 10 trading days from the past year. Replay them bar by bar. Mark every breakout you see. Note:\n- Was volume confirming?\n- Was there a prior consolidation?\n- Did price retest the breakout level?\n\n**The Entry Timing Drill**\nSet a rule: you can only enter on a candle close. This eliminates premature entries on wicks. Drill this 20 times until it becomes automatic.\n\n**The Exit Timing Drill**\nPractice taking partial profits at 1R and letting 50% run. This improves your average R:R without changing your win rate.\n\n**The Stop Management Drill**\nPractice moving stop to breakeven once trade reaches 1.5R. Reduces emotional pressure.\n\n**Weekly Routine:**\nSpend 30 minutes per day in replay mode, 5 days per week. After 30 days, your pattern recognition will improve dramatically.`,
    tags: ['Practice', 'Breakouts'],
  },
  {
    id: 4,
    title: 'Risk model for funded account challenges',
    category: 'Risk Management',
    duration: '10 min read',
    icon: TrendingUp,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    content: `Funded challenges have strict rules. Here's a risk model that keeps you compliant and profitable:\n\n**The 0.5% Rule**\nRisk maximum 0.5% per trade. On a $100k account, that's $500. This means even 10 consecutive losses = only 5% drawdown.\n\n**Daily Loss Limit**\nSet a personal daily limit at 1.5% — most funded challenges allow 5%, but staying at 1.5% protects you from challenge failure.\n\n**Weekly Adjustment**\nIf you're down 3% in a week, reduce position size by 50% for the remaining week. This prevents snowballing losses.\n\n**The 3-Loss Rule**\nStop trading after 3 losing trades in a day. Your psychology is compromised. No amount of analysis will override an emotional state.\n\n**Scaling In**\nDon't increase position size until you've been consistently profitable for 30 days. Prove your edge first.\n\n**Position Sizing Formula:**\nRisk Amount ÷ (Entry - Stop Loss in pips × pip value) = Lots`,
    tags: ['Funded', 'Risk Management'],
  },
  {
    id: 5,
    title: 'Reading market structure for beginners',
    category: 'Technical Analysis',
    duration: '15 min read',
    icon: BookOpen,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    content: `Market structure is the language of price. Learn to read it and everything else makes sense.\n\n**Higher Highs & Higher Lows (Bullish)**\nWhen price makes HH and HL, the trend is up. Only look for long entries — buys at support levels.\n\n**Lower Highs & Lower Lows (Bearish)**\nWhen price makes LH and LL, the trend is down. Only look for short entries — sells at resistance levels.\n\n**Break of Structure (BOS)**\nWhen a significant high is broken in an uptrend, structure is bullish. When a significant low is broken, structure turns bearish.\n\n**Change of Character (CHOCH)**\nThe first sign that structure might reverse. A small break against the trend — watch for confirmation.\n\n**Multi-Timeframe Rule:**\nAlways trade in the direction of the higher timeframe structure. If daily is bullish, only look for longs on the 15-minute chart.\n\n**Key Tip:**\nDraw your structure levels on a clean chart with no indicators. Price action alone tells you everything you need.`,
    tags: ['Technical Analysis', 'Beginner'],
  },
  {
    id: 6,
    title: 'Building emotional resilience as a trader',
    category: 'Psychology',
    duration: '9 min read',
    icon: Brain,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    content: `The biggest account killer isn't a bad strategy — it's unmanaged emotions. Here's how to build resilience:\n\n**Accept the Loss Before Entry**\nBefore entering any trade, mentally accept that this money is already gone. Your stop loss is the price of your lottery ticket.\n\n**Process Over Outcome**\nA good trade that loses is better than a bad trade that wins. Judge yourself on process adherence, not P&L.\n\n**The Emotion Log**\nIn your journal, note your emotional state before and after each session. Patterns will emerge. You'll notice you trade worse after big wins just as much as after big losses.\n\n**Physical Triggers**\nIf your heart rate increases looking at a trade, that's data — not an entry signal. Step away.\n\n**Post-Loss Routine:**\n1. Close charts\n2. Walk for 10 minutes\n3. Review the trade objectively\n4. Ask: did I follow my rules?\n5. If yes — it was a good trade regardless of outcome\n\n**Weekly Reset:**\nEvery Sunday, start fresh. Past week's P&L doesn't define this week's potential.`,
    tags: ['Psychology', 'Mindset'],
  },
];

// ─── Lesson modal ─────────────────────────────────────────────────────────────
function LessonModal({ lesson, onClose }: { lesson: typeof LESSONS[0]; onClose: () => void }) {
  const Icon = lesson.icon;

  // Parse markdown-ish content
  const renderContent = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold text-foreground mt-4 mb-1">{line.slice(2, -2)}</p>;
      }
      if (line.startsWith('- ')) {
        return <li key={i} className="text-sm text-muted-foreground ml-4">{line.slice(2)}</li>;
      }
      if (line.trim() === '') return <div key={i} className="h-1" />;
      return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{line}</p>;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="relative w-full sm:max-w-lg bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start gap-3 p-5 border-b border-border flex-shrink-0">
          <div className={`rounded-xl p-2.5 flex-shrink-0 ${lesson.bg}`}>
            <Icon className={`h-5 w-5 ${lesson.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-heading font-bold text-foreground text-base leading-snug">{lesson.title}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="outline" className="text-[11px] rounded-full">{lesson.category}</Badge>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />{lesson.duration}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-1">
          {renderContent(lesson.content)}
        </div>

        {/* Tags footer */}
        <div className="p-4 border-t border-border flex items-center gap-2 flex-wrap flex-shrink-0">
          {lesson.tags.map(t => (
            <Badge key={t} variant="outline" className="text-xs rounded-full">{t}</Badge>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LearningHub() {
  const [search, setSearch] = useState('');
  const [activeLesson, setActiveLesson] = useState<typeof LESSONS[0] | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');

  const categories = ['All', ...Array.from(new Set(LESSONS.map(l => l.category)))];

  const filtered = LESSONS.filter(l => {
    const matchSearch = l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchCat = activeCategory === 'All' || l.category === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold font-heading text-foreground">Learning Hub</h2>
        <p className="text-muted-foreground text-sm">Guides, frameworks, and drills for serious traders</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search lessons..."
          className="rounded-xl max-w-xs"
        />
        <div className="flex gap-2 flex-wrap">
          {categories.map(c => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                activeCategory === c
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/50'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map(lesson => {
          const Icon = lesson.icon;
          return (
            <Card
              key={lesson.id}
              className="border-0 shadow-sm hover:shadow-md transition-all cursor-pointer group"
              onClick={() => setActiveLesson(lesson)}
            >
              <CardContent className="py-4 flex items-center gap-4">
                <div className={`rounded-xl p-2.5 flex-shrink-0 ${lesson.bg}`}>
                  <Icon className={`h-4 w-4 ${lesson.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">{lesson.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[10px] rounded-full px-2">{lesson.category}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />{lesson.duration}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Brain className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No lessons match your search.</p>
            </CardContent>
          </Card>
        )}
      </div>

      <AnimatePresence>
        {activeLesson && (
          <LessonModal lesson={activeLesson} onClose={() => setActiveLesson(null)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
