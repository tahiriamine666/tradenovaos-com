# TradeNova production-readiness audit — 8 October 2026

## Repaired
- Daily plans now read/write/history by user + account_key + date + pair. Account ID is included in writes and server-validated against ownership. Legacy plans remain in `all` scope, visible via All Accounts; they are not copied into individual accounts. Weekly outlook remains shared weekly context with explicit `pair=''`.
- Daily and pair-checklist saves serialize requests, preserve failed snapshots, flush before pair/date/tab switches, block those switches on failure, and warn before browser unload. Account changes flush the old snapshot before loading the new scope. Checklist remains mounted during scope changes to retain pending saves. Abrupt browser termination still cannot guarantee network completion.
- Calendar details now offer the day's actual saved pairs and display the selected pair's V2 bias, price, scenario, news, psychology, rules and risk. Dashboard daily-plan reads are account-scoped.
- Trade editing no longer assigns an existing trade to whichever account is currently selected. Journal fetch failures display feedback rather than silently showing an empty journal.
- Recovery updates require a SDK-confirmed PASSWORD_RECOVERY session, not a normal login plus arbitrary `?code=`. Auth initialization no longer overwrites a newer session event with an older getSession response. Managed Google OAuth canonicalizes production bare/www returns; architecture unchanged.
- Access lookup failures expose retry instead of an endless spinner. Profiles clear on sign-out. All Accounts selection survives account-list refresh. Account creation uses the broker field only for broker accounts; removed payload debug logging and misleading Pro entitlement copy without changing actual entitlements.
- Psychology does not fabricate zero for unrated scores; unassigned legacy journal mood is excluded from individual-account dashboards.
- Certificate URLs refresh on focus and periodically, and delete controls are touch/keyboard-visible. Private certificate and screenshot buckets and ownership policies were inspected, not changed. Screenshot display remains contained.
- Dodo webhook/portal source now uses the existing canonical `billing_subscriptions` schema rather than nonexistent `subscriptions` columns. Webhook writes preserve manual overrides and no longer mirror billing into profile plan fields. Read-only inspection confirmed existing unique user_id and subscription_id indexes. Unmatched events return retryable errors. Official Dodo documentation confirms retries and out-of-order delivery; no webhook replay or subscription mutation was performed.
- Admin access metrics label manual entitlements as access rather than implying all are paid revenue.

## Migration applied
`drizzle/migrations/0017_scope_daily_plans_by_account.sql`: additive account_id/account_key columns, unique `(user_id, account_key, plan_date, pair)`, ownership/scope validation trigger. Generated Supabase types updated. All 80 existing plan rows preserved, still 80 distinct keys; all 9 checklist rows preserved, still 9 distinct keys. No users, plans, billing records or uploaded files modified during testing.

## Verification
- Automatic build/typecheck pipeline: successful after correcting test-only selector types; latest observed `build OK`.
- Vitest: 3 tests passed, including simulated bias+risk/no-psychology and with-psychology saves, EURUSD/XAUUSD checklist independence, account isolation, full conflict keys, failed-save switch blocking and retry. Mocked database only.
- Browser: public landing/pricing/login/signup/recovery and protected Dashboard, Journal, Checklist/Plan, Analytics, Certificates and Settings checked. Focus/visibility events plus reload preserved feature URLs. EURUSD/XAUUSD switch worked. Invalid recovery code with an ordinary session was rejected. No uncaught page errors in those checks. Some unsupported `?view=` values keep their URL but do not prove a real feature loaded; admin SQL gates were inspected separately.
- Main CTAs/sidebar active states render royal blue rgb(37,99,235). Desktop checks and mobile Dashboard show no document overflow. No active-source prohibited color or Vercel/old-project matches. Three cyan/teal values remain only in unused generated `src/tailwind.config.lov.json` palette metadata; it is not an active theme source.
- Domain: canonical bare domain primary/active, www active redirect; public A/TXT records match expected values. HTTP bare returned 200; www returned 302 to bare then 200. DNS unchanged.
- Production schema, RLS, admin RPC authorization and recent PostgreSQL errors inspected. No current DB errors observed; no duplicate plan/checklist keys found.

## Outstanding / manual verification
This is not a blanket certification of every feature. Publish and verify edge-function deployment before relying on repaired Dodo paths; no live checkout/payment or webhook replay was tested. Real password-reset email completion and Google provider round-trip require user-controlled testing; hosted auth Site URL remains unresolved because the inspected OAuth-server setting may not represent the active managed Auth configuration. No auth settings changed.

Use a disposable approved test account for live plan writes, trade CRUD, review saves, certificate upload/delete/PDF navigation, avatar/profile saves, broker connection and cross-owner rejection. Existing users' records and admin plan overrides were deliberately not used as test data. Admin RPC source gates were checked, not destructive admin actions.

Broad SECURITY DEFINER executable-function linter findings require function-by-function privilege review; do not blanket-revoke or claim all security findings resolved. Avatar bucket remains public as already configured (SELECT policy alone does not make public URLs private); changing visibility requires approval and compatibility review. Legacy journal_entries have no account column/writers and remain unassigned. Legacy weekly/day framework component is currently unmounted; retained to preserve historical data. Large histories exceeding client query limits, webhook ordering/idempotency, complete responsive/dialog/accessibility coverage and signed-URL efficiency across every feature remain follow-up work.

## Changed files
Migration and generated types; `AGENTS.md`, `roadmap.md`; AuthContext, ActiveAccountContext, useAccessState, useProfile, RequireAccess; TradePlanV2 and regression tests, PlanHistoryCalendar, DayDetailsDialog, DashboardOverview, PsychologyScoreCard; AddTradeModal, TradeJournal, TradeDetailDialog; ResetPassword, ForgotPassword, googleAuth; TradingAccountsSection, Certificates, AdminPanel; Dodo webhook and portal source; this report. No global theme-token file changed in this audit.
