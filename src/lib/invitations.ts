import { supabase } from '@/integrations/supabase/client';

export interface TraderInvitation {
  id: string; email: string; plan: 'pro' | 'elite'; reason: string; notes: string | null;
  status: 'pending' | 'sent' | 'accepted' | 'expired' | 'revoked';
  created_at: string; expires_at: string; duration_days: number | null;
  access_expires_at: string | null; accepted_at: string | null; delivery_error: string | null;
}
export const INVITATION_SESSION_KEY = 'tradeos-pending-invitation';
export const invitationMessages: Record<string, string> = {
  admin_required: 'Administrator access is required.', rate_limited: 'Too many attempts. Please try again in an hour.',
  invitation_already_exists: 'An open invitation or active invitation grant already exists for this address.',
  resend_cooldown: 'Please wait five minutes before resending.',
  invitation_not_resendable: 'This invitation can no longer be resent. Create a new invitation if appropriate.',
  verified_email_required: 'Verify your email, then sign in again and reopen the invitation link.',
  invited_email_required: 'Sign in using the email address that received this invitation.',
  invitation_expired_or_used: 'This invitation has expired or been revoked. Ask the administrator for a new one.',
  existing_access_requires_admin_review: 'Your account already has access. Contact the administrator so your current plan is preserved.',
  issuer_no_longer_authorized: 'The invitation needs approval from a current administrator.',
  profile_not_ready: 'Your account is still being prepared. Please retry shortly.',
  invalid_invitation: 'The invitation is invalid. Check the original email link.',
  email_not_configured: 'Invitation saved, but email sending is not configured. Configure the backend and resend.',
};
export interface InvitationResponse {
  invitations?: TraderInvitation[]; invitation?: TraderInvitation; accepted?: boolean;
  already_accepted?: boolean; sent?: boolean; warning?: string; error?: string;
}
export async function invitationRequest(body: Record<string, unknown>): Promise<InvitationResponse> {
  const { data, error } = await supabase.functions.invoke<InvitationResponse>('trader-invitations', { body });
  if (error || !data) throw new Error('The invitation service is unavailable. Please retry.');
  if (data.error) throw new Error(invitationMessages[data.error] ?? 'The invitation could not be processed. Check the details and retry.');
  return data;
}
export function readPendingInvitation(): string | null {
  try {
    const raw = sessionStorage.getItem(INVITATION_SESSION_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.token === 'string' && /^[a-f0-9]{64}$/.test(data.token) &&
      typeof data.expires === 'number' && data.expires > Date.now() && data.expires <= Date.now() + 7 * 86400000) return data.token;
    sessionStorage.removeItem(INVITATION_SESSION_KEY);
  } catch { /* Storage may be unavailable; the original email link remains usable. */ }
  return null;
}
export function rememberInvitation(token: string): boolean {
  if (!/^[a-f0-9]{64}$/.test(token)) return false;
  try { sessionStorage.setItem(INVITATION_SESSION_KEY, JSON.stringify({ token, expires: Date.now() + 7 * 86400000 })); return true; }
  catch { return false; }
}
export function forgetInvitation() {
  try { sessionStorage.removeItem(INVITATION_SESSION_KEY); } catch { /* No persistent fallback. */ }
}
