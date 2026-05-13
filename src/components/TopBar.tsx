// src/components/TopBar.tsx
// Premium top bar — filters + theme toggle + logout + user avatar (YouTube style)

import React, { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sun, Moon, LogOut, ChevronDown, Calendar,
  SlidersHorizontal, Check, X, RefreshCw,
  CreditCard, User,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import UserAvatar from '@/components/UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  useGlobalFilters, DATE_PRESETS,
  SideFilter, OutcomeFilter, AccountFilter, DateRange,
} from '@/contexts/GlobalFiltersContext';

const ACCOUNT_OPTIONS: { value: AccountFilter; label: string; icon: string }[] = [
  { value: 'all',       label: 'All Accounts',    icon: '🌐' },
  { value: 'main',      label: 'Main Account',    icon: '💼' },
  { value: 'funded',    label: 'Funded Challenge', icon: '🏆' },
  { value: 'prop_firm', label: 'Prop Firm',        icon: '🏦' },
  { value: 'demo',      label: 'Demo Account',     icon: '🧪' },
  { value: 'live',      label: 'Live Account',     icon: '🔴' },
];

function Dropdown({ trigger, children, align = 'left', width = 'w-56' }: {
  trigger: ReactNode; children: ReactNode; align?: 'left'|'right'|'center'; width?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const ac = align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0';
  return (
    <div ref={ref} className="relative flex-shrink-0">
      <div onClick={() => setOpen(v => !v)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.12 }}
            className={`absolute z-[100] top-full mt-2 ${width} ${ac} rounded-2xl border border-border bg-card shadow-2xl shadow-black/30 overflow-hidden`}
            onClick={e => e.stopPropagation()}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FBtn({ icon: Icon, label, active, dot }: { icon: React.ElementType; label: string; active?: boolean; dot?: boolean }) {
  return (
    <button className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all whitespace-nowrap select-none
      ${active ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-card/50 text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="hidden sm:inline">{label}</span>
      <ChevronDown className="h-3 w-3 opacity-60" />
      {dot && <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary" />}
    </button>
  );
}

function Opt({ label, selected, onClick, icon, sub }: { label: string; selected: boolean; onClick: () => void; icon?: string; sub?: string }) {
  return (
    <button onClick={onClick} className={`flex items-center justify-between w-full px-3.5 py-2.5 text-sm transition-colors hover:bg-muted/50 text-left ${selected ? 'text-primary bg-primary/5' : 'text-foreground'}`}>
      <span className="flex items-center gap-2.5">
        {icon && <span className="text-base leading-none">{icon}</span>}
        <span>{label}{sub && <span className="block text-xs text-muted-foreground">{sub}</span>}</span>
      </span>
      {selected && <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" />}
    </button>
  );
}

function Sec({ label }: { label: string }) {
  return <p className="px-3.5 pt-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>;
}

function DateRangeDropdown() {
  const { filters, setDateRange } = useGlobalFilters();
  const [cs, setCs] = useState('');
  const [ce, setCe] = useState('');
  const [show, setShow] = useState(false);
  return (
    <Dropdown width="w-64" trigger={<FBtn icon={Calendar} label={filters.dateRange.label} active={filters.dateRange.label !== 'All Time'} />}>
      <div className="py-1.5">
        <Sec label="Date Range" />
        {DATE_PRESETS.map(p => <Opt key={p.label} label={p.label} selected={filters.dateRange.label === p.label} onClick={() => { setDateRange(p); setShow(false); }} />)}
        <div className="border-t border-border mt-1.5 pt-1.5">
          <button onClick={() => setShow(v => !v)} className={`flex items-center justify-between w-full px-3.5 py-2.5 text-sm hover:bg-muted/50 transition-colors ${filters.dateRange.isCustom ? 'text-primary' : 'text-foreground'}`}>
            <span className="flex items-center gap-2.5"><span>📅</span> Custom Range</span>
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${show ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {show && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="px-3.5 pb-3 space-y-2">
                  <div><label className="text-xs text-muted-foreground">From</label>
                    <input type="date" value={cs} onChange={e => setCs(e.target.value)} className="w-full text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 mt-1" /></div>
                  <div><label className="text-xs text-muted-foreground">To</label>
                    <input type="date" value={ce} onChange={e => setCe(e.target.value)} className="w-full text-xs rounded-lg border border-border bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 mt-1" /></div>
                  <Button size="sm" onClick={() => { if (cs && ce) { setDateRange({ label: 'Custom Range', start: cs, end: ce, isCustom: true }); setShow(false); } }} disabled={!cs || !ce} className="w-full rounded-lg h-8 text-xs">Apply Range</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Dropdown>
  );
}

function FiltersDropdown() {
  const { filters, setSide, setOutcome, setSetup, setPair, resetFilters, activeCount, availableSetups, availablePairs } = useGlobalFilters();
  const hasFilters = filters.side !== 'all' || filters.outcome !== 'all' || filters.setup !== 'all' || filters.pair !== 'all';
  return (
    <Dropdown width="w-72" trigger={<FBtn icon={SlidersHorizontal} label={activeCount > 0 ? `Filters (${activeCount})` : 'Filters'} active={hasFilters} dot={hasFilters} />}>
      <div className="py-1.5 max-h-[480px] overflow-y-auto">
        <Sec label="Side" />
        <div className="px-3 pb-2 flex gap-1.5">
          {(['all','long','short'] as SideFilter[]).map(s => (
            <button key={s} onClick={() => setSide(s)} className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all
              ${filters.side === s ? s==='long' ? 'bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30' : s==='short' ? 'bg-red-500/15 text-red-500 ring-1 ring-red-500/30' : 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}>
              {s === 'long' ? '↑ Long' : s === 'short' ? '↓ Short' : 'All'}
            </button>
          ))}
        </div>
        <Sec label="Outcome" />
        <div className="px-3 pb-2 grid grid-cols-4 gap-1.5">
          {([{v:'all',l:'All',c:''},{v:'win',l:'✓ Win',c:'emerald'},{v:'loss',l:'✗ Loss',c:'red'},{v:'breakeven',l:'= BE',c:'amber'}] as const).map(o => (
            <button key={o.v} onClick={() => setOutcome(o.v as OutcomeFilter)} className={`py-2 rounded-lg text-xs font-medium transition-all
              ${filters.outcome === o.v ? o.c==='emerald' ? 'bg-emerald-500/15 text-emerald-500 ring-1 ring-emerald-500/30' : o.c==='red' ? 'bg-red-500/15 text-red-500 ring-1 ring-red-500/30' : o.c==='amber' ? 'bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30' : 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'bg-muted/50 text-muted-foreground hover:text-foreground'}`}>
              {o.l}
            </button>
          ))}
        </div>
        {availableSetups.length > 0 && (<><Sec label="Setup" /><Opt label="All Setups" selected={filters.setup==='all'} onClick={() => setSetup('all')} /><div className="max-h-28 overflow-y-auto">{availableSetups.map(s => <Opt key={s} label={s} selected={filters.setup===s} onClick={() => setSetup(s)} />)}</div></>)}
        {availablePairs.length > 0 && (<><Sec label="Pair" /><Opt label="All Pairs" selected={filters.pair==='all'} onClick={() => setPair('all')} /><div className="max-h-28 overflow-y-auto">{availablePairs.map(p => <Opt key={p} label={p} selected={filters.pair===p} onClick={() => setPair(p)} />)}</div></>)}
        {hasFilters && <div className="border-t border-border mt-1.5 px-3 py-2"><button onClick={resetFilters} className="w-full py-2 text-xs text-red-500 hover:bg-red-500/10 rounded-lg transition-colors flex items-center justify-center gap-1.5"><X className="h-3.5 w-3.5" /> Clear all filters</button></div>}
      </div>
    </Dropdown>
  );
}

function AccountDropdown() {
  const { filters, setAccountType } = useGlobalFilters();
  const cur = ACCOUNT_OPTIONS.find(a => a.value === filters.accountType) ?? ACCOUNT_OPTIONS[0];
  return (
    <Dropdown width="w-52" align="right" trigger={
      <button className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all whitespace-nowrap select-none
        ${filters.accountType !== 'all' ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-card/50 text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}>
        <span className="text-sm leading-none">{cur.icon}</span>
        <span className="hidden md:inline">{cur.label}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>
    }>
      <div className="py-1.5"><Sec label="Account Type" />
        {ACCOUNT_OPTIONS.map(a => <Opt key={a.value} label={a.label} icon={a.icon} selected={filters.accountType===a.value} onClick={() => setAccountType(a.value)} />)}
      </div>
    </Dropdown>
  );
}

// ─── Avatar dropdown menu (YouTube-style) ────────────────────────────────────
function AvatarMenu({ profile, onNavigate, onLogout, dark, onToggleTheme, onAvatarUpdated }: {
  profile: any; onNavigate: (id: string) => void; onLogout: () => void;
  dark: boolean; onToggleTheme: () => void; onAvatarUpdated: (url: string) => void;
}) {
  const name = profile?.display_name || profile?.full_name || profile?.email?.split('@')[0] || 'Trader';
  const plan = profile?.subscription_plan ?? 'free';
  return (
    <Dropdown width="w-64" align="right" trigger={
      <button className="flex items-center gap-1.5 rounded-xl hover:bg-muted/50 transition-colors p-1 pr-1.5">
        <UserAvatar url={profile?.avatar_url ?? null} displayName={profile?.display_name || profile?.full_name} email={profile?.email ?? null} size="sm" />
        <ChevronDown className="h-3 w-3 text-muted-foreground hidden sm:block" />
      </button>
    }>
      <div className="py-1.5">
        {/* Profile header */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <UserAvatar url={profile?.avatar_url ?? null} displayName={profile?.display_name || profile?.full_name}
              email={profile?.email ?? null} size="lg" editable onUpdated={onAvatarUpdated} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
              <Badge variant="outline" className={`text-[10px] rounded-full px-2 capitalize mt-1 border ${plan==='pro' ? 'border-primary/30 text-primary' : plan==='elite' ? 'border-amber-500/30 text-amber-500' : 'border-border text-muted-foreground'}`}>{plan}</Badge>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Click photo to change
          </p>
        </div>
        {/* Menu */}
        <div className="py-1">
          <button onClick={() => onNavigate('settings')} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"><User className="h-4 w-4 text-muted-foreground" /> Profile & Settings</button>
          <button onClick={() => onNavigate('pricing')} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"><CreditCard className="h-4 w-4 text-muted-foreground" /> Billing & Plans</button>
          <button onClick={onToggleTheme} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors">
            {dark ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
            {dark ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
        <div className="border-t border-border pt-1">
          <button onClick={onLogout} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors"><LogOut className="h-4 w-4" /> Sign Out</button>
        </div>
      </div>
    </Dropdown>
  );
}

// ─── Active filter pills ──────────────────────────────────────────────────────
export function ActiveFilterPills() {
  const { filters, setSide, setOutcome, setSetup, setPair, setDateRange, setAccountType, activeCount } = useGlobalFilters();
  if (activeCount === 0) return null;
  const allTime: DateRange = { label: 'All Time', start: '2000-01-01', end: new Date().toISOString().split('T')[0] };
  const pills = [
    filters.dateRange.label !== 'All Time' && { label: `📅 ${filters.dateRange.label}`, onRemove: () => setDateRange(allTime) },
    filters.side !== 'all' && { label: `Side: ${filters.side}`, onRemove: () => setSide('all') },
    filters.outcome !== 'all' && { label: `Outcome: ${filters.outcome}`, onRemove: () => setOutcome('all') },
    filters.setup !== 'all' && { label: `Setup: ${filters.setup}`, onRemove: () => setSetup('all') },
    filters.pair !== 'all' && { label: `Pair: ${filters.pair}`, onRemove: () => setPair('all') },
    filters.accountType !== 'all' && { label: `${ACCOUNT_OPTIONS.find(a => a.value === filters.accountType)?.icon} ${ACCOUNT_OPTIONS.find(a => a.value === filters.accountType)?.label}`, onRemove: () => setAccountType('all') },
  ].filter(Boolean) as { label: string; onRemove: () => void }[];
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
      className="flex flex-wrap gap-1.5 px-4 sm:px-6 lg:px-8 pb-2">
      {pills.map(p => (
        <button key={p.label} onClick={p.onRemove} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
          {p.label} <X className="h-3 w-3" />
        </button>
      ))}
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
interface TopBarProps {
  dark: boolean; onToggleTheme: () => void; onLogout: () => void;
  activePageLabel: string; onNavigate: (id: string) => void;
}

export default function TopBar({ dark, onToggleTheme, onLogout, activePageLabel, onNavigate }: TopBarProps) {
  const { user } = useAuth();
  const { activeCount, resetFilters } = useGlobalFilters();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('avatar_url,display_name,full_name,email,subscription_plan').eq('id', user.id).single()
      .then(({ data }) => { if (data) setProfile(data); });
  }, [user]);

  const handleAvatarUpdated = (url: string) => setProfile((p: any) => p ? { ...p, avatar_url: url } : p);

  return (
    <div className="flex-shrink-0">
      <header className="flex items-center gap-2 px-4 sm:px-6 lg:px-8 py-3 border-b border-border bg-background/80 backdrop-blur-sm">
        {/* Page title */}
        <div className="flex items-center gap-3 mr-auto min-w-0">
          <h1 className="text-sm font-heading font-bold text-foreground truncate hidden sm:block">{activePageLabel}</h1>
          {activeCount > 0 && <Badge className="bg-primary/10 text-primary border-0 text-xs hidden sm:inline-flex flex-shrink-0">{activeCount} filter{activeCount !== 1 ? 's' : ''}</Badge>}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <DateRangeDropdown />
          <FiltersDropdown />
          <AccountDropdown />
          <div className="w-px h-6 bg-border mx-0.5" />
          <AnimatePresence>
            {activeCount > 0 && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                onClick={resetFilters} className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all" title="Reset filters">
                <RefreshCw className="h-4 w-4" />
              </motion.button>
            )}
          </AnimatePresence>
          {/* YouTube-style avatar */}
          <AvatarMenu profile={profile} onNavigate={onNavigate} onLogout={onLogout} dark={dark} onToggleTheme={onToggleTheme} onAvatarUpdated={handleAvatarUpdated} />
        </div>
      </header>
      <AnimatePresence>{activeCount > 0 && <ActiveFilterPills />}</AnimatePresence>
    </div>
  );
}
