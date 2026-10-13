import { describe, expect, it } from 'vitest';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { friendlyConnectError, readFunctionResult } from './functionResult';

describe('mt-connect result handling', () => {
  it('recovers the server error and steps from a non-2xx response', async () => {
    const body = { error: 'MetaApi 403: To allow high reliability please top up your account.', steps: [{ id: 'db_saved', status: 'ok' }] };
    const err = new FunctionsHttpError(new Response(JSON.stringify(body), { status: 502 }));
    const r = await readFunctionResult<{ steps?: unknown[] }>(null, err);
    expect(r.error).toContain('MetaApi 403');
    expect(r.steps).toHaveLength(1);
  });
  it('maps the MetaApi top-up 403 to an actionable message', () => {
    expect(friendlyConnectError('MetaApi 403: To allow high reliability please top up your account. (abc)')).toMatch(/topped up/);
    expect(friendlyConnectError('Account not found')).toBe('Account not found');
  });
});
