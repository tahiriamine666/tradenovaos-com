import { ReactNode } from 'react';
import { Helmet } from 'react-helmet-async';
import BrandLogo from '@/components/BrandLogo';
import { signInWithGoogle } from '@/lib/googleAuth';

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <Helmet><meta name="robots" content="noindex, follow" /></Helmet>
      <div className="tn-ambient tn-edge-light w-full max-w-[400px] rounded-2xl border border-border/60 bg-card p-6 sm:p-8">
        <div className="text-center mb-6">
          <BrandLogo className="mx-auto w-14 h-14 object-contain mix-blend-screen" />
          <h1 className="mt-4 text-2xl font-heading font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}

export const authInputClass = 'h-11 rounded-xl bg-background border-border/60';
export const authLabelClass = 'text-xs font-medium text-muted-foreground';

export function OrDivider() {
  return (
    <div className="flex items-center gap-3 my-5">
      <span className="h-px flex-1 bg-border/60" />
      <span className="text-[11px] tracking-wider text-muted-foreground">OR</span>
      <span className="h-px flex-1 bg-border/60" />
    </div>
  );
}

export function GoogleButton() {
  return (
    <button
      type="button"
      onClick={signInWithGoogle}
      className="w-full h-11 rounded-xl border border-border/60 bg-background hover:bg-secondary/60 transition-colors duration-200 flex items-center justify-center gap-2 text-sm font-medium text-foreground"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.9 6.5 29.2 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/><path fill="#4CAF50" d="M24 43.5c5.1 0 9.8-2 13.3-5.2l-6.1-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.3 0-9.7-3.1-11.3-7.5l-6.5 5C9.6 39.1 16.2 43.5 24 43.5z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.1 5.2c-.4.4 6.7-4.9 6.7-14.8 0-1.2-.1-2.3-.4-3.5z"/></svg>
      Continue with Google
    </button>
  );
}

export const PASSWORD_RULES = [
  { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
  { label: 'One number', test: (p: string) => /[0-9]/.test(p) },
];
export const passwordValid = (p: string) => PASSWORD_RULES.every((r) => r.test(p));

export function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
      {PASSWORD_RULES.map((r) => {
        const ok = r.test(password);
        return (
          <li key={r.label} className={`flex items-center gap-1.5 text-[11px] transition-colors duration-200 ${ok ? 'text-success' : 'text-muted-foreground'}`}>
            <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px] ${ok ? 'border-success bg-success/15' : 'border-border'}`}>{ok ? '✓' : ''}</span>
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}

/** Production always recovers on the canonical domain; preview/local stay on their own origin. */
export function resetRedirectUrl() {
  const host = window.location.hostname;
  if (host === 'tradenovaos.com' || host === 'www.tradenovaos.com') return 'https://tradenovaos.com/reset-password';
  return `${window.location.origin}/reset-password`;
}
