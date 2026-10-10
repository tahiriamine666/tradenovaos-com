import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ResetPassword() {
  const { user, loading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 12) { setError('Use at least 12 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword(''); setConfirm(''); setDone(true);
    } catch { setError('Could not update your password. Request a fresh reset link and try again.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen flex items-center justify-center bg-background p-6">
    <section className="w-full max-w-md space-y-5">
      <h1 className="text-2xl font-bold">Reset your password</h1>
      {loading ? <p role="status">Checking your reset link…</p> : done ? <><p role="status">Your password has been updated.</p><Link to="/app">Continue to TradeNova</Link></> : !user ? <><p>This reset link is missing, expired, or invalid. Request a new link from the login page.</p><Link to="/login">Back to login</Link></> : <form onSubmit={submit} className="space-y-4">
        <label className="block">New password<Input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <label className="block">Confirm password<Input type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={e => setConfirm(e.target.value)} /></label>
        <p className="text-sm text-muted-foreground">Use at least 12 characters and a password you do not use elsewhere.</p>
        {error && <p role="alert">{error}</p>}
        <Button disabled={busy} type="submit">{busy ? 'Updating…' : 'Update password'}</Button>
      </form>}
    </section>
  </main>;
}
