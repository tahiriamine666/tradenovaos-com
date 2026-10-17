import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { readPendingInvitation } from '@/lib/invitations';

/** Resume only invitation-initiated sign-ins; normal and recovery flows are untouched. */
export default function InvitationContinuation({ children }: { children: React.ReactNode }) {
  const { user, loading, recoverySessionId } = useAuth();
  const { pathname } = useLocation();
  if (!loading && user && !recoverySessionId && ['/', '/app', '/login', '/signup', '/onboarding'].includes(pathname) && readPendingInvitation()) {
    return <Navigate to="/accept-invitation" replace />;
  }
  return <>{children}</>;
}
