import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff, MailCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { AuthShell, GoogleButton, OrDivider, PasswordRules, authInputClass, authLabelClass, passwordValid } from '@/components/auth/AuthShell';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const { signUp } = useAuth();

  const canSubmit = EMAIL_RE.test(email.trim()) && passwordValid(password) && terms && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    const { error } = await signUp(email.trim(), password);
    setLoading(false);
    if (error) toast.error(error.message);
    else setSentTo(email.trim());
  };

  if (sentTo) {
    return (
      <AuthShell title="Confirm your email">
        <div className="text-center space-y-3">
          <MailCheck className="h-10 w-10 text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">We sent a confirmation link to <span className="text-foreground">{sentTo}</span>. Open it to activate your account.</p>
          <Link to="/login" className="inline-block text-sm text-primary hover:underline font-medium">Back to Sign in</Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create Account" subtitle="Start your TradeNova journey">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className={authLabelClass}>Email</label>
          <Input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={authInputClass} />
        </div>
        <div className="space-y-1.5">
          <label className={authLabelClass}>Password</label>
          <div className="relative">
            <Input type={show ? 'text' : 'password'} autoComplete="new-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className={`${authInputClass} pr-10`} />
            <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <PasswordRules password={password} />
        </div>
        <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
          <Checkbox checked={terms} onCheckedChange={(v) => setTerms(v === true)} className="mt-0.5" />
          <span>I agree to the <Link to="/terms" className="text-primary hover:underline">Terms</Link> and <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.</span>
        </label>
        <Button type="submit" className="w-full h-11 rounded-xl" disabled={!canSubmit}>{loading ? 'Creating account…' : 'Create Account'}</Button>
      </form>
      <OrDivider />
      <GoogleButton />
      <p className="text-center text-sm text-muted-foreground mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
      </p>
    </AuthShell>
  );
}
