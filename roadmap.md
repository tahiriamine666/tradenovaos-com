# Redesign roadmap
- [ ] Second-stage public content SEO: correct FVG claims, add two educational articles, wire real links/metadata/sitemap, verify public routes and tests; no publishing or app changes
- [x] Update current annual references to Pro 71.88/Elite 119.88; exact authenticated runtime IDs/quotes verified, desktop/mobile annual UI checked, 46 tests passed, separate typecheck exit 0 and automatic build OK; no backend changes or publishing
- [x] Update active monthly price copy, preserve annual offers/equivalents, audit stale references, run price/mapping/regression tests and desktop/mobile checks; automatic build OK; report in docs/pricing-update-verification.md
- [x] Independently verify exact runtime monthly Dodo product IDs via authorized public quote fields; both expected IDs, current prices and monthly trials match
- [x] Update legacy admin offer-price estimates via forward migration; separate tsgo exit 0, 44 tests pass, automatic build OK; verify unchanged annual onboarding 14-day override
- [ ] Publish pricing release (blocked: owner approval/inspection pending; unrelated release blockers not addressed)
- [ ] Finish Dashboard local-time greeting and per-user saved reorder/show-hide layout; verify desktop/mobile and tests
- [ ] Add versioned first-visit cookie consent, policy, reopening controls and verify persistence/accessibility without changing auth
- [x] Weekly / Bi-Weekly Trading Review + sectioned Add Trade form with extended psychology
- [x] Animate checklist robot with CSS; verified click-only progress/completion, no uncheck/reload celebration, reduced motion, offscreen pause and mobile framing using intercepted saves; automatic build OK
- [x] Reconfirm exact #1D7FFF globally; minimized hover brightness, verified rendered public/app accents, active-source old-accent scan clean and automatic build OK; unused metadata and authentic media remain exceptions
- [x] Hide platform-injected published Lovable badge; public domain has no badge; NOVA float/pulse, stable dimensions, reduced motion and mobile layout verified; automatic build OK
- [x] Apply exact reference blue globally; rendered RGB 29/127/255 and lighter hover verified, automatic build/typecheck passed; old accents remain only in unused generated palette metadata
- [x] Inspect production schema, authorization, session and billing paths (remaining checks: docs/production-readiness-audit.md)
- [x] Repair confirmed plan/checklist/account integrity and frontend defects
- [x] Verify scoped fixes with mocked regression tests, browser checks and automatic build/typecheck; live transactions remain untested
- [x] Replace cyan accents globally with premium royal blue and neutral surfaces/text
- [x] Audit hardcoded colors and verify CTAs, active states, and diagnostics
- [x] Replace TradeNova branding throughout the site with the supplied robot logo and matching favicon
- [x] Install the new TradeNova N logo and favicon
- [x] Apply the black and ice-blue global design system and typography
- [x] Restyle the public homepage, navigation, broker strip, and footer
- [x] Restyle the signed-in shell and shared controls
- [x] Verify desktop/mobile visuals and preview diagnostics

# Trading workspace views
- [x] Rebuild Journal as a dense trade table
- [x] Rebuild Trade Logs as a screenshot gallery
- [x] Rebuild Analytics with KPI and trend charts
- [x] Rebuild Calendar with monthly summary
- [x] Verify all four views

# Journal images and navigation
- [x] Add before and after screenshots to journal trades and details
- [x] Add a collapsible desktop sidebar with a visible restore control

# Feature animations
- [x] Add subtle page transitions across the signed-in features
- [x] Add staged reveals and hover feedback to Journal and Trade Logs
- [x] Respect reduced-motion preferences

# Calendar day details
- [x] Open prior dates in a right-side day-details drawer with trades and before/after chart captures
- [x] Verify day-details interaction in the signed-in preview

# Trade Plan history
- [x] Browse saved daily plans in a compact calendar and load dates without copying or overwriting plans
- [x] Keep historical plans read-only until editing and preserve separate dated outlooks
- [x] Verify saved-date viewing, edit/view mode, empty-date state, month browsing and mobile layout in the signed-in preview
- [ ] Verify writing/autosave with a disposable test account (blocked: existing account's records must not be modified for a test)
