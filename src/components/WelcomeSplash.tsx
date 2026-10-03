import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '@/hooks/useProfile';
import BrandLogo from '@/components/BrandLogo';

const EASE = [0.22, 1, 0.36, 1] as const;
const SESSION_KEY = 'tradenova-welcome-shown';

/**
 * One-per-session full-screen "Welcome Back, {name}" splash.
 * Shown when the user enters the app, then gently fades away.
 */
export default function WelcomeSplash() {
  const { profile, displayName, loading } = useProfile();
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const [show, setShow] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) !== '1';
    } catch {
      return true;
    }
  });
  const [name, setName] = useState<string | null>(null);

  // Mark as shown for this browser session on first mount.
  useEffect(() => {
    if (!show) return;
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch { /* storage unavailable */ }
  }, [show]);

  // Wait for the profile so the greeting carries the real name.
  useEffect(() => {
    if (!show || !loading) {
      setName((profile?.display_name || profile?.full_name ||
        profile?.email?.split('@')[0] || null) as string | null);
    }
  }, [show, loading, profile]);

  useEffect(() => {
    if (!show) return;
    const total = reduceMotion ? 900 : 4200;
    const t = setTimeout(() => setShow(false), total);
    return () => clearTimeout(t);
  }, [show, reduceMotion]);

  if (!show || name === null) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="welcome-splash"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: reduceMotion ? 0.2 : 0.9, ease: EASE } }}
        transition={{ duration: reduceMotion ? 0.2 : 0.9, ease: EASE }}
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#050505]"
        aria-live="polite"
        aria-label="Welcome back"
      >
        {/* Warm light glow from the top, like the reference */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 42% at 50% -6%, rgba(234,179,8,0.16) 0%, rgba(180,120,20,0.07) 34%, rgba(5,5,5,0) 72%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(38% 26% at 50% 4%, rgba(251,191,36,0.12) 0%, rgba(5,5,5,0) 70%)',
          }}
        />

        <div className="relative flex flex-col items-center px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: reduceMotion ? 0 : 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.3 : 1.3, delay: reduceMotion ? 0 : 0.45, ease: EASE }}
            className="text-lg sm:text-xl font-medium text-white/45 tracking-wide"
          >
            Welcome Back,
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: reduceMotion ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduceMotion ? 0.3 : 1.5, delay: reduceMotion ? 0 : 0.75, ease: EASE }}
            className="mt-2 font-heading text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight"
            style={{
              backgroundImage: 'linear-gradient(to bottom, #fde68a, #f59e0b 55%, #b45309)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            {name}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reduceMotion ? 0.3 : 1.4, delay: reduceMotion ? 0 : 1.5, ease: EASE }}
            className="mt-10 flex flex-col items-center gap-2.5"
          >
            <BrandLogo decorative className="h-10 w-10 rounded-lg object-cover ring-1 ring-amber-400/20 shadow-[0_0_28px_rgba(251,191,36,0.14)]" />
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/30">TradeNova</p>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
