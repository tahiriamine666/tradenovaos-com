import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';

test('atomic NOVA quota cannot increment past its cap; denied calls do not mutate usage', async () => {
  const db = new PGlite();
  try {
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULLIF(current_setting('test.uid',true),'')::uuid $$;
      CREATE TABLE nova_usage(user_id uuid,period_start date,credits_used int,updated_at timestamptz DEFAULT now(), PRIMARY KEY(user_id,period_start));
      CREATE FUNCTION get_nova_usage() RETURNS jsonb LANGUAGE sql AS $$ SELECT jsonb_build_object('limit',COALESCE(NULLIF(current_setting('test.limit',true),'')::int,0),'period_start','2026-10-01','used',COALESCE((SELECT credits_used FROM nova_usage WHERE user_id=auth.uid()),0)) $$;
      SELECT set_config('test.uid','00000000-0000-4000-8000-000000000001',false);
      SELECT set_config('test.limit','2',false);`);
    await db.exec(readFileSync(new URL('../../drizzle/migrations/0027_atomic_nova_credits.sql', import.meta.url), 'utf8'));
    const results = await Promise.all(Array.from({ length: 8 }, () => db.query('SELECT consume_nova_credit() AS result')));
    assert.equal(results.filter(r => r.rows[0].result.allowed).length, 2);
    assert.equal((await db.query('SELECT credits_used FROM nova_usage')).rows[0].credits_used, 2);
    await db.exec("SELECT set_config('test.uid','00000000-0000-4000-8000-000000000002',false); SELECT set_config('test.limit','0',false);");
    assert.equal((await db.query('SELECT consume_nova_credit() AS result')).rows[0].result.allowed, false);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM nova_usage')).rows[0].n, 1);
    await db.exec("SELECT set_config('test.uid','',false)");
    await assert.rejects(db.query('SELECT consume_nova_credit()'), /not authenticated/);
    const grants = (await db.query("SELECT has_function_privilege('anon','consume_nova_credit()','EXECUTE') AS anon, has_function_privilege('authenticated','consume_nova_credit()','EXECUTE') AS authenticated")).rows[0];
    assert.deepEqual(grants, { anon: false, authenticated: true });
  } finally { await db.close(); }
});
