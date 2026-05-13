// src/hooks/useProfile.ts
// Single hook that loads profile + admin status in one secure RPC call.
// Use this everywhere instead of querying profiles directly.

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id:                  string;
  email:               string | null;
  full_name:           string | null;
  display_name:        string | null;
  avatar_url:          string | null;
  plan_type:           string;
  subscription_plan:   string;
  subscription_status: string;
  trial_ends_at:       string | null;
  timezone:            string;
  preferred_market:    string | null;
  risk_per_trade:      number;
  default_account_type: string;
  trading_style:       string;
  bio:                 string | null;
  stripe_customer_id:  string | null;
  is_admin:            boolean;
}

interface ProfileContextValue {
  profile:        UserProfile | null;
  loading:        boolean;
  isAdmin:        boolean;
  displayName:    string;
  refresh:        () => Promise<void>;
  updateAvatar:   (url: string) => void;
}

const DEFAULT: ProfileContextValue = {
  profile: null, loading: true,
  isAdmin: false, displayName: 'Trader',
  refresh: async () => {}, updateAvatar: () => {},
};

const ProfileContext = createContext<ProfileContextValue>(DEFAULT);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);

    // Single RPC call — returns profile + is_admin
    const { data, error } = await supabase.rpc('get_my_profile');

    if (!error && data) {
      setProfile(data as UserProfile);
    } else {
      // Fallback: direct query
      const { data: p } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (p) setProfile({ ...p, is_admin: false } as UserProfile);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const updateAvatar = useCallback((url: string) => {
    setProfile(p => p ? { ...p, avatar_url: url } : p);
  }, []);

  const displayName = profile?.display_name || profile?.full_name ||
    profile?.email?.split('@')[0] || 'Trader';

  const isAdmin = profile?.is_admin ?? false;

  return (
    <ProfileContext.Provider value={{ profile, loading, isAdmin, displayName, refresh, updateAvatar }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  return useContext(ProfileContext);
}
