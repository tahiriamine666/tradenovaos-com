import React, { useState } from 'react';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AuthShell, authInputClass, authLabelClass, resetRedirectUrl } from '@/components/auth/AuthShell';

export default function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email.'); return; }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: resetRedirectUrl() });
    setLoading(false);
    // Rate limits are the only error worth surfacing; never reveal whether the account exists.
    if (err && err.status === 429) { setError('Too many requests. Please wait a few minutes and try again.'); return; }
    setSent(true);
  };

  return (
    <AuthShell title="Reset your password" subtitle={sent ? undefined : "Enter your email and we'll send you a reset link."}>
      {sent ? (
        <div className="text-center space-y-4">
          <MailCheck className="h-10 w-10 text-primary mx-auto" />
          <p className="text-sm text-foreground">Check your email for a password reset link.</p>
          <p className="text-xs text-muted-foreground">Didn't get it? Check your spam folder.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className={authLabelClass}>Email</label>
            <Input type="email" autoFocus value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }} placeholder="you@example.com" className={authInputClass} />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full h-11 rounded-xl">{loading ? 'Sending…' : 'Send reset link'}</Button>
        </form>
      )}
      <button onClick={onBack} className="mt-6 mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign in
      </button>
    </AuthShell>
  );
}
