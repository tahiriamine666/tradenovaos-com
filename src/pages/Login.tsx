import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import ForgotPassword from '@/components/ForgotPassword';
import { AuthShell, GoogleButton, OrDivider, authInputClass, authLabelClass } from '@/components/auth/AuthShell';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) toast.error(error.message);
    else navigate('/app');
  };

  if (showForgot) return <ForgotPassword onBack={() => setShowForgot(false)} />;

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your TradeNova account">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className={authLabelClass}>Email</label>
          <Input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required className={authInputClass} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className={authLabelClass}>Password</label>
            <button type="button" onClick={() => setShowForgot(true)} className="text-xs text-primary hover:underline">Forgot password?</button>
          </div>
          <div className="relative">
            <Input type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className={`${authInputClass} pr-10`} />
            <button type="button" aria-label={show ? 'Hide password' : 'Show password'} onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
      </form>
      <OrDivider />
      <GoogleButton />
      <p className="text-center text-sm text-muted-foreground mt-6">
        Don't have an account?{' '}
        <Link to="/signup" className="text-primary hover:underline font-medium">Create Account</Link>
      </p>
    </AuthShell>
  );
}
