import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { admin, syncAccount, createStepLog } from '../_shared/mtSync.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const anon = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: auth } = await anon.auth.getUser();
    const user = auth?.user;
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const db = admin();

    let query = db.from('trading_accounts').select('*').eq('user_id', user.id)
      .not('metaapi_account_id', 'is', null);
    if (typeof body?.account_id === 'string' && body.account_id) {
      query = query.eq('id', body.account_id);
    }
    const { data: rows } = await query;
    if (!rows?.length) return json({ ok: true, synced: 0 });

    const results: Record<string, unknown>[] = [];
    for (const row of rows) {
      const log = createStepLog(row.id);
      log.push('db_saved', 'Account saved to database', 'ok', { detail: row.account_name });
      try {
        const r = await syncAccount(row as never, log);
        results.push({ account_id: row.id, ...r });
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Sync failed';
        console.error(`[mt-sync][${row.id}] failed:`, message);
        await db.from('trading_accounts')
          .update({ status: 'error', sync_error: message }).eq('id', row.id);
        results.push({ account_id: row.id, status: 'error', error: message, steps: log.steps });
      }
    }

    return json({ ok: true, synced: results.length, results });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Sync failed';
    console.error('mt-sync error', message);
    return json({ error: message }, 500);
  }
});
