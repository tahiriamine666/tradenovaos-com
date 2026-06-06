// src/components/AppLayout.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, BookOpen, Brain, CalendarDays, CircleDollarSign,
  LayoutDashboard, Menu, PlayCircle, Settings, Shield, Target,
  X, ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const ADMIN_ITEM = { id: 'admin', label: 'Admin Panel', icon: Shield };
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import { useProfile } from '@/hooks/useProfile';
import SupportChat from '@/components/SupportChat';


export const BASE_ITEMS = [
  { id: 'dashboard',  label: 'Command Center',  icon: LayoutDashboard },
  { id: 'plan',       label: 'Trade Plan',       icon: CalendarDays },
  { id: 'trades',     label: 'Trade Vault',      icon: CircleDollarSign },
  { id: 'journal',    label: 'Mind Journal',     icon: BookOpen },
  { id: 'analytics',  label: 'Edge Analytics',   icon: BarChart3 },
  { id: 'playbooks',  label: 'Playbook Lab',     icon: Target },
  { id: 'import',     label: 'Import CSV',       icon: Upload },
  { id: 'replay',     label: 'Replay Studio',    icon: PlayCircle },
  { id: 'resources',  label: 'Learning Hub',     icon: Brain },
  { id: 'settings',   label: 'Studio Settings',  icon: Settings },
];



const BOTTOM_NAV = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { id: 'trades',    icon: CircleDollarSign, label: 'Trades' },
  { id: 'journal',   icon: BookOpen,         label: 'Journal' },
  { id: 'analytics', icon: BarChart3,        label: 'Analytics' },
  { id: 'settings',  icon: Settings,         label: 'Settings' },
];

function cx(...v: (string|boolean|undefined|null)[]) { return v.filter(Boolean).join(' '); }

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/tradenova-icon.png"
        alt="TradeNova"
        className="w-11 h-11 rounded-xl flex-shrink-0 object-contain shadow-lg shadow-primary/25 ring-1 ring-primary/15"
      />
      <div className="leading-tight">
        <p className="font-heading font-bold text-foreground tracking-tight text-[15px]">TradeNova</p>
        <p className="text-[10px] text-muted-foreground tracking-wide uppercase">Trading OS</p>
      </div>
    </div>
  );
}

function SidebarUser({ onNavigate }: { onNavigate: (id: string) => void }) {
  const { profile, displayName } = useProfile();
  const plan = profile?.plan_type ?? 'free';
  const badge = plan === 'elite'
    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
    : plan === 'pro'
    ? 'bg-primary/10 text-primary border-primary/20'
    : 'bg-muted text-muted-foreground border-border';

  return (
    <button className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors w-full group text-left"
      onClick={() => onNavigate('settings')}>
      <UserAvatar url={profile?.avatar_url ?? null}
        displayName={profile?.display_name || profile?.full_name}
        email={profile?.email ?? null} size="md" editable />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
        <Badge variant="outline" className={`text-[10px] rounded-full px-2 py-0 h-4 border mt-0.5 capitalize ${badge}`}>
          {plan}
        </Badge>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}

function SidebarContent({ active, onNavigate }: {
  active: string; onNavigate: (id: string) => void;
}) {
  const { profile } = useProfile();
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(!!data));
  }, [user]);
  const items = isAdmin ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS;

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 pb-4 flex-shrink-0"><Logo /></div>

      <div className="px-3 flex-1 overflow-y-auto">
        <nav className="space-y-0.5">
          {items.map((item) => {
            const Icon = item.icon;
            const sel  = active === item.id;
            const isAdminItem = item.id === 'admin';
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all',
                  sel
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}>
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="flex-1">{item.label}</span>
                {isAdminItem && !sel && (
                  <span className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 border border-amber-500/20">ADMIN</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 flex-shrink-0 space-y-3">
        {(profile?.plan_type ?? 'free') === 'free' && (
          <div className="rounded-xl bg-primary/10 border border-primary/20 p-4">
            <p className="font-heading font-semibold text-sm text-foreground">Upgrade to Pro</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Unlock AI, CSV import, playbooks</p>
            <Button size="sm" className="w-full rounded-xl h-8 text-xs" onClick={() => onNavigate('pricing')}>
              Start 7-day free trial
            </Button>
          </div>
        )}
        <SidebarUser onNavigate={onNavigate} />
      </div>
    </div>
  );
}

interface AppLayoutProps {
  active: string; onNavigate: (id: string) => void;
  dark: boolean; onToggleTheme: () => void; onLogout: () => void;
  children: React.ReactNode; topBar?: React.ReactNode;
}

export default function AppLayout({ active, onNavigate, dark, children, topBar }: AppLayoutProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => { setOpen(false); }, [active]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className={cx('app-shell flex h-screen overflow-hidden font-body bg-background text-foreground', dark ? 'dark' : '')}>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col border-r overflow-hidden bg-sidebar border-border">
        <SidebarContent active={active} onNavigate={onNavigate} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && <>
          <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
          <motion.aside key="dr" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r overflow-hidden bg-sidebar border-border lg:hidden">
            <button onClick={() => setOpen(false)}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted z-10">
              <X className="h-5 w-5" />
            </button>
            <SidebarContent active={active} onNavigate={onNavigate} />
          </motion.aside>
        </>}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border lg:hidden flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Logo />
          </div>
          <button onClick={() => onNavigate('settings')} className="p-1">
            <UserAvatar url={null} displayName={null} email={null} size="sm" />
          </button>
        </div>

        {topBar}

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden border-t bg-sidebar border-border">
        <div className="flex items-center justify-around px-2 py-1">
          {BOTTOM_NAV.map(item => {
            const Icon = item.icon;
            const sel = active === item.id;
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}
                className={cx('flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all',
                  sel ? 'text-primary' : 'text-muted-foreground')}>
                <Icon className={cx('h-5 w-5', sel && 'drop-shadow-[0_0_6px_rgba(124,58,237,0.6)]')} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
          <button onClick={() => setOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-muted-foreground relative">
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
