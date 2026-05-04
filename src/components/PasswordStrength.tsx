// ─── PasswordStrength.tsx ─────────────────────────────────────────────────────
// Drop-in password strength indicator for your signup form.

import React, { useMemo } from 'react';

interface PasswordStrengthProps {
  password: string;
}

interface StrengthResult {
  score: number;       // 0-4
  label: string;
  color: string;
  barColor: string;
  suggestions: string[];
}

export function checkPasswordStrength(password: string): StrengthResult {
  if (!password) return { score: 0, label: '', color: '', barColor: '', suggestions: [] };

  let score = 0;
  const suggestions: string[] = [];

  if (password.length >= 8) score++; else suggestions.push('Use at least 8 characters');
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++; else suggestions.push('Add an uppercase letter');
  if (/[0-9]/.test(password)) score++; else suggestions.push('Add a number');
  if (/[^A-Za-z0-9]/.test(password)) score++; else suggestions.push('Add a special character (!@#$...)');

  // Cap at 4
  const capped = Math.min(4, score);

  const levels = [
    { label: 'Too weak',  color: 'text-red-500',    barColor: 'bg-red-500' },
    { label: 'Weak',      color: 'text-orange-500',  barColor: 'bg-orange-500' },
    { label: 'Fair',      color: 'text-amber-500',   barColor: 'bg-amber-500' },
    { label: 'Good',      color: 'text-blue-500',    barColor: 'bg-blue-500' },
    { label: 'Strong',    color: 'text-emerald-500', barColor: 'bg-emerald-500' },
  ];

  return { score: capped, ...levels[capped], suggestions };
}

export default function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => checkPasswordStrength(password), [password]);

  if (!password) return null;

  const bars = [0, 1, 2, 3];

  return (
    <div className="space-y-2 mt-1.5">
      {/* Bar */}
      <div className="flex gap-1">
        {bars.map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < strength.score ? strength.barColor : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Label + suggestion */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${strength.color}`}>
          {strength.label}
        </span>
        {strength.suggestions[0] && (
          <span className="text-xs text-muted-foreground">{strength.suggestions[0]}</span>
        )}
      </div>
    </div>
  );
}

// ─── Usage in your Signup/Auth form ───────────────────────────────────────────
// import PasswordStrength from '@/components/PasswordStrength';
//
// const [password, setPassword] = useState('');
//
// <Input
//   type="password"
//   value={password}
//   onChange={e => setPassword(e.target.value)}
//   placeholder="Create a password"
// />
// <PasswordStrength password={password} />
//
// Optionally block submission if weak:
// import { checkPasswordStrength } from '@/components/PasswordStrength';
// const strength = checkPasswordStrength(password);
// if (strength.score < 2) { setError('Password too weak'); return; }
