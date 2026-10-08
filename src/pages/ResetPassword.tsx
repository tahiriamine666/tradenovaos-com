import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthShell, PasswordRules, authInputClass, authLabelClass, passwordValid } from '@/components/auth/AuthShell';

export default function ResetPassword() {
  const navigate = useNavigate();
  const { user, recoverySessionId } = useAuth();
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(redirectTimer.current), []);
  const [ready, setReady] = useState<'checking' | 'ok' | 'invalid'>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (user && recoverySessionId === user.id) setReady('ok');
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady('ok');
    });
    const t = setTimeout(() => setReady((r) => (r === 'checking' ? 'invalid' : r)), 4000);
    return () => { sub.subscription.unsubscribe(); clearTimeout(t); };
  }, [user, recoverySessionId]);

  const canSubmit = passwordValid(password) && password === confirm && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || ready !== 'ok' || !user || recoverySessionId !== user.id) return;
    setLoading(true);
    setError(null);
    try {
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) { setError(err.message); return; }
      setDone(true);
      await supabase.auth.signOut();
      redirectTimer.current = setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch {
      setError('Could not complete the request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <AuthShell title="Password updated">
        <div className="text-center space-y-3">
          <CheckCircle2 className="h-10 w-10 text-success mx-auto" />
          <p className="text-sm text-foreground">Password updated successfully</p>
          <p className="text-xs text-muted-foreground">Redirecting to Sign in…</p>
        </div>
      </AuthShell>
    );
  }

  if (ready !== 'ok') {
    return (
      <AuthShell title="Reset password">
        <p className="text-sm text-center text-muted-foreground">
          {ready === 'checking' ? 'Verifying your reset link…' : 'This reset link is invalid or has expired. Request a new one from the Sign in page.'}
        </p>
        {ready === 'invalid' && <Link to="/login" className="mt-4 block text-center text-sm text-primary hover:underline">Back to Sign in</Link>}
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password for your account.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="new-password" className={authLabelClass}>New Password</label>
          <div className="relative">
            <Input id="new-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${authInputClass} pr-10`} />
            <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordRules password={password} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="confirm-password" className={authLabelClass}>Confirm Password</label>
          <Input id="confirm-password" type={show ? 'text' : 'password'} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={authInputClass} />
          {confirm && confirm !== password && <p className="text-xs text-destructive">Passwords don't match.</p>}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" disabled={!canSubmit} className="w-full h-11 rounded-xl">{loading ? 'Updating…' : 'Update password'}</Button>
      </form>
    </AuthShell>
  );
}
