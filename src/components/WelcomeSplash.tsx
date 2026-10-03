import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useProfile } from '@/hooks/useProfile';

const EASE = [0.22, 1, 0.36, 1] as const;
// Set by a successful login (password or Google); consumed once here.
const PENDING_KEY = 'tradenova-welcome-pending';

/**
 * Full-screen "Welcome Back, {name}" splash, shown after every successful login.
 * Refreshes and in-app navigation don't replay it.
 */
export default function WelcomeSplash() {
  const { profile, loading } = useProfile();
  const reduceMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const [show, setShow] = useState(() => {
    try {
      return sessionStorage.getItem(PENDING_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [name, setName] = useState<string | null>(null);

  // Consume the login trigger so a refresh doesn't replay it.
  useEffect(() => {
    if (!show) return;
    try { sessionStorage.removeItem(PENDING_KEY); } catch { /* storage unavailable */ }
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
    const total = reduceMotion ? 700 : 2200;
    const t = setTimeout(() => setShow(false), total);
    return () => clearTimeout(t);
  }, [show, reduceMotion]);

  const first = name ? name.split(' ')[0] : '';
  const pretty = first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : '';

  return (
    <AnimatePresence>
      {show && name !== null && (
        <motion.div
          key="welcome-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: reduceMotion ? 0.25 : 0.8, ease: EASE } }}
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
          style={{ background: '#000000' }}
          aria-live="polite"
          aria-label="Welcome back"
        >
          {!reduceMotion && (
            <>
              <motion.div
                className="pointer-events-none absolute"
                style={{
                  width: '70vmax', height: '70vmax', left: '50%', top: '50%',
                  background: 'radial-gradient(circle, rgba(0,102,255,0.22) 0%, rgba(0,71,255,0.08) 40%, rgba(0,0,0,0) 70%)',
                  filter: 'blur(60px)',
                }}
                initial={{ opacity: 0, x: '-75%', y: '-30%' }}
                animate={{ opacity: 1, x: ['-75%', '-50%', '-42%'], y: ['-30%', '-50%', '-55%'] }}
                transition={{ opacity: { duration: 1.4, delay: 0.3, ease: EASE }, x: { duration: 3.2, ease: 'easeInOut' }, y: { duration: 3.2, ease: 'easeInOut' } }}
              />
              <motion.div
                className="pointer-events-none absolute"
                style={{
                  width: '40vmax', height: '40vmax', left: '50%', top: '50%',
                  background: 'radial-gradient(circle, rgba(0,140,255,0.12) 0%, rgba(0,0,0,0) 70%)',
                  filter: 'blur(70px)',
                }}
                initial={{ opacity: 0, x: '-50%', y: '-50%', scale: 0.9 }}
                animate={{ opacity: [0, 1, 0.7], scale: [0.9, 1.08, 1] }}
                transition={{ duration: 3, delay: 0.5, ease: 'easeInOut' }}
              />
            </>
          )}

          <motion.h1
            initial={{ opacity: 0, y: reduceMotion ? 0 : 8, filter: reduceMotion ? 'blur(0px)' : 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8, filter: reduceMotion ? 'blur(0px)' : 'blur(2px)' }}
            transition={{ duration: reduceMotion ? 0.3 : 1.0, delay: reduceMotion ? 0 : 0.6, ease: EASE }}
            className="relative px-6 text-center font-heading text-3xl sm:text-4xl tracking-tight whitespace-nowrap"
            style={{ color: '#FFFFFF', textShadow: '0 0 40px rgba(0,102,255,0.25)' }}
          >
            <span className="font-medium">Welcome Back, </span>
            <span className="font-semibold">{pretty}</span>
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
