import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  recoverySessionId: string | null;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [recoverySessionId, setRecoverySessionId] = useState<string | null>(null);

  useEffect(() => {
    // Keep the same user object across token refreshes (tab focus) so guards and data hooks don't reset.
    const keepUser = (next: User | null) => setUser((prev) => (prev && next && prev.id === next.id ? prev : next));
    let alive = true;
    let receivedEvent = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      receivedEvent = true;
      if (event === 'PASSWORD_RECOVERY') setRecoverySessionId(session?.user.id ?? null);
      if (event === 'SIGNED_OUT') setRecoverySessionId(null);
      setSession(session);
      keepUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!alive || receivedEvent) return;
      setSession(session);
      keepUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => { if (alive && !receivedEvent) setLoading(false); });

    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) { try { sessionStorage.setItem('tradenova-welcome-pending', '1'); } catch { /* ignore */ } }
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, recoverySessionId, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
