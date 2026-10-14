import React from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Target } from 'lucide-react';
import MarketingNavbar from '@/components/MarketingNavbar';
import SeoHead from '@/components/SeoHead';
import { Button } from '@/components/ui/button';

const PUBLISHED = '2026-06-20';
const URL = 'https://tradenovaos.com/blog/fair-value-gaps-guide';

export default function FairValueGapsGuide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SeoHead
        path="/blog/fair-value-gaps-guide"
        title="Fair Value Gaps (FVG): Identification, Risks and Journaling — TradeNova OS"
        description="Learn the three-candle Fair Value Gap pattern, its limitations and risk considerations, and how to document hypothetical setups in a trading journal."
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'Fair Value Gaps (FVG): Identification, Risks and Journaling',
          description:
            'Learn the three-candle Fair Value Gap pattern, its limitations and risk considerations, and how to document hypothetical setups in a trading journal.',
          datePublished: PUBLISHED,
          dateModified: '2026-10-12',
          author: { '@type': 'Organization', name: 'TradeNova OS' },
          publisher: {
            '@type': 'Organization',
            name: 'TradeNova OS',
            logo: {
              '@type': 'ImageObject',
              url: 'https://tradenovaos.com/favicon.png',
            },
          },
          mainEntityOfPage: URL,
          url: URL,
        }}
      />
      <MarketingNavbar
        onLogin={() => navigate('/login')}
        onSignup={() => navigate('/signup')}
      />

      <main id="main-content" className="max-w-3xl mx-auto px-5 sm:px-8 pt-32 pb-24">
        <Button asChild variant="link" className="px-0 text-muted-foreground mb-8">
          <Link to="/resources/blog"><ArrowLeft className="h-4 w-4" /> Back to blog</Link>
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              Price Action
            </span>
            <span className="text-[11px] text-foreground">June 20, 2026</span>
            <span className="text-[11px] text-foreground">Updated October 12, 2026 · 7 min read</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight leading-[1.05]">
            Fair Value Gaps (FVG): Identification, Risks and Journaling
          </h1>
          <p className="text-lg text-foreground mb-10 leading-relaxed">
            Fair Value Gaps — the three-candle imbalance pattern popularised by
            ICT — are a way of describing a three-candle chart pattern.
            This guide explains how to identify the pattern, consider its
            limitations and record hypothetical setups for review. An FVG is
            not evidence that price must return to a zone or that a trade will profit.
          </p>

          <article className="prose prose-invert max-w-none prose-headings:text-foreground prose-headings:font-black prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-foreground prose-p:leading-relaxed prose-li:text-foreground prose-strong:text-foreground">
            <h2>What is a Fair Value Gap?</h2>
            <p>
              A Fair Value Gap (FVG) is a three-candle pattern with a
              non-overlapping range between the first and third candles. In a bullish
              FVG, the high of candle&nbsp;1 sits <em>below</em> the low of
              candle&nbsp;3. In a bearish FVG, candle&nbsp;1's low is above
              candle&nbsp;3's high. The range between
              candle&nbsp;1's high and candle&nbsp;3's low is the
              &ldquo;imbalance&rdquo;.
            </p>
            <p>
              The middle candle may trade through this range, so an FVG is not
              proof that no transactions occurred there. Candles alone do not
              establish institutional intent or unfilled orders. Price may revisit
              the zone, pass through it, or never return; a chart pattern does
              not require the market to “fill” it.
            </p>

            <h2>How to identify an FVG step-by-step</h2>
            <ol>
              <li>
                Mark the candle with the largest body in a clean impulsive
                move.
              </li>
              <li>
                Compare the wick high of the candle <em>before</em> it with
                the wick low of the candle <em>after</em> it (for a bullish
                FVG; invert for bearish).
              </li>
              <li>
                If those two wicks do not overlap, the empty range is your
                Fair Value Gap.
              </li>
              <li>
                Draw a rectangle across that range and extend it forward in
                time — that's your zone of interest.
              </li>
            </ol>

            <h2>How traders evaluate an FVG: hypothetical considerations</h2>
            <p>These are examples for research and journaling, not entry instructions or investment advice. A revisit is not a signal on its own.</p>
            <h3>1. Wait for price to revisit the gap</h3>
            <p>
              Some traders study a return to the proximal edge (the side closer
              to current price), while others study a deeper retracement. A wick
              into the zone can be recorded as an observation, not confirmation
              that a reversal or continuation will follow.
            </p>
            <h3>2. Stack confluence</h3>
            <p>
              An FVG on its own is not an edge — it's a location. Pair it
              with:
            </p>
            <ul>
              <li>An aligned higher-timeframe trend or bias.</li>
              <li>A liquidity sweep or stop-run immediately before the gap.</li>
              <li>Session timing and scheduled news, including spread and volatility risks.</li>
              <li>A break-of-structure that confirms the direction.</li>
            </ul>
            <h3>3. Define entry, stop, and target</h3>
            <ul>
              <li>
                <strong>Entry hypothesis:</strong> specify the exact condition being studied before observing the outcome.
              </li>
              <li>
                <strong>Invalidation and risk:</strong> define what would contradict the hypothesis and the maximum planned exposure. A stop is not a guaranteed execution price.
              </li>
              <li>
                <strong>Exit hypothesis:</strong> document the planned exit and its rationale. No R-multiple is universally suitable; costs, slippage and gaps can change the realized result.
              </li>
            </ul>

            <h2>Common mistakes to avoid</h2>
            <ul>
              <li>
                Assuming every gap is actionable. Record the timeframe and context; lower timeframes can be particularly sensitive to spread and execution costs.
              </li>
              <li>
                Assuming context guarantees success. An aligned trend or additional chart pattern does not establish a reliable hit rate without evidence.
              </li>
              <li>
                Changing the risk rule after entry merely to avoid accepting a loss. A predefined level helps document the decision, but does not make the pattern work.
              </li>
              <li>
                Not journaling outcomes. Without data you can't tell a real
                supported observations from confirmation bias.
              </li>
            </ul>

            <h2>Documenting an FVG hypothesis in TradeNova</h2>
            <p>
              Use the <Link to="/features/playbook-lab" className="text-primary">Trade Plan</Link> for the intended scenario and rules,
              and the <Link to="/features/trade-journal" className="text-primary">Trade Journal</Link> for notes and before/after screenshots.
              The following is a hypothetical recording template, not a recommended strategy:
            </p>
            <ul>
              <li>
                <strong>Setup name:</strong> &ldquo;15m FVG retrace, with HTF
                bias&rdquo;.
              </li>
              <li>
                <strong>Conditions:</strong> 4H trend direction, prior
                liquidity sweep, session window.
              </li>
              <li>
                <strong>Entry hypothesis:</strong> the specific chart condition you intend to evaluate, defined before entry.
              </li>
              <li>
                <strong>Invalidation:</strong> close beyond the distal FVG
                edge.
              </li>
              <li>
                <strong>Exit and risk:</strong> the planned exit condition and initial risk amount, with actual costs recorded separately.
              </li>
              <li>
                <strong>Screenshots:</strong> attach 2–3 best/worst examples.
              </li>
            </ul>
            <p>
              Use a consistent setup label in your trade notes and record losing
              and winning examples. <Link to="/features/edge-analytics" className="text-primary">Analytics</Link> summarizes recorded trades;
              it cannot prove that a pattern will remain profitable. No fixed
              sample count establishes an edge. Missing records, costs and changing
              conditions limit conclusions. Use a <Link to="/blog/weekly-trading-journal-review" className="text-primary">weekly journal review</Link> to check the quality of your evidence.
            </p>

            <h2>Key takeaways</h2>
            <ul>
              <li>
                An FVG is a three-candle chart pattern — a location to study, not
                a signal.
              </li>
              <li>A revisit or added confluence does not guarantee an outcome. Define risk before any decision.</li>
              <li>
                Document the rules in a playbook, then let the data decide
                what to keep.
              </li>
            </ul>
            <h2>Risk and limitations</h2>
            <p>This content is educational, not investment advice. Trading can cause substantial losses, and leverage amplifies risk. Spreads, fees, slippage and gaps can undermine a hypothetical setup. Journaling cannot remove that risk or guarantee better performance. If a loss prompts an unplanned attempt to recover money, read the <Link to="/blog/stop-revenge-trading-after-loss" className="text-primary">post-loss psychology checklist</Link>.</p>
          </article>

          <div className="mt-14 rounded-2xl border border-primary/25 bg-card p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex w-12 h-12 rounded-xl bg-primary text-foreground items-center justify-center flex-shrink-0">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black mb-2">
                  Keep a record of your FVG observations
                </h3>
                <p className="text-foreground mb-5">
                  Record the intended scenario in Trade Plan and the outcome in
                  Trade Journal. Compare the current offer on the <Link to="/pricing" className="text-primary">pricing page</Link> or explore <Link to="/" className="text-primary">TradeNova OS</Link>.
                </p>
                <div className="flex flex-wrap gap-4 mb-5">
                  {['14-day trial', 'Payment method required'].map((t) => (
                    <span key={t} className="flex items-center gap-1.5 text-xs text-foreground">
                      <Check className="h-3 w-3 text-primary" />
                      {t}
                    </span>
                  ))}
                </div>
                <Button asChild
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary text-foreground px-6 py-3 rounded-xl font-bold text-sm transition-all hover:shadow-xl hover:shadow-primary/20"
                >
                  <Link to="/signup">Start your 14-day trial <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
