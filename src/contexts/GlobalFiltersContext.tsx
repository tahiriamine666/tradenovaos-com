// GlobalFiltersContext — app-wide filters consumed by TopBar.
// Exposes filter state + setters and derived option lists (setups, pairs)
// pulled from the user's trades.

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type SideFilter = 'all' | 'long' | 'short';
export type OutcomeFilter = 'all' | 'win' | 'loss' | 'breakeven';
export type AccountFilter = 'all' | 'main' | 'funded' | 'prop_firm' | 'demo' | 'live';

export interface DateRange {
  label: string;
  start: string;
  end: string;
  isCustom?: boolean;
}

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];

export const DATE_PRESETS: DateRange[] = [
  { label: 'All Time', start: '2000-01-01', end: fmt(today) },
  { label: 'Today', start: fmt(today), end: fmt(today) },
  {
    label: 'This Week',
    start: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - today.getDay())),
    end: fmt(today),
  },
  {
    label: 'This Month',
    start: fmt(new Date(today.getFullYear(), today.getMonth(), 1)),
    end: fmt(today),
  },
  {
    label: 'Last Month',
    start: fmt(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
    end: fmt(new Date(today.getFullYear(), today.getMonth(), 0)),
  },
  {
    label: 'Last 30 Days',
    start: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30)),
    end: fmt(today),
  },
  {
    label: 'Last 90 Days',
    start: fmt(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 90)),
    end: fmt(today),
  },
  {
    label: 'This Year',
    start: fmt(new Date(today.getFullYear(), 0, 1)),
    end: fmt(today),
  },
];

interface FiltersState {
  dateRange: DateRange;
  side: SideFilter;
  outcome: OutcomeFilter;
  setup: string;
  pair: string;
  accountType: AccountFilter;
}

const DEFAULTS: FiltersState = {
  dateRange: DATE_PRESETS[0],
  side: 'all',
  outcome: 'all',
  setup: 'all',
  pair: 'all',
  accountType: 'all',
};

interface Ctx {
  filters: FiltersState;
  setDateRange: (r: DateRange) => void;
  setSide: (s: SideFilter) => void;
  setOutcome: (o: OutcomeFilter) => void;
  setSetup: (s: string) => void;
  setPair: (p: string) => void;
  setAccountType: (a: AccountFilter) => void;
  resetFilters: () => void;
  activeCount: number;
  availableSetups: string[];
  availablePairs: string[];
}

const GlobalFiltersContext = createContext<Ctx | null>(null);

export function GlobalFiltersProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [filters, setFilters] = useState<FiltersState>(DEFAULTS);
  const [availableSetups, setAvailableSetups] = useState<string[]>([]);
  const [availablePairs, setAvailablePairs] = useState<string[]>([]);

  useEffect(() => {
    if (!user) { setAvailableSetups([]); setAvailablePairs([]); return; }
    supabase
      .from('trades')
      .select('setup, pair')
      .eq('user_id', user.id)
      .then(({ data }) => {
        const setups = new Set<string>();
        const pairs = new Set<string>();
        (data ?? []).forEach((t: any) => {
          if (t.setup && String(t.setup).trim()) setups.add(String(t.setup).trim());
          if (t.pair && String(t.pair).trim()) pairs.add(String(t.pair).trim());
        });
        setAvailableSetups([...setups].sort());
        setAvailablePairs([...pairs].sort());
      });
  }, [user]);

  const setDateRange = useCallback((r: DateRange) => setFilters(f => ({ ...f, dateRange: r })), []);
  const setSide = useCallback((s: SideFilter) => setFilters(f => ({ ...f, side: s })), []);
  const setOutcome = useCallback((o: OutcomeFilter) => setFilters(f => ({ ...f, outcome: o })), []);
  const setSetup = useCallback((s: string) => setFilters(f => ({ ...f, setup: s })), []);
  const setPair = useCallback((p: string) => setFilters(f => ({ ...f, pair: p })), []);
  const setAccountType = useCallback((a: AccountFilter) => setFilters(f => ({ ...f, accountType: a })), []);
  const resetFilters = useCallback(() => setFilters(DEFAULTS), []);

  const activeCount = useMemo(() => [
    filters.dateRange.label !== 'All Time',
    filters.side !== 'all',
    filters.outcome !== 'all',
    filters.setup !== 'all',
    filters.pair !== 'all',
    filters.accountType !== 'all',
  ].filter(Boolean).length, [filters]);

  return (
    <GlobalFiltersContext.Provider value={{
      filters, setDateRange, setSide, setOutcome, setSetup, setPair, setAccountType,
      resetFilters, activeCount, availableSetups, availablePairs,
    }}>
      {children}
    </GlobalFiltersContext.Provider>
  );
}

export function useGlobalFilters() {
  const ctx = useContext(GlobalFiltersContext);
  if (!ctx) throw new Error('useGlobalFilters must be used within GlobalFiltersProvider');
  return ctx;
}
