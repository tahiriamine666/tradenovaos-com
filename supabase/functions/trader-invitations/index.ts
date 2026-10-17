import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.105.1';
import { invitationHandler, sendInvitation } from '../_shared/trader-invitations.ts';

const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(invitationHandler({
  async authenticate(authorization) {
    if (!authorization.startsWith('Bearer ')) return null;
    const { data, error } = await service.auth.getUser(authorization.slice(7));
    return error ? null : data.user?.id ?? null;
  },
  rpc: (name, args) => service.rpc(name, args),
  send: (invite, token) => sendInvitation(invite, token, Deno.env.get('RESEND_API_KEY')),
}));
