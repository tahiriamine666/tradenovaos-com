# Trader invitations — review and release checklist

Status: implementation prepared for review; NOT deployed or production verified.

## Source and scope

- Developed against a fresh download of Lovable project `0ee4a120-abbf-401b-9623-1114b47e7fda` on 2026-10-17 (`tradenovaos (3).zip`). A ZIP does not preserve Git ancestry.
- Export SHA-256: `66a0271956e0540e3a31302aa9e976fdcdba456ef9bd5270c439621677c6e03d`.
- GitHub `lovable-sync` was independently verified at `d4673d60a6d4d385823aa06270d43c47634a765e`.
- The dedicated PR is based on that existing GitHub history. Only the invitation route/wrapper, Admin Users mount and new function configuration were applied to existing files. New feature files match the fresh-export implementation. No wholesale App/config replacement or synchronization-setting change.
- Lovable is currently disconnected from the existing repository. The PR is not visible in Lovable Preview. Newer unrelated Lovable files are neither replaced nor represented as synchronized by this PR.
- No production database actions, actual invitations, credential reads, subscription changes, function deployment, merge, publishing or Lovable AI requests occurred.

## Included behavior

Admin Users includes invitation creation (Pro/Elite; 7/30/90/365 days after acceptance or fixed custom expiration; reason and internal notes), email search, status filtering, details, resend and confirmed revocation. The table shows the latest 500 search matches. Link lifetime is seven days or the custom access expiry, whichever is earlier. Resend rotates the token without extending expiry, with a five-minute cooldown.

The public, noindex acceptance page uses the existing AuthContext and managed Google helper. It checks the server before granting access. It preserves a validated token in sessionStorage for the OAuth return in the same browser tab; tokens are removed from the URL fragment. Email confirmation in another tab may require reopening the original invitation link. Cancellation clears the handoff. Password recovery is excluded from continuation, and account creation uses the existing password requirements.

New and existing accounts can redeem after email verification. Active paid subscriptions, existing independent manual overrides and internal access are not replaced: the administrator must review those conflicts. Preset durations begin at acceptance; custom dates are fixed. No billing rows are inserted or changed. Expiration uses existing `plan_info_for` behavior, with no scheduler needed.

## Security design

- 32 cryptographically random bytes; SHA-256 hashes only in the database. No raw token in admin responses, audit records or logs. Internal notes never enter email content.
- Edge Function validates JWTs with `auth.getUser`; request-supplied identities/roles are ignored. The database rechecks administrator membership for every admin operation and issuer membership at redemption.
- Management/redemption RPCs are executable only by service_role. Private tables have RLS enabled and no direct client grants/policies. Private override helpers have no client/service execute grants.
- Existing audited override bodies are extracted into private helpers, and existing public admin RPC signatures and grants remain intact. No JWT impersonation or permission-trigger bypass is added. A migration preflight fingerprint rejects unexpected newer admin function bodies rather than overwriting them.
- Row locks, per-actor/email advisory locks and an open-email unique index protect redemption/duplicates. Same-recipient retries return success without extending access or re-running activation; other identities and revoked links are rejected.
- Database rate limits: 30 send/create attempts per administrator per hour and 20 redemption attempts per authenticated user per hour. Attempts are recorded before expected validation failures. Inactive actors' rate rows can be removed by a later maintenance policy; they are not needed beyond one day.
- Revocation removes an override only if the user, plan, grant timestamp and expiry still match this invitation. Later manual grants and paid billing rows remain intact.
- The existing welcome-email outbox/audit linkage remains active. Redemption does not add a second welcome-email sending path.
- Resend receives a stable per-token idempotency key. No automatic durable invitation retry is implemented because raw tokens are not retained. A failed/ambiguous delivery remains pending; an administrator can resend, invalidating the previous token. Do not interpret a successful provider API response as proof of mailbox delivery.

## Validation

Fresh Lovable source with cached dependencies:
- 140 frontend tests across 25 files passed.
- 9 backend transport tests passed.
- 38 isolated PostgreSQL/PGlite checks passed, loading the actual 0016 and 0021 functions/triggers over synthetic local tables. Includes role denial, email mismatch/unverified ownership, duplicates, token rotation/expiry/replay, override expiry/revocation, later-grant preservation, billing isolation, welcome deduplication, rate limits and rollback after an injected late audit failure.
- PGlite is a single-connection test environment; multi-connection contention and real hosted Auth/PostgREST/OAuth callbacks still require staging verification.
- Deno check passed for `supabase/functions/trader-invitations/index.ts` including remote SDK types.
- New/changed TypeScript files passed targeted ESLint with no errors or warnings.
- TypeScript passes with existing test environment requirements supplied: `--lib ES2022,DOM,DOM.Iterable --types node`. The unchanged standard app tsconfig has five baseline test errors: three uses of `.at` with ES2020 libs and two missing node:fs declarations.
- Production Vite build passed (3934 modules); existing large-chunk warning remains.
- Cached tooling is Vite 6.4.4 / Vitest 4.1.11 / TypeScript 5.8.3, not the manifest's Vite 5 / Vitest 3. A clean GitHub install was attempted and failed because the pre-existing root package-lock omits drizzle-kit, drizzle-orm, postgres and transitive entries. This PR does not rewrite unrelated root dependencies.
- Browser/mobile screenshots, actual email delivery and live Google/email signup were not verified. No production test invitations were sent.

The separately reconciled GitHub PR tree also passed 118 frontend tests in 20 files, all 9 backend transport tests, the supplemental TypeScript check above, and its production build (3913 modules). The different test counts reflect unrelated newer Lovable source, which was not overwritten or wholesale copied into GitHub. Both builds used the disclosed cached dependencies. Existing CI does not run on this draft PR's target branch; no green CI result is claimed.

Commands:

```sh
npm ci
npm test -- --maxWorkers=1
npx vitest run --config vitest.invitations.config.ts
npx tsc --noEmit -p tsconfig.app.json --lib ES2022,DOM,DOM.Iterable --types node
npm run build
cd tests/invitations-db && npm ci && npm test
# From repository root:
deno check supabase/functions/trader-invitations/index.ts
```

The database test package has its own pinned PGlite dependency and lockfile; it adds no application runtime dependency. `PGLITE_MODULE` may optionally point to a local installed PGlite module for offline validation.

## Required release steps — approval required, none executed

1. Reconcile the existing GitHub/Lovable connection and root lockfile in the established integration workflow. Re-run clean CI on the final source, with no unrelated overwrites. Do not publish this GitHub tree over newer Lovable changes.
2. Confirm the actual live Lovable backend identity. Do NOT infer it from the stale project_id in config.toml. Verify its current canonical admin/plan functions and deployed migration 0021. The SQL fingerprint guard must pass; if it does not, reconcile the helper extraction against those current functions rather than deleting the guard.
3. Generate a migration using `supabase migration new trader_invitations` in the correct deployment project, and copy `docs/sql/trader-invitations.sql` into the generated file. The local CLI could not initialize `C:\Users\PC\.supabase` (EPERM even after a permission request); no migration filename was fabricated. Apply to an isolated staging database first. Review grants/RLS and run advisor checks there.
4. Configure/reuse backend-only `RESEND_API_KEY`, and verify `hello@tradenovaos.com` is authorized in Resend. Never use a VITE secret. Existing Supabase service key stays backend-only. No secret values are included here.
5. Deploy only `trader-invitations` with JWT verification enabled to staging. Check that its service key belongs to the same backend used by the web app. Verify the canonical `https://tradenovaos.com/accept-invitation` route; for isolated testing use an approved staging link origin instead of sending production links to testers.
6. With explicit approval and designated disposable recipients, test new/existing-account Google and email signup, verification in another tab, wrong-email denial, resend, email preview, expiry, revocation, navigation and mobile layout. Verify ordinary users cannot access management RPCs or profile billing fields. Check that OAuth/root redirect behavior remains unchanged without a pending invitation.
7. Run a true multi-connection redemption/creation race test in staging. Confirm one grant/outbox activation and no billing row changes. Resolve the existing nullable-record `b IS NOT NULL` behavior in `plan_info_for` separately if staging confirms it affects paid-plan lookup; invitations independently guard paid rows so they do not overwrite that access.
8. Only after review and explicit production approval: apply the reviewed migration, deploy the function, publish the web changes, then perform approved smoke tests. Keep existing migrations/data and provider credentials intact.

Rollback: disable/remove the new admin UI entry and function access first. Do not drop invitation/audit records or blindly revert grants. Use the audited revoke action for any invitation-owned access and preserve later overrides/paid subscriptions. Restoring original canonical RPC definitions requires a reviewed forward migration.
