import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('legacy admin estimates use current offer cents, preserve history and reject non-admins', async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$
        SELECT '00000000-0000-4000-8000-000000000001'::uuid $$;
      CREATE TABLE public.admin_users(id uuid PRIMARY KEY);
      CREATE FUNCTION public.is_admin(id uuid) RETURNS boolean LANGUAGE sql AS $$
        SELECT EXISTS(SELECT 1 FROM public.admin_users WHERE admin_users.id = $1) $$;
      CREATE TABLE public.profiles(id uuid PRIMARY KEY, plan_type text,
        subscription_status text, created_at timestamptz DEFAULT now());
      CREATE TABLE public.trades(user_id uuid, created_at timestamptz DEFAULT now());
      CREATE TABLE public.journal_entries(created_at timestamptz DEFAULT now());
      CREATE TABLE public.playbooks(id uuid);
      CREATE TABLE public.support_messages(status text);
      CREATE TABLE public.upgrade_requests(status text);
      CREATE TABLE public.billing_subscriptions(user_id uuid, historical_amount numeric);
    `);
    const analytics = readFileSync(new URL('../migrations/20260514011825_79d33695-621b-4a32-970c-3b44f29227e4.sql', import.meta.url), 'utf8');
    const stats = readFileSync(new URL('../migrations/20260513200540_b2d13b9f-7f83-4478-82d3-3875596c4267.sql', import.meta.url), 'utf8');
    await db.exec(analytics.slice(analytics.indexOf('CREATE OR REPLACE FUNCTION public.get_admin_analytics')));
    await db.exec(stats.slice(0, stats.indexOf('CREATE OR REPLACE FUNCTION public.get_admin_users_list')));
    await db.exec(readFileSync(new URL('../../drizzle/migrations/0024_legacy_admin_current_offer_prices.sql', import.meta.url), 'utf8'));
    await assert.rejects(db.query('SELECT public.get_admin_analytics(30)'), /Admin access required/);
    await assert.rejects(db.query('SELECT public.get_admin_stats()'), /Admin access required/);
    await db.exec(`INSERT INTO admin_users VALUES('00000000-0000-4000-8000-000000000001');
      INSERT INTO profiles VALUES('00000000-0000-4000-8000-000000000001','pro','active',now());
      INSERT INTO billing_subscriptions VALUES('00000000-0000-4000-8000-000000000001',14.00);`);
    let a = (await db.query('SELECT public.get_admin_analytics(30) AS value')).rows[0].value;
    let s = (await db.query('SELECT public.get_admin_stats() AS value')).rows[0].value;
    assert.equal(a.mrr, 5.99);
    assert.equal(s.mrr_estimate, 5.99);
    await db.exec("UPDATE profiles SET plan_type='elite';");
    a = (await db.query('SELECT public.get_admin_analytics(30) AS value')).rows[0].value;
    s = (await db.query('SELECT public.get_admin_stats() AS value')).rows[0].value;
    assert.equal(a.mrr, 9.99);
    assert.equal(s.mrr_estimate, 9.99);
    assert.equal((await db.query('SELECT historical_amount FROM billing_subscriptions')).rows[0].historical_amount, '14.00');
  } finally { await db.close(); }
});