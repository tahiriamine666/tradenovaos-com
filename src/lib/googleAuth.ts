import { lovable } from '@/integrations/lovable/index';
import { toast } from 'sonner';

// Managed Google sign-in. Returns to the public site root on the current
// origin (tradenovaos.com in production); signed-in users are then routed to /app.
export async function signInWithGoogle() {
  try { sessionStorage.setItem('tradenova-welcome-pending', '1'); } catch { /* ignore */ }
  const result = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: window.location.origin,
  });
  if (result.error) {
    toast.error(result.error.message ?? 'Google sign-in failed');
    return;
  }
  if (result.redirected) return;
  window.location.assign('/app');
}
