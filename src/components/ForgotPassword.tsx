// ─── ForgotPassword.tsx ───────────────────────────────────────────────────────
// Add to your login page — handles password reset via Supabase auth

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
}

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError('Please enter your email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email.'); return; }

    setLoading(true);
    setError(null);

    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (err) {
      setError('Could not send reset email. Please try again.');
      console.error('Password reset error:', err);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="border-0 shadow-lg">
        <CardHeader className="pb-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-3 w-fit"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to login
          </button>
          <CardTitle className="font-heading text-xl">Reset your password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a reset link.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-3"
              >
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
                <div>
                  <p className="font-heading font-semibold text-foreground">Email sent!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Check <strong>{email}</strong> for a password reset link.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Didn't receive it? Check your spam folder.
                  </p>
                </div>
                <Button variant="outline" onClick={onBack} className="rounded-xl mt-2">
                  Back to login
                </Button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Email address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setError(null); }}
                      placeholder="you@example.com"
                      className="pl-9 rounded-xl"
                      autoFocus
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-500 bg-red-50 dark:bg-red-500/10 rounded-lg p-3">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl"
                >
                  {loading ? 'Sending...' : 'Send reset link'}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Usage in your Login page ─────────────────────────────────────────────────
// 1. Import: import ForgotPassword from '@/components/ForgotPassword';
// 2. Add state: const [showForgot, setShowForgot] = useState(false);
// 3. Conditional render:
//    {showForgot
//      ? <ForgotPassword onBack={() => setShowForgot(false)} />
//      : <LoginForm ... />
//    }
// 4. Add link in LoginForm:
//    <button onClick={() => setShowForgot(true)} className="text-xs text-primary hover:underline">
//      Forgot password?
//    </button>
