// ─── DashboardFilters.tsx ─────────────────────────────────────────────────────
// Horizontal filter bar for dashboard — date range, side, setup, currency, account
// Exports: DashboardFilters, useDashboardFilters, FilterState

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, Calendar, SlidersHorizontal, DollarSign,
  LayoutGrid, X, Check, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Types ────────────────────────────────────────────────────────────────────
export type SideFilter = 'all' | 'long' | 'short';
export type ResultFilter = 'all' | 'win' | 'loss' | 'breakeven';

export interface FilterState {
  dateRange: { start: string; end: string; label: string };
  side: SideFilter;
  result: ResultFilter;
  setup: string;
  currency: string;
  account: string;
}

const today = new Date();
const fmt = (d: Date) => d.toISOString().split('T')[0];

const DATE_PRESETS = [
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
  { label: 'All Time', start: '2000-01-01', end: fmt(today) },
];

const DEFAULT_FILTERS: FilterState = {
  dateRange: DATE_PRESETS[7], // All Time
  side: 'all',
  result: 'all',
  setup: 'all',
  currency: 'USD',
  account: 'Main Account',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useDashboardFilters(initialSetups: string[] = []) {
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  const setDateRange = useCallback((preset: typeof DATE_PRESETS[0]) => {
    setFilters(f => ({ ...f, dateRange: preset }));
  }, []);

  const setSide = useCallback((side: SideFilter) => {
    setFilters(f => ({ ...f, side }));
  }, []);

  const setResult = useCallback((result: ResultFilter) => {
    setFilters(f => ({ ...f, result }));
  }, []);

  const setSetup = useCallback((setup: string) => {
    setFilters(f => ({ ...f, setup }));
  }, []);

  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const activeCount = [
    filters.dateRange.label !== 'All Time',
    filters.side !== 'all',
    filters.result !== 'all',
    filters.setup !== 'all',
  ].filter(Boolean).length;

  // Filter trades array
  const filterTrades = useCallback(<T extends {
    result: number; side?: string | null; setup?: string | null;
    trade_date: string; outcome?: string | null;
  }>(trades: T[]): T[] => {
    return trades.filter(t => {
      const d = t.trade_date;
      if (d < filters.dateRange.start || d > filters.dateRange.end) return false;
      if (filters.side !== 'all' && t.side?.toLowerCase() !== filters.side) return false;
      if (filters.result !== 'all') {
        if (filters.result === 'win' && (t.result ?? 0) <= 0) return false;
        if (filters.result === 'loss' && (t.result ?? 0) >= 0) return false;
        if (filters.result === 'breakeven' && (t.result ?? 0) !== 0) return false;
      }
      if (filters.setup !== 'all' && t.setup !== filters.setup) return false;
      return true;
    });
  }, [filters]);

  return { filters, setDateRange, setSide, setResult, setSetup, reset, activeCount, filterTrades };
}

// ─── Dropdown wrapper ─────────────────────────────────────────────────────────
function Dropdown({ trigger, children, align = 'left' }: {
  trigger: React.ReactNode; children: React.ReactNode; align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className={`absolute z-50 top-full mt-1.5 min-w-[180px] rounded-xl border border-border bg-card shadow-xl shadow-black/20 overflow-hidden ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
            onClick={() => setOpen(false)}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Filter button ────────────────────────────────────────────────────────────
function FilterBtn({
  icon: Icon, label, active, children, align,
}: {
  icon: React.ElementType; label: string; active?: boolean;
  children: React.ReactNode; align?: 'left' | 'right';
}) {
  return (
    <Dropdown align={align} trigger={
      <button className={`
        flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium
        transition-all whitespace-nowrap
        ${active
          ? 'border-primary/60 bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/40'
        }
      `}>
        <Icon className="h-3.5 w-3.5 flex-shrink-0" />
        <span>{label}</span>
        <ChevronDown className="h-3 w-3 opacity-50" />
      </button>
    }>
      {children}
    </Dropdown>
  );
}

// ─── Dropdown option ──────────────────────────────────────────────────────────
function Option({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full px-3.5 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
    >
      {label}
      {selected && <Check className="h-3.5 w-3.5 text-primary" />}
    </button>
  );
}

// ─── Main filter bar ──────────────────────────────────────────────────────────
interface DashboardFiltersProps {
  filters: FilterState;
  setDateRange: (p: typeof DATE_PRESETS[0]) => void;
  setSide: (s: SideFilter) => void;
  setResult: (r: ResultFilter) => void;
  setSetup: (s: string) => void;
  reset: () => void;
  activeCount: number;
  availableSetups?: string[];
}

export function DashboardFilters({
  filters, setDateRange, setSide, setResult, setSetup, reset, activeCount, availableSetups = [],
}: DashboardFiltersProps) {
  return (
    <div className="flex items-center gap-2 flex-wrap">

      {/* Currency */}
      <Dropdown trigger={
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all">
          <DollarSign className="h-3.5 w-3.5" />
          <span>{filters.currency}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      }>
        <div className="p-1">
          {['USD', 'EUR', 'GBP', 'JPY', 'CAD'].map(c => (
            <Option key={c} label={c} selected={filters.currency === c} onClick={() => {}} />
          ))}
        </div>
      </Dropdown>

      {/* Date range */}
      <FilterBtn icon={Calendar} label={filters.dateRange.label} active={filters.dateRange.label !== 'All Time'}>
        <div className="p-1">
          {DATE_PRESETS.map(p => (
            <Option key={p.label} label={p.label} selected={filters.dateRange.label === p.label}
              onClick={() => setDateRange(p)} />
          ))}
        </div>
      </FilterBtn>

      {/* Filters */}
      <FilterBtn
        icon={SlidersHorizontal}
        label={activeCount > 0 ? `Filters (${activeCount})` : 'Filters'}
        active={activeCount > 0}
      >
        <div className="p-2 space-y-3 min-w-[200px]">
          {/* Side */}
          <div>
            <p className="text-xs text-muted-foreground px-1.5 mb-1.5 font-medium">Side</p>
            <div className="flex gap-1">
              {(['all', 'long', 'short'] as SideFilter[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSide(s)}
                  className={`flex-1 py-1.5 text-xs rounded-lg capitalize transition-all ${
                    filters.side === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
          {/* Result */}
          <div>
            <p className="text-xs text-muted-foreground px-1.5 mb-1.5 font-medium">Result</p>
            <div className="flex gap-1">
              {(['all', 'win', 'loss'] as ResultFilter[]).map(r => (
                <button
                  key={r}
                  onClick={() => setResult(r)}
                  className={`flex-1 py-1.5 text-xs rounded-lg capitalize transition-all ${
                    filters.result === r
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          {/* Setup */}
          {availableSetups.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground px-1.5 mb-1.5 font-medium">Setup</p>
              <div className="space-y-0.5 max-h-32 overflow-y-auto">
                <Option label="All Setups" selected={filters.setup === 'all'} onClick={() => setSetup('all')} />
                {availableSetups.map(s => (
                  <Option key={s} label={s} selected={filters.setup === s} onClick={() => setSetup(s)} />
                ))}
              </div>
            </div>
          )}
          {/* Reset */}
          {activeCount > 0 && (
            <button
              onClick={reset}
              className="w-full py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      </FilterBtn>

      {/* Account */}
      <Dropdown align="right" trigger={
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all ml-auto">
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>{filters.account}</span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      }>
        <div className="p-1">
          {['Main Account', 'Demo Template', 'Funded Account', 'Paper Trading'].map(a => (
            <Option key={a} label={a} selected={filters.account === a} onClick={() => {}} />
          ))}
        </div>
      </Dropdown>

    </div>
  );
}
