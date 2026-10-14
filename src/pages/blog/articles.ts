export interface BlogArticle {
  slug: string;
  title: string;
  description: string;
  tag: string;
  published: string;
  modified: string;
  read: string;
  body?: string;
}

export const BLOG_ARTICLES: BlogArticle[] = [
  {
    slug: 'weekly-trading-journal-review',
    title: 'How to Review Your Trading Journal Each Week',
    description: 'A weekly trading journal review checklist: separate outcomes from execution, compare like-for-like trades, record missing evidence and choose one process change.',
    tag: 'Journaling', published: '2026-10-12', modified: '2026-10-12', read: '6 min',
    body: `A useful weekly review answers a narrow question: **did you follow the process you intended to follow?** Profit and loss matter, but a profitable trade can break your rules and a losing trade can follow them. Review both without treating either outcome as proof of skill.

This checklist works with a spreadsheet, a notebook or a trading journal. The examples are hypothetical, not recommendations to take a trade.

## 1. Set a consistent review boundary

Choose a start date, end date and trading account before looking at results. Use the same timezone each week. Decide whether your review includes trades opened or closed in the period, and keep that convention consistent. Record open positions separately rather than treating unrealized results as completed trades.

Keep materially different strategies separate. Mixing a swing position with an intraday setup can hide differences in holding time, risk and execution. If you changed a rule midweek, note when it changed instead of judging every trade against the newest version.

## 2. Check the records before interpreting them

For each completed trade, check the instrument, direction, date, outcome, position size and recorded P&L. If you calculate results after costs, reconcile commissions, fees and financing charges with your broker statement. A blank field means unknown, not zero.

Add the context needed to understand the decision:

- The setup and timeframe you intended to trade.
- The reason for entry and the condition that would invalidate it.
- Planned risk and exit criteria, recorded before entry where possible.
- Before and after screenshots, with relevant levels visible.
- Whether the plan was followed, partly followed or not followed.
- A short note about emotions and any rule deviations.

Do not reconstruct a confident-looking plan after seeing the result. Label retrospective notes clearly. If a screenshot or original risk amount is missing, keep that limitation in the review.

## 3. Separate outcome from execution

Make two short lists: what happened financially, and what happened behaviorally. Avoid calling every loss a mistake.

**Hypothetical example:** Trade A closed at a loss, but its entry, size and exit followed the written plan. Trade B closed at a profit, but you increased its size after an earlier loss without a planned reason. A belongs in the “plan followed” group; B belongs in the “risk rule broken” group. The winning outcome does not make B's decision repeatable or safe.

If you track R-multiples, define R consistently as the initial planned monetary risk. A result of −1R means a loss equal to that amount under your definition; gaps, slippage and costs can make actual losses larger. Do not substitute the displayed target risk-to-reward ratio for the realized R-multiple.

## 4. Compare like-for-like trades

Start with one comparison that your records actually support: the same setup with and without a rule deviation, for example. Look at the number of observations as well as the results. A strong-looking average based on a few trades is uncertain, not a proven edge.

Do not slice the data into dozens of categories until a winning group appears. Small groups, changing market conditions and missing records make patterns fragile. Write “possible pattern to monitor” rather than “this always works.” A review is a record of evidence, not a forecast.

## 5. Write a short review you can use next week

Use this template:

1. **Scope:** account, dates, timezone and inclusion rule.
2. **Evidence:** completed trades reviewed and missing records.
3. **Process strength:** one behavior supported by a specific trade.
4. **Process issue:** one deviation, including when and why it occurred.
5. **Next action:** one observable rule or recording habit.
6. **Next review:** how you will check that action was followed.

For example: “Two entries lacked a pre-entry screenshot. Next week I will capture the chart before placing an order and mark missing captures explicitly.” This is easier to verify than “be more disciplined.” It does not promise higher returns.

## 6. Keep the next action small

Choose one change before adding more. Check its completion at the next review, then decide whether the evidence supports keeping it. Do not change your strategy solely because of one disappointing week.

If a review reveals repeated attempts to recover losses, use the [post-loss psychology checklist](/blog/stop-revenge-trading-after-loss) to document triggers and pauses. For an example of recording a price-action setup without assuming it will work, read the [Fair Value Gap guide](/blog/fair-value-gaps-guide).

## Using TradeNova for the record

TradeNova's [Trade Journal](/features/trade-journal) records trade context, notes and before/after charts. [Analytics](/features/edge-analytics) provides summaries from recorded trades, while [Trade Plan](/features/playbook-lab) keeps daily plans and weekly outlooks. These tools organize your evidence; they cannot determine whether a strategy will be profitable.

You can compare the current offer on the [pricing page](/pricing) or return to [TradeNova OS](/).

## Risk and limitations

This article is educational, not investment advice. Trading can cause substantial losses; leverage can magnify them. Journaling does not remove market risk, replace professional advice or guarantee improved performance. Incomplete data and hindsight bias limit what any review can establish.`,
  },
  {
    slug: 'stop-revenge-trading-after-loss',
    title: 'How to Stop Revenge Trading After a Loss: A Process Checklist',
    description: 'Recognize revenge-trading triggers after a loss, pause before another order, document the decision and review rule adherence without judging yourself by P&L.',
    tag: 'Psychology', published: '2026-10-12', modified: '2026-10-12', read: '6 min',
    body: `Revenge trading describes taking another trade primarily to recover a loss, rather than because it meets a pre-written plan. The next trade might win, but that does not make an impulsive decision sound. The goal of this checklist is to interrupt an unplanned action—not to recover money or guarantee emotional control.

The examples below are hypothetical. This is trading-process education, not investment advice or mental-health treatment.

## Recognize the trigger, not just the result

A loss alone does not establish revenge trading. A planned losing trade followed by another valid, planned setup is different from increasing size because you feel you must “get back to break-even.”

Watch for observable changes:

- You change position size to recover the previous loss.
- You enter before your entry conditions are satisfied.
- You move or remove a planned stop because accepting another loss feels difficult.
- You trade outside your planned session or instrument list.
- You focus on recovering a money amount rather than checking the setup.

These are prompts to examine your own rules, not a diagnosis. Record the action and thought in plain language instead of labeling yourself a “bad trader.”

## Before the session: define your stop conditions

Write your position-risk constraints, session limits and pause conditions before trading. Use limits suited to your own circumstances and experience; there is no universal loss amount or number of trades that makes trading safe. A broker's leverage or margin allowance is not a personal risk budget.

Define what happens when a limit is reached. For example: “If I place an order that breaks my written size rule, I stop opening new positions and review the deviation before another session.” This is an illustrative process rule, not a recommended threshold.

Make the distinction between stopping new entries and managing an existing position explicit. Do not abandon an open position or improvise its management because a checklist says to pause. Follow your previously defined risk procedures and understand that stop orders may execute at worse prices in fast or gapping markets.

## After a loss: pause the next decision

Before opening a new position, step away from the order-entry controls long enough to write down what happened. Choose your pause procedure in advance; an arbitrary timer cannot prove that you are ready to resume.

Ask:

1. Was the losing trade consistent with my plan?
2. Am I seeking a valid setup or trying to recover a particular amount?
3. Has my intended size changed because of the loss?
4. Have any of my written session limits been reached?
5. Can I describe the next trade's conditions without referring to the previous P&L?

If you cannot answer clearly, or your stop condition has been reached, do not treat the checklist as permission to place another order. Ending a session can be the appropriate process decision. There is no obligation to trade every day.

## Use a brief post-loss journal entry

Record the sequence while it is still fresh. Keep facts separate from interpretation:

- **Event:** what closed and whether the exit followed the plan.
- **Thought:** the exact phrase you noticed, such as “I need to make it back now.”
- **Feeling:** your own description, without inventing a rating you did not record.
- **Urge:** the action you wanted to take.
- **Action:** what you actually did.
- **Rule check:** followed, partly followed, not followed or unknown.
- **Next step:** pause, end the session or evaluate a later setup under the original rules.

**Hypothetical example:** “The planned stop was hit. I wanted to double the next order to recover the loss. I did not place it, noted the urge, and ended the session under my written pause rule.” The useful observation is that the rule was followed—not what an unplaced trade might have earned.

## Review behavior separately from profit

At your next [weekly journal review](/blog/weekly-trading-journal-review), compare post-loss actions with your original rules. Count only records you actually have. Missing emotion or discipline ratings are unknown, not evidence of a poor mindset.

Ask whether deviations share a context: rushed entries, a session running longer than planned, or checking P&L repeatedly. A handful of examples can suggest a question to monitor but cannot establish causation. Do not claim that an emotion causes losses merely because it appears next to them in the journal.

Choose one practical adjustment, such as keeping a written pause checklist beside the order-entry screen. Review whether you used it. Avoid changing multiple rules at once or interpreting one profitable week as proof that the problem is solved.

## Where TradeNova fits—and where it does not

TradeNova's [Psychology Tracking](/features/mind-journal) and [Trade Journal](/features/trade-journal) help record emotions, discipline and trade notes. [Trade Plan](/features/playbook-lab) provides a place to write your daily rules. Recording a rule does not make the software a broker-side risk lock or automatically prevent an order.

See [pricing and trial details](/pricing) for the current offer, or return to the [TradeNova homepage](/). Software is a record-keeping aid, not treatment or a guarantee of better decisions.

## When a checklist is not enough

If trading feels compulsive, causes distress or affects essential finances, stop and seek appropriate qualified support. A journal cannot replace professional financial or mental-health help. Do not borrow or risk money needed for essential expenses in an attempt to recover losses.

Trading involves substantial risk, especially with leverage. Pauses, plans and journals do not eliminate losses. This article does not recommend any instrument, entry, position size or return target.`,
  },
  {
    slug: 'fair-value-gaps-guide',
    title: 'Fair Value Gaps (FVG): Identification, Risks and Journaling',
    description: 'Learn the three-candle Fair Value Gap pattern, its limitations and risk considerations, and how to document hypothetical setups in a trading journal.',
    tag: 'Price Action', published: '2026-06-20', modified: '2026-10-12', read: '7 min',
  },
];

export function articlePath(article: BlogArticle): string {
  return `/blog/${article.slug}`;
}

export function articleJsonLd(article: BlogArticle) {
  const url = `https://tradenovaos.com${articlePath(article)}`;
  return {
    '@context': 'https://schema.org', '@type': 'Article',
    headline: article.title, description: article.description,
    datePublished: article.published, dateModified: article.modified,
    author: { '@type': 'Organization', name: 'TradeNova OS' },
    publisher: { '@type': 'Organization', name: 'TradeNova OS' },
    mainEntityOfPage: url, url,
  };
}