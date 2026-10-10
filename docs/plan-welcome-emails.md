# Plan activation welcome emails

## Status and rollout prerequisites

This change implements a backend outbox and Resend delivery worker. It has **not**
been deployed to production and no real email was sent during testing.

The two existing Resend templates were corrected and republished with user approval
on 2026-10-10: `USER_FIRST_NAME` (string, fallback `Trader`) replaces the reserved
`FIRST_NAME`. Aliases, sender, reply-to, layout and plan benefits are unchanged.

Two existing source/access issues must be resolved before rollout:

1. GitHub `main` is behind the current Lovable project. Its migration journal stops
   at 0009; the inspected live Lovable history ends at 0020. Apply this feature to
   the current Lovable source, preserving 0010–0020 and newer frontend work. Do not
   deploy this old GitHub checkout wholesale. The webhook file here is based on
   the inspected current Lovable canonical `billing_subscriptions` implementation;
   its feature change is only routing those writes through the event-aware RPC.
2. The deployed `plan_info_for` tests `b IS NOT NULL` on an entire composite row.
   PostgreSQL considers that false when **any** field is null, including optional
   cancellation/trial/portal fields. Thus a real active Dodo row can be reported as
   free. The narrow fix is `ELSIF b.user_id IS NOT NULL THEN`. It changes access
   behavior, so approval was requested and this feature does not silently apply it.
   The regression test documents this existing limitation. Do not enable the
   Dodo welcome rollout until it is resolved and verified with null optional fields.

The current `dodo-sync-subscription` also writes the legacy `subscriptions` table
and profile mirrors, while effective access uses `billing_subscriptions` plus
manual overrides. This feature does not redefine that billing behavior: it only
queues when `plan_info_for` actually changes effective entitlement. Repeated syncs
and profile mirror writes without a real activation send nothing.

## Files

- `supabase/functions/_shared/resend.ts`: backend Resend helper, aliases, safe errors,
  sender/reply-to, name fallback, escaped personalization, stable idempotency header.
- `supabase/functions/_shared/welcome-worker.ts`: leased queue delivery and worker authorization.
- `supabase/functions/send-plan-welcome/index.ts`: service-role-only worker, up to five jobs per call.
- `supabase/functions/dodo-webhook/index.ts`: preserves the current signed-webhook
  mapping and canonical writes, using `apply_dodo_welcome_billing_event` for event IDs.
- `drizzle/migrations/0021_plan_welcome_emails.sql` and the byte-identical
  `supabase/migrations/20261010111500_plan_welcome_emails.sql`: one logical migration;
  apply **one copy**, never both to the same database.
- `scripts/register-welcome-migration.mjs`: append 0021 to the current 0020 journal
  without replacing any existing migration history. Refuses the stale 0009 checkout.
- `supabase/config.toml`: only the new worker's JWT setting is added.
- `supabase/tests/`: isolated PostgreSQL tests, mocked Resend, inspected function fixture.
- `.github/workflows/welcome-email-checks.yml`: backend tests, focused lint/types,
  existing frontend tests/build and browser-bundle email-secret guard.

No frontend email calls, product IDs, prices, auth providers, plan limits or
production user records were changed.

## Activation and deduplication

Before/after triggers observe the **authoritative** effective paid plan. Per-user
transaction locks serialize observations across billing and profile changes.
The outbox commits with the entitlement update; rollback leaves no job. No HTTP
request occurs in the billing transaction. Observer faults emit a generic SQLSTATE
warning and do not fail access updates; alert on `plan_welcome_observer_failed`.

Dodo's signed `webhook-id` is recorded transactionally in a private receipt table,
including events that did not activate access. Retries do not enqueue, even after
an intervening plan change. New events that leave the effective plan unchanged
also do not enqueue. This is email deduplication; it does not add ordering rules to
the existing provider billing logic. The event's ID is attached to its outbox row.

Admin authorization and `admin_set_plan` remain unchanged. A successful real
transition gets a new activation UUID; the existing audit ID is attached in that
same transaction. Same-plan saves have no transition, so no job. Removing or
expiring an override and later genuinely reactivating can create a new UUID.
Internal access is never treated as a paid activation.

The worker claims jobs with `FOR UPDATE SKIP LOCKED` and a two-minute lease token.
Resend receives `Idempotency-Key: plan-welcome/<activation UUID>`. Recipient and
name are immutable snapshots; retries send the same payload. Failed sends preserve
access and record only safe codes. Transient failures retry with backoff. Permanent
failures remain `failed`; ambiguous attempts older than 23 hours become
`manual_review`, since Resend's idempotency cache expires after 24 hours. Never
blindly reset old attempts: reconcile with Resend first. `sent` means accepted by
Resend, not verified inbox delivery.

Unattempted activations superseded by a newer activation or canceled access are
skipped. An already attempted job keeps its stable key so an ambiguous acceptance
can be reconciled. The outbox is not selectable/writable by anon/authenticated;
only the service role can call claim/finish. The private receipt/capture tables
are not exposed through the API. No existing-user backfill runs.

## Deploy without Lovable generation credits

1. Resolve the two rollout prerequisites above. Merge these files into the current
   source checkout. For Drizzle, run `node scripts/register-welcome-migration.mjs`
   against its intact 0020 journal. Apply 0021 once via the project's established
   migration runner. The Supabase copy is available for projects using that runner;
   do not blindly `db push` all historical files against a different project.
   The local CLI migration command was attempted but Windows denied its config
   directory; the timestamped mirror was created manually and verified byte-for-byte.
2. In the **actual serving project's** Supabase Edge Function Secrets (or Lovable
   Cloud Secrets), set `RESEND_API_KEY` to an existing sending key. Reuse it if already
   present. This implementation never retrieves or commits its value. The connector
   credential is not automatically an Edge Function environment variable. Backend
   `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied by Supabase.
3. Deploy `send-plan-welcome`, then the current `dodo-webhook`, explicitly targeting
   that project. Do not deploy old auth configuration or switch database connections.
   Keep worker JWT verification enabled; the handler additionally requires the
   exact service-role bearer token, not a normal user JWT. No public CORS is enabled.
4. Schedule a server-side POST to `/functions/v1/send-plan-welcome` every minute,
   using the service-role JWT stored in a backend scheduler secret. Do not embed it
   in frontend code, a query string, SQL source, shell history, or git.
   Supabase Cron + pg_net can use Vault entries rather than literal secrets:

   ```sql
   -- Configure these Vault values privately in the dashboard first:
   -- plan_welcome_project_url, plan_welcome_service_role_jwt
   select cron.schedule('send-plan-welcome', '* * * * *', $job$
     select net.http_post(
       url := (select decrypted_secret from vault.decrypted_secrets
               where name = 'plan_welcome_project_url') || '/functions/v1/send-plan-welcome',
       headers := jsonb_build_object('Content-Type', 'application/json',
         'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
          where name = 'plan_welcome_service_role_jwt')),
       body := '{}'::jsonb,
       timeout_milliseconds := 90000
     );
   $job$);
   ```

5. Verify grants/RLS, zero unexpected pending jobs and worker configuration. Use
   mocks/local fixtures first; do not create fake production users or alter real
   plans. Observe the next genuine activation and its outbox state. Diagnose using
   counts/status/error codes rather than logging recipient data or provider bodies.
   Pause the scheduler to stop delivery without affecting billing.

## Validation

Local PostgreSQL tests use PGlite and the inspected deployed function definitions,
with no network provider calls. Install/run from `supabase/tests`:

```sh
npm ci
npm test
```

The tests cover activation/upgrade/downgrade/reactivation, duplicate provider IDs,
same-plan saves, masked overrides, retries/leases/expiry, rollback, safe failures,
admin authorization and strict grants. They do not prove concurrent throughput on
the hosted database or real inbox delivery. Tests deliberately preserve and expose
the existing nullable-row entitlement bug until its correction is approved.

All 20 local PostgreSQL/helper tests and focused TypeScript/lint checks pass.
Full `npm run build` and `npm run test`
were attempted but this Windows environment denied esbuild child-process creation
(`spawn EPERM`). Full lint reports existing unrelated errors; no new helper/worker
lint errors were found. The GitHub clean-runner checks passed the backend tests,
existing frontend tests, build, focused lint/types and browser-bundle guard.

Official API references: [Resend templates](https://resend.com/docs/dashboard/templates/introduction),
[variables](https://resend.com/docs/dashboard/templates/template-variables),
[idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys),
[scheduled functions](https://supabase.com/docs/guides/functions/schedule-functions).
