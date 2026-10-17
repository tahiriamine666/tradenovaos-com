// Server-only invitation transport. Database RPCs remain the authority for grants.
import type { SendResult } from './resend.ts';

export interface Invitation {
  id: string; email: string; plan: 'pro' | 'elite'; reason: string; notes: string | null;
  status: 'pending' | 'sent' | 'accepted' | 'expired' | 'revoked';
  created_at: string; expires_at: string; duration_days: number | null;
  access_expires_at: string | null; accepted_at: string | null; delivery_error: string | null;
}
export type RpcResult = { data: unknown; error: { message: string } | null };
export interface InvitationDependencies {
  authenticate: (authorization: string) => Promise<string | null>;
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResult>;
  send: (invitation: Invitation, token: string) => Promise<SendResult>;
}
const actions = new Set(['list', 'create', 'resend', 'revoke', 'redeem']);
export const TOKEN_PATTERN = /^[a-f0-9]{64}$/;
export function makeInvitationToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
}
export async function hashInvitationToken(token: string): Promise<string> {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))), b => b.toString(16).padStart(2, '0')).join('');
}
export function invitationEmail(invite: Invitation, token: string) {
  if (!TOKEN_PATTERN.test(token)) throw new Error('invalid_token');
  const plan = invite.plan === 'elite' ? 'Elite' : 'Pro';
  const duration = invite.duration_days ? `${invite.duration_days} days after acceptance` : `until ${new Date(invite.access_expires_at!).toISOString().slice(0, 10)} (UTC)`;
  // Fragments are not transmitted in HTTP request URLs or Referer headers.
  const url = `https://tradenovaos.com/accept-invitation#invite=${token}`;
  const text = `You are invited to TradeOS ${plan}.\nComplimentary access: ${duration}. No purchase required.\nAccept invitation: ${url}\nThis single-use link expires ${new Date(invite.expires_at).toISOString()} and must be accepted using the invited email address.\nAlready have an account? Sign in with that email. If you did not expect this invitation, ignore it.\nTradeNovaOS · https://tradenovaos.com/privacy`;
  return {
    from: 'TradeOS <hello@tradenovaos.com>', reply_to: 'tradenova111@gmail.com', to: [invite.email],
    subject: `Your invitation to TradeOS ${plan}`, text,
    html: `<div style="background:#08090b;color:#fff;padding:40px;font-family:Arial,sans-serif"><h1>TradeOS</h1><h2>Your next chapter starts here.</h2><p>You have been invited to <strong>${plan}</strong>.</p><p>Complimentary access: ${duration}. No purchase required.</p><p style="margin:32px 0"><a style="background:#1677ff;color:white;padding:14px 24px;border-radius:8px;text-decoration:none" href="${url}">Accept Invitation</a></p><p>Sign in or create an account using the invited email address. This single-use link expires ${new Date(invite.expires_at).toISOString().slice(0, 10)} (UTC).</p><p>If this invitation was unexpected, you can ignore it.</p><a style="color:#9ac3ff" href="https://tradenovaos.com/privacy">Privacy Policy</a></div>`,
  };
}
export async function sendInvitation(invite: Invitation, token: string, apiKey: string | undefined, transport: typeof fetch = fetch): Promise<SendResult> {
  if (!apiKey) return { ok: false, error: 'email_not_configured', retryable: false };
  try {
    const response = await transport('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json',
        'Idempotency-Key': `trader-invitation/${invite.id}/${await hashInvitationToken(token)}` },
      body: JSON.stringify(invitationEmail(invite, token)), signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return { ok: false, error: `email_http_${response.status}`, retryable: response.status === 429 || response.status >= 500 };
    const body: unknown = await response.json();
    return body && typeof body === 'object' && 'id' in body && typeof body.id === 'string'
      ? { ok: true, id: body.id } : { ok: false, error: 'email_response_invalid', retryable: true };
  } catch { return { ok: false, error: 'email_delivery_unconfirmed', retryable: true }; }
}

export function invitationHandler(deps: InvitationDependencies) {
  return async (request: Request): Promise<Response> => {
    const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS' };
    const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return reply({ error: 'method_not_allowed' }, 405);
    try {
      const actor = await deps.authenticate(request.headers.get('Authorization') ?? '');
      if (!actor) return reply({ error: 'sign_in_required' }, 401);
      const raw = await request.text();
      if (raw.length > 8192) return reply({ error: 'request_too_large' }, 413);
      const input: unknown = JSON.parse(raw);
      if (!input || typeof input !== 'object' || !('action' in input) || typeof input.action !== 'string' || !actions.has(input.action)) return reply({ error: 'invalid_action' }, 400);
      const body = input as Record<string, unknown>;
      if (body.action === 'redeem') {
        if (typeof body.token !== 'string' || !TOKEN_PATTERN.test(body.token)) return reply({ error: 'invalid_invitation' }, 400);
        const result = await deps.rpc('redeem_trader_invitation', { p_user_id: actor, p_token_hash: await hashInvitationToken(body.token) });
        if (result.error) return reply({ error: 'redemption_unavailable' }, 503);
        return reply(result.data);
      }
      // Allowlist inputs; actor is always the server-verified user, never the request body.
      const token = body.action === 'create' || body.action === 'resend' ? makeInvitationToken() : null;
      const payload = { id: body.id, email: body.email, plan: body.plan, reason: body.reason, notes: body.notes,
        duration_days: body.duration_days, access_expires_at: body.access_expires_at,
        token_hash: token ? await hashInvitationToken(token) : undefined, search: body.search, status: body.status };
      const result = await deps.rpc('manage_trader_invitation', { p_actor: actor, p_action: body.action, p_payload: payload });
      if (result.error) return reply({ error: 'invitation_operation_unavailable' }, 503);
      const data = result.data as { error?: string; invitation?: Invitation } | null;
      if (token && data?.invitation && !data.error) {
        const delivery = await deps.send(data.invitation, token);
        const marked = await deps.rpc('manage_trader_invitation', { p_actor: actor, p_action: 'delivery', p_payload: {
          id: data.invitation.id, token_hash: payload.token_hash, sent: delivery.ok,
          delivery_error: 'error' in delivery ? delivery.error : null,
        } });
        // Never return tokens or provider response bodies to the administrator.
        return reply({ invitation: data.invitation, sent: delivery.ok,
          warning: marked.error ? 'delivery_status_unconfirmed' : 'error' in delivery ? delivery.error : undefined });
      }
      return reply(result.data);
    } catch { return reply({ error: 'request_failed' }, 400); }
  };
}
