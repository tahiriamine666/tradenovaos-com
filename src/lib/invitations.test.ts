import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/integrations/supabase/client', () => ({ supabase: { functions: { invoke: vi.fn() } } }));
import { INVITATION_SESSION_KEY, forgetInvitation, readPendingInvitation, rememberInvitation } from './invitations';
describe('invitation handoff storage', () => {
  beforeEach(() => sessionStorage.clear());
  it('keeps only a valid token in this browser tab', () => {
    expect(rememberInvitation('a'.repeat(64))).toBe(true);
    expect(readPendingInvitation()).toBe('a'.repeat(64));
    forgetInvitation(); expect(readPendingInvitation()).toBeNull();
  });
  it('rejects malformed or expired pending invitations', () => {
    expect(rememberInvitation('https://evil.test')).toBe(false);
    sessionStorage.setItem(INVITATION_SESSION_KEY, JSON.stringify({ token: 'a'.repeat(64), expires: Date.now() - 1 }));
    expect(readPendingInvitation()).toBeNull();
    sessionStorage.setItem(INVITATION_SESSION_KEY, '{');
    expect(readPendingInvitation()).toBeNull();
  });
});
