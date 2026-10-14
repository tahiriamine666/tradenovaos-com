# PR #9 release readiness — 14 October 2026

**Decision: NOT READY TO MERGE.** No merge, publish, Edge Function deployment, production migration, live data mutation or Lovable AI credits were used.

## Verified source and history
GitHub API reconfirmed main at b093ba134f14434ccbe893bbe1d5792bea474224 and lovable-sync at 20e060df9ccff3cbdc8cb6c33b8a503c93a43a3c. Neither advanced since the previous audit. Integration branch: integration/lovable-main-20261014, targeting main. Both source commits are ancestors of the local integration history (git merge-base exit 0 for each). The real merge 674cf7457d5854b806e45c92af840b3788af0d63 and existing timestamped backup branches remain preserved. No additional backup was needed.

Local network fetch now fails with "getaddrinfo() thread failed to start"; remote source tips and PR metadata were verified through the GitHub connector instead. The local checkout is not claimed fully synchronized with the latest documentation-only commit. GitHub remains authoritative. All remote updates use expected-head checks and fast-forward commits.

## Confirmed security fixes in this phase
- Added backend-only MT5_AUTO_SYNC_ENABLED, enabled only by exact server environment value true; missing/malformed/unreadable values fail closed.
- mt-connect and mt-sync return 503 before request-body parsing, auth/database clients, account reads, credential decryption or MetaApi calls while disabled. Cron uses the same gate. OPTIONS remains available.
- Shared sync and MetaApi token paths also reject direct invocation while disabled. Existing auth and ownership checks remain intact when the flag is enabled. No ordinary-user flag-setting endpoint exists.
- Prepared additive migration 0027_atomic_nova_credits.sql: the previous read-then-increment quota could exceed its cap on simultaneous requests. Conditional UPSERT now enforces the cap under the row lock. Anonymous execute privilege is explicitly revoked from PUBLIC and anon. Existing counts are not rewritten.
- Added isolated tests for disabled user/anonymous/cron calls, untouched request bodies, zero side effects, shared-function bypass, malformed flags, quota cap, zero entitlement, unauthenticated rejection and execute grants.
- Added an independent failing ESLint CI gate and uploaded its machine-readable report. No rule was disabled.

The migration is registered for review but **not applied**. MT guards are committed but **not deployed**. Therefore no assertion is made that production endpoints or live quotas have changed.

## Dependency review
See dependency-security-review.md for all 21 original package entries, exact installed versions, affected ranges, dependency paths and exploitability assessments.
- Original: 2 critical / 7 high / 12 moderate.
- After earlier compatible remediation, reconfirmed in this phase: 0 critical / 5 high / 11 moderate.
- Backend isolated-test dependency install reports zero vulnerabilities.
- Five high entries inherit the same braces <=3.0.3 recursive stack-exhaustion issue. Official advisory still lists no patched release: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm
- Tailwind, its watcher/glob chain and typography are used; Drizzle Kit is referenced by drizzle.config.ts and the migration workflow, so removal is not safe merely to reduce audit counts.
- A local fork/depth patch would require maintaining and validating parser/compile/expand behavior; changing its name/version to evade npm audit would hide rather than resolve evidence. No such substitution was made.
- React Router 6 is production browser code. No attacker-controlled destination was identified, and SSR hydration is absent. Router 7 / Tailwind 4 migrations or cross-major selector-parser overrides require separate compatibility work.
- Mitigation: trusted build inputs, no public dev server, isolated least-privilege CI without production secrets. Static production assets do not execute the affected compiler/test tools. Residual developer/CI denial-of-service risk remains; audit is intentionally failing.

## Feature preservation and security review boundaries
No production frontend source changed in this phase: managed Google OAuth, email/password/session/recovery, inline Dashboard layout, widget persistence, Journal, Analytics, Trading Calendar, Daily/Weekly plans, pair/account scoping, Main Idea, historical scenarios, risk tools, vault/certificates, economic calendar, native billing and the Coming Soon UI remain the latest Lovable implementations.
- StudioSettings renders Mt5ComingSoon with frontend flag false.
- googleAuth uses Lovable managed OAuth; recovery remains session-validated.
- NOVA uses verified caller claims, caller JWT/RLS, explicit user filters and server-side credit consumption.
- Dodo portal derives the customer from the verified user's billing row. Webhook verifies raw-body HMAC and five-minute timestamp tolerance before mutation. Existing deduplication/admin ownership tests pass.
- Migration 0026 retains encrypted broker secrets, RLS with no ordinary-user secret access and service-only password RPC grants.
- Secret-pattern scan found no high-confidence private-key/GitHub-token/live-key matches in tracked source. This is not a complete historical secret audit.
- Broader live RLS/SECURITY DEFINER privilege verification, real OAuth/signup/reset round trips, mobile visual checks and real provider callback smoke tests were not performed. They remain release verification items; unit tests are not represented as live end-to-end tests.
- Existing test documents a canonical billing NULL-end-date limitation. This was not changed without confirmed provider semantics; review before a new billing rollout.

## Actual validation
Code/security commit: 2358add03148d6a2a947d3043296d0c5af89b610.
CI: https://github.com/tahiriamine666/tradenovaos-com/actions/runs/38560255157
- npm ci: PASS.
- TypeScript: PASS.
- Frontend: 109 tests / 17 files PASS.
- Backend: 34 tests PASS (28 existing + 5 MT lockdown + 1 quota test).
- Production build: PASS, 16.27 seconds.
- npm audit: FAIL, 16 findings.
- ESLint: FAIL, 226 errors / 60 warnings. Rule totals: 216 no-explicit-any, 55 refresh-export warnings, 4 useless escapes, 4 hook-dependency warnings, 2 empty-object types, 2 require imports, 1 prefer-const, 1 empty block, 1 parsing/unclassified diagnostic. See integration-eslint-report artifact. Broad application typing/lint debt was not suppressed or mechanically rewritten.
- GitHub CI: failing lint and dependency security gates. No test assertions were weakened.

## Release blockers and future procedure
Keep PR draft. Resolve or formally review remaining dependency risk without bypassing checks, address ESLint failures, complete isolated multi-connection PostgreSQL concurrency testing and environment-specific auth/mobile/RLS smoke tests. The PGlite quota test proves functional limits but does not emulate separate PostgreSQL connections; atomicity is implemented by the conditional UPSERT.

Only after gates pass and the owner approves: refresh branch tips, preserve any newer Lovable changes using normal merges, confirm both source ancestries, then use GitHub **Create a merge commit** (never squash/rebase). Do not automatically deploy registered migrations or functions.

After that approved merge: verify Lovable imports the merge SHA and matches critical auth/calendar files. In a controlled nonproduction workflow, make a harmless documentation canary change from GitHub and verify it appears in Lovable; make a separate harmless code-editor documentation change in Lovable and verify its new commit appears in GitHub. Preserve both commits and verify neither branch diverges. Two-way synchronization is **not yet proven**.

MT5 future activation requires founder approval, credential/security review, controlled tests and separate approved deployment; only then may an authorized deployment administrator set MT5_AUTO_SYNC_ENABLED=true and separately enable the UI. Leave absent/false now. The new quota migration likewise requires a separately approved production migration step.
