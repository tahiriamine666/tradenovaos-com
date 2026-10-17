import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle } from '@/lib/googleAuth';
import { forgetInvitation, invitationRequest, readPendingInvitation, rememberInvitation } from '@/lib/invitations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SeoHead from '@/components/SeoHead';
import { PasswordRules, passwordValid } from '@/components/auth/AuthShell';

export default function AcceptInvitation() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    const incoming = new URLSearchParams(window.location.hash.slice(1)).get('invite');
    if (incoming && /^[a-f0-9]{64}$/.test(incoming)) {
      setToken(incoming);
      const stored = rememberInvitation(incoming);
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
      if (!stored) setMessage('Browser session storage is unavailable. After signing in, reopen the invitation email link.');
    } else setToken(previous => previous ?? readPendingInvitation());
  }, []);
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setMessage('');
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Please try again.'); }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-background px-5 py-16 text-foreground">
    <SeoHead title="Accept your invitation — TradeOS" description="Securely claim your complimentary TradeOS access." path="/accept-invitation" noindex />
    <div className="mx-auto max-w-md space-y-6 rounded-2xl border border-border bg-card p-6 sm:p-9">
      <Link to="/" className="text-xl font-bold tracking-tight" onClick={forgetInvitation}>TradeOS</Link>
      <h1 className="text-3xl font-semibold">You’re invited.</h1>
      <p className="text-sm text-muted-foreground">Sign in with the email that received your invitation. Access is complimentary and starts only after secure acceptance. No purchase required.</p>
      {loading ? <p role="status">Checking your session…</p> : !token ? <p role="alert">Open the original invitation email link to continue.</p> : user ? <div className="space-y-4">
        <p className="break-all text-sm">Signed in as {user.email}</p>
        <Button className="w-full" disabled={busy} onClick={() => void run(async () => {
          const result = await invitationRequest({ action: 'redeem', token });
          if (!result.accepted) throw new Error('Acceptance was not confirmed. Please retry.');
          forgetInvitation();
          // Reload canonical access providers; never set a plan in client state.
          window.location.assign('/app');
        })}>{busy ? 'Checking invitation…' : 'Accept Invitation'}</Button>
        <Button variant="outline" className="w-full" disabled={busy} onClick={() => void run(signOut)}>Use another account</Button>
      </div> : <div className="space-y-4">
        <Button variant="outline" className="w-full" disabled={busy} onClick={() => void run(signInWithGoogle)}>Continue with Google</Button>
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); void run(async () => {
          if (register && !passwordValid(password)) throw new Error('Choose a password that meets the requirements below.');
          const { error } = await (register ? signUp(email.trim(), password) : signIn(email.trim(), password));
          if (error) throw error;
          setPassword('');
          if (register) setMessage('Check your inbox to verify your email. Then reopen this invitation link.');
        }); }}>
          <label className="block text-sm">Email<Input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></label>
          <label className="block text-sm">Password<Input type="password" minLength={register ? 8 : undefined} autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} required /></label>
          {register && <PasswordRules password={password} />}
          {register && <label className="flex gap-2 text-xs text-muted-foreground"><input type="checkbox" required /> <span>I agree to the <Link className="underline" to="/terms">Terms</Link> and <Link className="underline" to="/privacy">Privacy Policy</Link>.</span></label>}
          <Button className="w-full" disabled={busy}>{busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}</Button>
        </form>
        <button className="text-sm text-primary underline" disabled={busy} onClick={() => setRegister(!register)}>{register ? 'Already registered? Sign in' : 'New to TradeOS? Create an account'}</button>
        <p><Link to="/login" className="text-sm underline">Password recovery / existing sign-in page</Link></p>
      </div>}
      {message && <p role="status" className="rounded-lg border border-border p-3 text-sm">{message}</p>}
      <Link to="/" className="block text-sm text-muted-foreground underline" onClick={forgetInvitation}>Cancel and return to website</Link>
    </div>
  </main>;
}
