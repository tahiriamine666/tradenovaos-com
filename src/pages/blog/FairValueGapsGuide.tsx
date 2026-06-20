import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Target } from 'lucide-react';
import MarketingNavbar from '@/components/MarketingNavbar';
import SeoHead from '@/components/SeoHead';

const PUBLISHED = '2026-06-20';
const URL = 'https://tradenovaos-com.lovable.app/blog/fair-value-gaps-guide';

export default function FairValueGapsGuide() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <SeoHead
        path="/blog/fair-value-gaps-guide"
        title="Fair Value Gaps (FVG): How to Identify and Trade Them"
        description="A practical guide to Fair Value Gaps (FVG): what they are, how to spot them on any chart, how to trade them with confluence, and how to document FVG setups in your trading playbook."
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: 'Fair Value Gaps (FVG): How to Identify and Trade Them',
          description:
            'A practical guide to Fair Value Gaps (FVG): mechanics, identification, entry/exit rules, and documenting FVG setups in the TradeNova Playbook Lab.',
          datePublished: PUBLISHED,
          dateModified: PUBLISHED,
          author: { '@type': 'Organization', name: 'TradeNova OS' },
          publisher: {
            '@type': 'Organization',
            name: 'TradeNova OS',
            logo: {
              '@type': 'ImageObject',
              url: 'https://tradenovaos-com.lovable.app/tradenova-icon.png',
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
        <motion.button
          onClick={() => navigate('/resources/blog')}
          whileHover={{ x: -2 }}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-violet-700 mb-8"
        >
          <ArrowLeft className="h-4 w-4" /> Back to blog
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="text-[10px] font-bold text-violet-600 bg-violet-500/10 px-2 py-0.5 rounded-full">
              Price Action
            </span>
            <span className="text-[11px] text-slate-700">June 20, 2026</span>
            <span className="text-[11px] text-slate-700">9 min read</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black mb-6 tracking-tight leading-[1.05]">
            Fair Value Gaps (FVG): How to Identify and Trade Them
          </h1>
          <p className="text-lg text-slate-700 mb-10 leading-relaxed">
            Fair Value Gaps — the three-candle imbalance pattern popularised by
            ICT — are one of the most-searched price-action concepts in
            trading. This guide explains what an FVG actually is, how to spot
            one on any chart, how to trade it with confluence, and how to turn
            FVG setups into a repeatable edge inside the TradeNova{' '}
            <strong>Playbook Lab</strong>.
          </p>

          <article className="prose prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tight prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-strong:text-slate-900">
            <h2>What is a Fair Value Gap?</h2>
            <p>
              A Fair Value Gap (FVG) is a three-candle pattern that leaves a
              price range where no opposing-side trades printed. In a bullish
              FVG, the high of candle&nbsp;1 sits <em>below</em> the low of
              candle&nbsp;3 — candle&nbsp;2's body shoots through the gap
              without overlapping wicks on either side. The empty zone between
              candle&nbsp;1's high and candle&nbsp;3's low is the
              &ldquo;imbalance&rdquo;.
            </p>
            <p>
              Markets dislike inefficiency. Algorithms and large participants
              tend to revisit these gaps to fill the unfilled liquidity before
              continuing in the original direction. That return-to-gap is the
              tradable event.
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

            <h2>How to trade an FVG</h2>
            <h3>1. Wait for price to revisit the gap</h3>
            <p>
              Don't chase the impulsive candle. Let price retrace into the
              FVG. The cleanest entries form when price taps the proximal edge
              (the side closer to current price) and rejects, leaving a wick
              into the gap.
            </p>
            <h3>2. Stack confluence</h3>
            <p>
              An FVG on its own is not an edge — it's a location. Pair it
              with:
            </p>
            <ul>
              <li>An aligned higher-timeframe trend or bias.</li>
              <li>A liquidity sweep or stop-run immediately before the gap.</li>
              <li>A session-open (London / NY) or news catalyst.</li>
              <li>A break-of-structure that confirms the direction.</li>
            </ul>
            <h3>3. Define entry, stop, and target</h3>
            <ul>
              <li>
                <strong>Entry:</strong> limit order at the proximal edge, or
                market entry on a lower-timeframe confirmation candle.
              </li>
              <li>
                <strong>Stop:</strong> just beyond the far edge of the FVG.
              </li>
              <li>
                <strong>Targets:</strong> the next liquidity pool, opposing
                FVG, or a fixed R-multiple (2R–3R is a sensible default).
              </li>
            </ul>

            <h2>Common mistakes to avoid</h2>
            <ul>
              <li>
                Trading every gap. Most FVGs on the 1-minute chart are noise
                — focus on 15m and above for swing-style entries.
              </li>
              <li>
                Ignoring context. An FVG against the daily trend has a far
                lower hit rate.
              </li>
              <li>
                Moving the stop after entry. FVGs work because the level is
                defined <em>before</em> the trade.
              </li>
              <li>
                Not journaling outcomes. Without data you can't tell a real
                edge from confirmation bias.
              </li>
            </ul>

            <h2>Building an FVG playbook in TradeNova</h2>
            <p>
              The TradeNova <strong>Playbook Lab</strong> is built for exactly
              this — turning a discretionary pattern into a documented,
              measurable setup. Here's a recommended structure for an FVG
              playbook entry:
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
                <strong>Entry rule:</strong> limit at proximal FVG edge after
                BOS on 5m.
              </li>
              <li>
                <strong>Invalidation:</strong> close beyond the distal FVG
                edge.
              </li>
              <li>
                <strong>Targets:</strong> 2R minimum, scale at next liquidity
                pool.
              </li>
              <li>
                <strong>Screenshots:</strong> attach 2–3 best/worst examples.
              </li>
            </ul>
            <p>
              Tag every trade you take with this playbook ID. After 30+
              samples, TradeNova's analytics will tell you your real win rate,
              expectancy, and best session — the only honest way to know
              whether your FVG read is an edge or a story.
            </p>

            <h2>Key takeaways</h2>
            <ul>
              <li>
                An FVG is a three-candle imbalance — a tradable location, not
                a signal.
              </li>
              <li>Wait for the revisit, stack confluence, define risk first.</li>
              <li>
                Document the rules in a playbook, then let the data decide
                what to keep.
              </li>
            </ul>
          </article>

          <div className="mt-14 rounded-2xl border border-violet-200 bg-violet-50/60 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="hidden sm:flex w-12 h-12 rounded-xl bg-violet-600 text-white items-center justify-center flex-shrink-0">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black mb-2">
                  Turn your FVG reads into a real edge
                </h3>
                <p className="text-slate-700 mb-5">
                  Document the setup once in TradeNova's Playbook Lab, tag
                  every trade, and let the analytics tell you what actually
                  works.
                </p>
                <div className="flex flex-wrap gap-4 mb-5">
                  {['Free forever plan', 'No credit card', 'Setup in 2 minutes'].map((t) => (
                    <span key={t} className="flex items-center gap-1.5 text-xs text-slate-700">
                      <Check className="h-3 w-3 text-emerald-600" />
                      {t}
                    </span>
                  ))}
                </div>
                <button
                  onClick={() => navigate('/signup')}
                  className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-xl font-bold text-sm transition-all hover:shadow-xl hover:shadow-violet-500/20"
                >
                  Start free — build your FVG playbook
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
