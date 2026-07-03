// Global active-trading-account state. Drives the Command Center and all
// per-account data views (trades, journal, analytics, etc.).

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PlatformId, TradingAccountRecord } from '@/lib/platforms/types';

const STORAGE_KEY = 'tn.activeAccountId';
const PLATFORM_KEY = 'tn.platformFilter';

export type PlatformFilter = 'all' | PlatformId;

interface Ctx {
  accounts: TradingAccountRecord[];
  activeAccount: TradingAccountRecord | null;
  activeAccountId: string | null;                // null = "All Accounts"
  setActiveAccountId: (id: string | null) => void;
  platformFilter: PlatformFilter;
  setPlatformFilter: (p: PlatformFilter) => void;
  version: number;                                // bump to force consumer re-fetch
  refresh: () => Promise<void>;
  loading: boolean;
}

const ActiveAccountContext = createContext<Ctx | null>(null);

export function ActiveAccountProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<TradingAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY),
  );
  const [platformFilter, setPlatformFilterState] = useState<PlatformFilter>(
    () => (localStorage.getItem(PLATFORM_KEY) as PlatformFilter) || 'all',
  );
  const [version, setVersion] = useState(0);

  const load = useCallback(async () => {
    if (!user) { setAccounts([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('trading_accounts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    const rows = (data ?? []) as unknown as TradingAccountRecord[];
    setAccounts(rows);
    setLoading(false);

    // Choose active account: stored -> default -> first
    setActiveAccountIdState(prev => {
      if (prev === 'all') return null;
      if (prev && rows.some(r => r.id === prev)) return prev;
      const def = rows.find(r => r.is_default);
      return def?.id ?? rows[0]?.id ?? null;
    });
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const setActiveAccountId = useCallback((id: string | null) => {
    setActiveAccountIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.setItem(STORAGE_KEY, 'all');
    setVersion(v => v + 1);
  }, []);

  const setPlatformFilter = useCallback((p: PlatformFilter) => {
    setPlatformFilterState(p);
    localStorage.setItem(PLATFORM_KEY, p);
  }, []);

  const activeAccount = useMemo(
    () => accounts.find(a => a.id === activeAccountId) ?? null,
    [accounts, activeAccountId],
  );

  return (
    <ActiveAccountContext.Provider value={{
      accounts, activeAccount, activeAccountId,
      setActiveAccountId, platformFilter, setPlatformFilter,
      version, refresh: load, loading,
    }}>
      {children}
    </ActiveAccountContext.Provider>
  );
}

export function useActiveAccount() {
  const ctx = useContext(ActiveAccountContext);
  if (!ctx) throw new Error('useActiveAccount must be used within ActiveAccountProvider');
  return ctx;
}
