# Second-stage public content SEO validation

Date: 2026-10-12. Not published. Normal mode; no Max-mode tasks.

## Delivered

- Corrected the FVG definition: non-overlapping first/third candle ranges do not prove absent transactions, institutional intent or an inevitable gap fill.
- Removed unsupported hit-rate, sample-size, guaranteed-edge and default-return assertions. Added educational framing, execution/cost/leverage risks and hypothetical examples.
- Corrected the FVG offer and public footer to a 14-day trial with a payment method required. No price amounts, pricing helpers or checkout logic changed.
- Added exactly two substantive articles: `/blog/weekly-trading-journal-review` and `/blog/stop-revenge-trading-after-loss`. Both include practical process checklists, labeled hypothetical examples, missing-data caveats and risk limitations; no statistics, testimonials or outcome promises.
- Replaced six nonfunctional blog entries with only the three actual articles. Entries are keyboard-accessible links, not click-only containers. Blog structured data now references real URLs and ISO dates.
- Improved feature titles/descriptions and added cross-links among articles, real feature pages, pricing and the homepage. Product/blog/educational links in the alternate public navigation now lead to substantive pages; footer Blog now leads to the real listing.
- Sitemap generator/output contain 15 canonical URLs, including the two new articles, updated FVG modification date and six existing substantive feature pages. Placeholder families remain excluded.

## Exact files changed

1. `src/pages/blog/FairValueGapsGuide.tsx` — corrections, risk framing, metadata, links and accurate trial CTA.
2. `src/pages/blog/articles.ts` — new shared real-article catalog, two original article bodies and Article metadata helpers.
3. `src/pages/blog/EducationalArticle.tsx` — public article view using existing typography, colors, navigation and controls.
4. `src/pages/blog/articles.test.ts` — four SEO-integrity tests.
5. `src/pages/marketing/MarketingPages.tsx` — actual blog listing/structured data, feature metadata and related-reading links.
6. `src/components/marketing/MarketingFooter.tsx` — real feature/blog destinations and accurate trial copy.
7. `src/components/marketing/MarketingNav.tsx` — real product/blog/educational destinations and balanced descriptions.
8. `src/App.tsx` — registrations for the two public article routes only; protected routes unchanged.
9. `scripts/generate-sitemap.mjs` — article and existing feature entries.
10. `public/sitemap.xml` — regenerated output.
11. `AGENTS.md` — public article catalog convention.
12. `roadmap.md` — this task and validation status only; older entries left unchanged.
13. `docs/content-seo-validation.md` — this report.

`index.html`, its Google verification tag, `SeoHead.tsx`, design tokens, authenticated features, prices, billing, auth, database, RLS and functions were not modified.

## Validation

- Full existing Vitest suite: **88 tests passed across 12 files**, including four new article-integrity tests and four unchanged pricing tests.
- Latest automatic preview build after code changes: **build OK**, 2026-10-12 00:24:21 UTC. No separate manual build or TypeScript command was run; the automatic build result is not presented as an independent full-project TypeScript check.
- Browser checks at desktop 1280 × 1800: blog listing, all three articles, Journal/Psychology feature pages, pricing and a comparison placeholder.
- Verified one self-referencing canonical and one description per checked page; three Article schemas match their page URLs. The comparison placeholder remains `noindex, follow`; checked substantive pages do not inherit noindex.
- Clicked the real blog listing to the journal article and its link to the psychology article successfully.
- Phone-width checks at 390 × 844 for blog, three articles and Journal/Psychology feature pages: no horizontal overflow. Screenshots reviewed; existing consent panel remains unchanged.
- No browser runtime errors in the checked flow. No user records or billing transactions were created or changed.

## Search evidence and limitations

- US Semrush data for “how to stop revenge trading”: 20 searches/month, reported difficulty 0/100. This is limited regional evidence, not a ranking guarantee. Other countries' demand remains unknown.
- “How to review a trading journal” returned no Semrush data: demand and difficulty are unknown, not zero. The article addresses an existing product workflow; no traffic forecast is made.
- Search-result research was used for topic context, not as a source of product facts or scientific claims. No neurobiological explanations, causal performance claims or invented statistics were added.
- Vite remains a client-rendered SPA. Fetching an article without executing JavaScript returns the shared HTML shell and sitewide metadata, not the article body or its route-specific metadata/JSON-LD. JavaScript-executing crawlers can render the checked head/content; non-JavaScript social crawlers still see sitewide fallbacks. Indexing, ranking and traffic are not established by these checks.
- No prerendering, SSR migration, hosting changes or SEO scan was introduced.
- Other pre-existing marketing claims and peripheral links were not exhaustively rewritten. Existing comparison/legal/contact placeholders and solution/help content remain outside this minimal content pass; the new article recommendations do not use them as primary destinations.

## After the owner publishes

1. Confirm the live sitemap contains all 15 URLs and the two new articles open on `https://tradenovaos.com`.
2. Resubmit `https://tradenovaos.com/sitemap.xml` in Search Console.
3. Inspect each new article and the updated FVG page; check rendered content and declared canonical, then request indexing.
4. Monitor indexing reports. Submission is not a guarantee that Google indexes or ranks the pages.

No publishing occurred in this task. The live site retains its previously published content until the owner deploys.