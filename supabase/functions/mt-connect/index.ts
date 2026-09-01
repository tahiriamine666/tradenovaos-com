import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createAccount } from '../_shared/metaapi.ts';
import { admin, syncAccount, createStepLog } from '../_shared/mtSync.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  let log = createStepLog('unknown');

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
    const accountId = typeof body?.account_id === 'string' ? body.account_id : '';
    if (!accountId) return json({ error: 'account_id is required' }, 400);

    log = createStepLog(accountId);

    const db = admin();
    const { data: row, error } = await db
      .from('trading_accounts')
      .select('*')
      .eq('id', accountId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error || !row) {
      log.push('db_saved', 'Account saved to database', 'error', { error: error?.message ?? 'Account not found' });
      return json({ error: 'Account not found', steps: log.steps }, 404);
    }
    log.push('db_saved', 'Account saved to database', 'ok', { detail: row.account_name });

    await db.from('trading_accounts')
      .update({ status: 'connecting', sync_error: null }).eq('id', row.id);

    let metaId: string | null = row.metaapi_account_id;
    if (!metaId) {
      const login = String(row.account_number ?? row.login ?? '');
      const password = String((row.credentials as Record<string, string> | null)?.password ?? row.password ?? '');
      const server = String(row.server ?? '');
      if (!login || !password || !server) {
        log.push('metaapi_account', 'MetaApi account created', 'error', { error: 'Login, investor password and server are required' });
        return json({ error: 'Login, investor password and server are required', steps: log.steps }, 400);
      }
      const created = await createAccount({
        name: `${row.account_name} (${user.id.slice(0, 8)})`,
        login, password, server,
        platform: row.platform === 'mt4' ? 'mt4' : 'mt5',
      });
      metaId = created.id;
      console.log(`[mt-connect][${row.id}] provisioned MetaApi account ${metaId}`);
      await db.from('trading_accounts')
        .update({ metaapi_account_id: metaId }).eq('id', row.id);
    }

    const result = await syncAccount({ ...row, metaapi_account_id: metaId }, log);
    return json({ ok: true, ...result, steps: log.steps });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Connection failed';
    console.error('mt-connect error', message);
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body?.account_id) {
        await admin().from('trading_accounts')
          .update({ status: 'error', sync_error: message })
          .eq('id', body.account_id);
      }
    } catch { /* ignore */ }
    return json({ error: message, steps: log.steps }, 502);
  }
});

