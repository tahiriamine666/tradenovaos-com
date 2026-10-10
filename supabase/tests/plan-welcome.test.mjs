import { before, after, beforeEach, afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { resolveFirstName, sendPlanWelcome, welcomePayload } from '../functions/_shared/resend.ts';
import { deliverWelcomeBatch, workerAuthorized } from '../functions/_shared/welcome-worker.ts';

// A local, in-memory PostgreSQL instance. No production connections or email sends.
const db = new PGlite();
const uid = '00000000-0000-4000-8000-000000000001';
const admin = '00000000-0000-4000-8000-000000000002';
const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
const outbox = () => rows('SELECT * FROM public.plan_welcome_emails ORDER BY activation_no');
const activate = (plan, status = 'active') => db.query(`
  INSERT INTO billing_subscriptions(user_id, plan, status, provider, subscription_id)
  VALUES ($1, $2, $3, 'dodo', 'sub_test') ON CONFLICT(user_id)
  DO UPDATE SET plan = EXCLUDED.plan, status = EXCLUDED.status, updated_at = now()`, [uid, plan, status]);
const adminPlan = (plan) => db.query('SELECT public.admin_set_plan($1, $2)', [uid, plan]);
const event = (id, plan, status = 'active', statusOnly = false) => db.query(
  'SELECT public.apply_dodo_welcome_billing_event($1,$2,$3,$4)', [id, uid, {
    plan, status, customer_id: 'test-customer', subscription_id: 'sub_test', variant_id: 'test-product',
    trial_ends_at: '2099-01-01T00:00:00Z', renews_at: '2099-02-01T00:00:00Z',
    ends_at: '2099-12-01T00:00:00Z', updated_at: '2026-10-10T00:00:00Z',
  }, statusOnly]);
const claim = async () => (await rows('SELECT * FROM public.claim_plan_welcome_email()'))[0] ?? null;
const queue = {
  claim,
  async finish(job, result) {
    const [r] = await rows('SELECT public.finish_plan_welcome_email($1,$2,$3,$4,$5) AS ok',
      [job.id, job.lease_token, result.ok ? result.id : null, result.ok ? null : result.error, !result.ok && result.retryable]);
    return r.ok;
  },
};
const sent = [];
const mocked = {
  getSecret: () => 'test-only-not-a-real-key',
  async fetch(url, init) {
    assert.equal(url, 'https://api.resend.com/emails');
    sent.push({ payload: JSON.parse(init.body), key: init.headers['Idempotency-Key'] });
    return Response.json({ id: 'test-message-id' });
  },
};
const deliver = (dependencies = mocked) => deliverWelcomeBatch(queue, dependencies, async () => {});

before(async () => {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY, email text);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
      SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
    CREATE TABLE profiles(id uuid PRIMARY KEY REFERENCES auth.users, email text,
      display_name text, full_name text, plan_type text DEFAULT 'free', subscription_plan text,
      subscription_status text DEFAULT 'inactive', trial_ends_at timestamptz, current_period_end timestamptz,
      upgraded_manually boolean DEFAULT false, upgraded_at timestamptz,
      manual_override_expires_at timestamptz, updated_at timestamptz);
    CREATE TABLE billing_subscriptions(user_id uuid PRIMARY KEY REFERENCES auth.users, plan text,
      status text, provider text, customer_id text DEFAULT 'test-customer', subscription_id text,
      variant_id text DEFAULT 'test-product',
      trial_ends_at timestamptz DEFAULT now() + interval '14 days',
      renews_at timestamptz DEFAULT now() + interval '1 month',
      ends_at timestamptz DEFAULT now() + interval '1 year', updated_at timestamptz DEFAULT now());
    CREATE TABLE admin_audit_log(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), admin_id uuid,
      admin_email text, target_user_id uuid, target_email text, action text, old_value jsonb,
      new_value jsonb, reason text);
    CREATE FUNCTION public.has_internal_access(id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT COALESCE(current_setting('test.internal', true), '') = id::text $$;
    CREATE FUNCTION public.is_admin(id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
      SELECT id = '${admin}'::uuid $$;
  `);
  await db.exec(readFileSync(new URL('./fixtures/deployed-plan-functions.sql', import.meta.url), 'utf8'));
  await db.exec(readFileSync(new URL('../../drizzle/migrations/0021_plan_welcome_emails.sql', import.meta.url), 'utf8'));
});
beforeEach(async () => {
  sent.length = 0;
  await db.exec('BEGIN');
  await db.query("SELECT set_config('test.uid', $1, true)", [admin]);
  await db.query('INSERT INTO auth.users VALUES ($1, $2), ($3, $4)',
    [uid, 'trader@example.test', admin, 'admin@example.test']);
  await db.query('INSERT INTO profiles(id,email,display_name) VALUES($1,$2,$3)', [uid, 'trader@example.test', 'Ada Trader']);
});
afterEach(() => db.exec('ROLLBACK'));
after(() => db.close());

test('free → Pro sends once; duplicate Dodo upserts, renewal and repeated profile sync send none', async () => {
  await activate('pro');
  assert.equal((await outbox()).length, 1);
  await deliver();
  await activate('pro');
  await db.query('UPDATE billing_subscriptions SET renews_at = now() + interval \'1 month\' WHERE user_id=$1', [uid]);
  await db.query("UPDATE profiles SET plan_type='pro', subscription_status='active' WHERE id=$1", [uid]);
  await deliver();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].payload.template.id, 'tradenova-pro-welcome');
  assert.equal(sent[0].payload.template.variables.USER_FIRST_NAME, 'Ada');
  assert.equal((await outbox())[0].status, 'sent');
});
test('free → Elite trial sends one Elite email', async () => {
  await activate('elite', 'trialing');
  await deliver();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].payload.template.id, 'tradenova-elite-welcome');
});
test('Pro → Elite and intentional Elite → Pro each send their matching template', async () => {
  await activate('pro'); await deliver();
  await activate('elite'); await deliver();
  await activate('pro'); await deliver();
  assert.deepEqual(sent.map(x => x.payload.template.id), ['tradenova-pro-welcome', 'tradenova-elite-welcome', 'tradenova-pro-welcome']);
  assert.equal(new Set(sent.map(x => x.key)).size, 3);
});
test('verified provider event replay after an intervening plan change sends no extra email', async () => {
  await event('event-a', 'pro'); await deliver();
  await event('event-b', 'elite'); await deliver();
  await event('event-a', 'pro'); await deliver();
  assert.equal(sent.length, 2);
  assert.deepEqual((await outbox()).map(x => x.source_event_id), ['event-a', 'event-b']);
  assert.equal((await rows('SELECT count(*)::int AS n FROM tradenova_private.plan_welcome_dodo_events'))[0].n, 2);
});
test('payment renewal does not send; genuine failed-payment recovery activates once', async () => {
  await event('start', 'pro'); await deliver();
  await event('renewal', 'pro', 'active', true); await deliver();
  assert.equal(sent.length, 1);
  await event('failed', 'pro', 'past_due', true); await deliver();
  await event('recovered', 'pro', 'active', true); await deliver();
  await event('recovered', 'pro', 'active', true); await deliver();
  assert.equal(sent.length, 2);
});
test('an event observed under a manual override stays suppressed when later replayed', async () => {
  await adminPlan('pro'); await deliver();
  await event('masked', 'elite'); await deliver();
  await db.query("UPDATE profiles SET upgraded_manually=false WHERE id=$1", [uid]);
  await deliver();
  const count = sent.length;
  await event('other', 'pro'); await deliver();
  await event('masked', 'elite'); await deliver();
  assert.equal(sent.length, count + 1);
});
test('admin activation links audit; same-plan save does not repeat; Dodo history stays intact', async () => {
  await adminPlan('pro'); await deliver();
  await adminPlan('pro'); await deliver();
  const jobs = await outbox();
  const audits = await rows('SELECT * FROM admin_audit_log');
  assert.equal(jobs.length, 1);
  assert.equal(sent.length, 1);
  assert.equal(jobs[0].source, 'admin_override');
  assert.equal(jobs[0].source_event_id, audits[0].id);
  assert.equal(audits.length, 2);
  await activate('elite'); await deliver();
  assert.equal(sent.length, 1, 'masked Dodo change is not an effective activation');
  assert.equal((await rows('SELECT plan FROM billing_subscriptions'))[0].plan, 'elite');
});
test('expired manual override can reactivate with a new logical activation', async () => {
  await adminPlan('pro'); await deliver();
  await db.query("UPDATE profiles SET manual_override_expires_at = now() - interval '1 day' WHERE id=$1", [uid]);
  await adminPlan('pro'); await deliver();
  assert.equal(sent.length, 2);
  assert.notEqual(sent[0].key, sent[1].key);
});
test('canceled/inactive/expired trial send none; later reactivation is allowed', async () => {
  await activate('pro', 'canceled'); await deliver();
  assert.equal(sent.length, 0);
  await activate('pro'); await deliver();
  await activate('pro', 'canceled'); await deliver();
  await activate('pro'); await deliver();
  assert.equal(sent.length, 2);
  await activate('elite', 'trialing');
  await db.query("UPDATE billing_subscriptions SET trial_ends_at=now()-interval '1 day' WHERE user_id=$1", [uid]);
  await deliver();
  assert.equal(sent.length, 2);
});
test('internal users and legacy sync without a canonical activation send none', async () => {
  await db.query("UPDATE profiles SET plan_type='elite', subscription_status='active' WHERE id=$1", [uid]);
  assert.equal((await outbox()).length, 0);
  await db.query("SELECT set_config('test.internal', $1, true)", [uid]);
  await activate('elite'); await adminPlan('pro'); await deliver();
  assert.equal(sent.length, 0);
});
test('provider failure leaves entitlement active and records only a safe error', async () => {
  await activate('pro');
  await deliver({ ...mocked, fetch: async () => new Response('private-provider-body', { status: 503 }) });
  const [job] = await outbox();
  assert.equal(job.status, 'failed');
  assert.equal(job.error, 'resend_http_503');
  assert.ok(job.next_attempt_at);
  assert.equal((await rows('SELECT plan_info_for($1) AS p', [uid]))[0].p.is_pro, true);
  await db.query('UPDATE plan_welcome_emails SET next_attempt_at=now()');
  await deliver();
  assert.equal(sent[0].key, `plan-welcome/${job.id}`);
});
test('lease prevents overlapping claims; crash retry reuses the same immutable payload and key', async () => {
  await activate('pro');
  const first = await claim();
  assert.equal(await claim(), null);
  await db.query("UPDATE profiles SET display_name='Changed Name' WHERE id=$1", [uid]);
  await db.query("UPDATE plan_welcome_emails SET lease_until=now()-interval '1 second'");
  const retry = await claim();
  assert.equal(first.id, retry.id);
  assert.equal(retry.first_name, 'Ada');
  assert.notEqual(first.lease_token, retry.lease_token);
  assert.equal(await queue.finish(first, { ok: true, id: 'stale-result' }), false);
  assert.equal(await queue.finish(retry, { ok: true, id: 'final-result' }), true);
});
test('ambiguous attempts older than 23 hours require review and are never resent automatically', async () => {
  await activate('pro'); await claim();
  await db.query("UPDATE plan_welcome_emails SET first_attempt_at=now()-interval '24 hours', lease_until=now()-interval '1 minute'");
  assert.equal(await claim(), null);
  assert.equal((await outbox())[0].status, 'manual_review');
});
test('rollback creates no event; outbox failure cannot roll back paid access', async () => {
  await db.exec('SAVEPOINT activation');
  await activate('pro');
  await db.exec('ROLLBACK TO SAVEPOINT activation');
  assert.equal((await outbox()).length, 0);
  await db.exec("ALTER TABLE plan_welcome_emails ADD CONSTRAINT injected_failure CHECK (false)");
  await activate('pro');
  assert.equal((await rows('SELECT plan_info_for($1) AS p', [uid]))[0].p.is_pro, true);
});
test('ordinary roles cannot read/write outbox, claim sends or bypass admin authorization', async () => {
  const [grants] = await rows(`SELECT
    has_table_privilege('authenticated','public.plan_welcome_emails','SELECT') AS can_read,
    has_table_privilege('authenticated','public.plan_welcome_emails','INSERT') AS can_insert,
    has_function_privilege('authenticated','public.claim_plan_welcome_email()','EXECUTE') AS can_claim,
    has_function_privilege('anon','public.claim_plan_welcome_email()','EXECUTE') AS anon_claim,
    has_function_privilege('service_role','public.claim_plan_welcome_email()','EXECUTE') AS service_claim,
    (SELECT relrowsecurity FROM pg_class WHERE oid='public.plan_welcome_emails'::regclass) AS rls`);
  assert.deepEqual(grants, { can_read: false, can_insert: false, can_claim: false, anon_claim: false, service_claim: true, rls: true });
  await db.query("SELECT set_config('test.uid', $1, true)", [uid]);
  await db.exec('SAVEPOINT unauthorized');
  await assert.rejects(adminPlan('elite'), /Admin access required/);
  await db.exec('ROLLBACK TO SAVEPOINT unauthorized');
  assert.equal((await outbox()).length, 0);
});
test('name resolution and template mapping always provide a nonblank name', () => {
  assert.equal(resolveFirstName({ display_name: ' Ada Trader ', full_name: 'Other Name' }), 'Ada');
  assert.equal(resolveFirstName({ display_name: ' ', full_name: 'Grace Hopper' }), 'Grace');
  assert.equal(resolveFirstName({ email: 'trader@example.test' }), 'trader');
  assert.equal(resolveFirstName({}), 'Trader');
  assert.equal(welcomePayload({ to:'a@example.test', plan:'pro', firstName:'<img>', idempotencyKey:'x' }).template.variables.USER_FIRST_NAME, '&lt;img&gt;');
  assert.equal(welcomePayload({ to:'a@example.test', plan:'elite', firstName:' ', idempotencyKey:'x' }).template.variables.USER_FIRST_NAME, 'Trader');
});
test('existing canonical NULL-field limitation is preserved and must be corrected before Dodo rollout', async () => {
  await activate('pro');
  await db.query('UPDATE billing_subscriptions SET ends_at=NULL WHERE user_id=$1', [uid]);
  assert.equal((await rows('SELECT plan_info_for($1) AS p', [uid]))[0].p.is_pro, false);
  await deliver();
  assert.equal(sent.length, 0, 'never email an activation the application itself denies');
});
test('missing secret, malformed response and network failures return safe results', async () => {
  const email = { to:'a@example.test', plan:'pro', idempotencyKey:'test' };
  assert.equal((await sendPlanWelcome(email, { getSecret: () => undefined })).error, 'resend_not_configured');
  assert.equal((await sendPlanWelcome(email, { ...mocked, fetch: async () => { throw new Error('private'); } })).error, 'resend_network_or_timeout');
  assert.equal((await sendPlanWelcome(email, { ...mocked, fetch: async () => Response.json({}) })).error, 'resend_invalid_response');
  assert.equal((await sendPlanWelcome(email, { ...mocked, fetch: async () => new Response('', { status:422 }) })).retryable, false);
});
test('worker rejects anonymous/user tokens and absent configuration', () => {
  assert.equal(workerAuthorized(null, 'test-service-key'), false);
  assert.equal(workerAuthorized('Bearer user-token', 'test-service-key'), false);
  assert.equal(workerAuthorized('Bearer undefined', undefined), false);
  assert.equal(workerAuthorized('Bearer test-service-key', 'test-service-key'), true);
});
