// src/components/AppLayout.tsx
// Updated layout:
// - Real TradeNova logo (PNG) in sidebar header
// - User avatar in sidebar footer (editable)
// - User avatar in topbar right (like YouTube) — click opens settings
// - Mobile drawer + bottom nav unchanged

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, BookOpen, Brain, CalendarDays, CircleDollarSign,
  LayoutDashboard, LogOut, Menu, PlayCircle,
  Settings, Target, Upload, X, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─── Sidebar items ────────────────────────────────────────────────────────────
export const sidebarItems = [
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
  { id: 'admin',      label: 'Admin',            icon: ShieldCheck },
];

const bottomNavItems = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { id: 'trades',    icon: CircleDollarSign, label: 'Trades' },
  { id: 'journal',   icon: BookOpen,         label: 'Journal' },
  { id: 'analytics', icon: BarChart3,        label: 'Analytics' },
  { id: 'settings',  icon: Settings,         label: 'Settings' },
];

function cx(...vals: (string | boolean | undefined | null)[]) {
  return vals.filter(Boolean).join(' ');
}

// ─── TradeNova Logo ───────────────────────────────────────────────────────────
// Uses the uploaded PNG icon + wordmark
function TradeNovaLogo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {/* PNG icon — place tradenova-icon.png in /public/tradenova-icon.png */}
      <img
        src="/tradenova-icon.png"
        alt="TradeNova"
        className="w-10 h-10 rounded-xl flex-shrink-0"
        onError={e => {
          // Fallback to CSS icon if image not found
          const el = e.target as HTMLImageElement;
          el.style.display = 'none';
          el.nextElementSibling?.classList.remove('hidden');
        }}
      />
      {/* Fallback icon (hidden unless image fails) */}
      <div className="hidden w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
        <BarChart3 className="h-5 w-5 text-primary-foreground" />
      </div>
      {!collapsed && (
        <div>
          <p className="font-heading font-bold text-foreground leading-tight">TradeNova</p>
          <p className="text-[10px] text-muted-foreground">Trading OS</p>
        </div>
      )}
    </div>
  );
}

// ─── User profile section in sidebar ─────────────────────────────────────────
interface UserProfile {
  display_name: string | null;
  full_name:    string | null;
  email:        string | null;
  avatar_url:   string | null;
  subscription_plan: string;
}

function SidebarUserSection({
  profile,
  onNavigate,
  onAvatarUpdated,
}: {
  profile: UserProfile | null;
  onNavigate: (id: string) => void;
  onAvatarUpdated: (url: string) => void;
}) {
  const name = profile?.display_name || profile?.full_name || profile?.email?.split('@')[0] || 'Trader';
  const plan = profile?.subscription_plan ?? 'free';

  const planColor =
    plan === 'elite' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
    plan === 'pro'   ? 'bg-primary/10 text-primary border-primary/20' :
    'bg-muted text-muted-foreground border-border';

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors cursor-pointer group"
      onClick={() => onNavigate('settings')}
    >
      <UserAvatar
        url={profile?.avatar_url ?? null}
        displayName={profile?.display_name || profile?.full_name}
        email={profile?.email ?? null}
        size="md"
        editable
        onUpdated={onAvatarUpdated}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{name}</p>
        <Badge variant="outline" className={`text-[10px] rounded-full px-2 py-0 h-4 capitalize border ${planColor}`}>
          {plan}
        </Badge>
      </div>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
}

// ─── Sidebar content ──────────────────────────────────────────────────────────
function SidebarContent({
  active,
  onNavigate,
  profile,
  onAvatarUpdated,
}: {
  active: string;
  onNavigate: (id: string) => void;
  profile: UserProfile | null;
  onAvatarUpdated: (url: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 pb-4">
        <TradeNovaLogo />
      </div>

      {/* Nav */}
      <div className="px-3 flex-1 overflow-y-auto">
        <nav className="space-y-0.5">
          {sidebarItems.map(item => {
            const Icon = item.icon;
            const selected = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all',
                  selected
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Upgrade card */}
      <div className="p-4">
        {(profile?.subscription_plan ?? 'free') === 'free' && (
          <div className="rounded-xl bg-primary/10 p-4 mb-3">
            <p className="font-heading font-semibold text-sm text-foreground">Upgrade to Pro</p>
            <p className="text-xs text-muted-foreground mt-1 mb-3">Unlock AI, CSV import, playbooks</p>
            <Button size="sm" className="w-full rounded-xl h-8 text-xs" onClick={() => onNavigate('pricing')}>
              Start 14-day trial
            </Button>
          </div>
        )}

        {/* User profile section */}
        <SidebarUserSection
          profile={profile}
          onNavigate={onNavigate}
          onAvatarUpdated={onAvatarUpdated}
        />
      </div>
    </div>
  );
}

// ─── Main AppLayout ────────────────────────────────────────────────────────────
interface AppLayoutProps {
  active:          string;
  onNavigate:      (id: string) => void;
  dark:            boolean;
  onToggleTheme:   () => void;
  onLogout:        () => void;
  children:        React.ReactNode;
  topBar?:         React.ReactNode; // slot for TopBar component
}

export default function AppLayout({
  active, onNavigate, dark, onToggleTheme, onLogout, children, topBar,
}: AppLayoutProps) {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profile,    setProfile]    = useState<UserProfile | null>(null);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('profiles')
      .select('display_name, full_name, email, avatar_url, subscription_plan')
      .eq('id', user.id)
      .single();
    if (data) setProfile(data as UserProfile);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [active]);

  // Keyboard + scroll lock
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const handleAvatarUpdated = useCallback((url: string) => {
    setProfile(p => p ? { ...p, avatar_url: url } : p);
  }, []);

  const currentPage = sidebarItems.find(i => i.id === active)?.label ?? 'Dashboard';

  return (
    <div className={cx('flex h-screen overflow-hidden font-body', dark ? 'dark' : '')}>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col border-r overflow-hidden bg-sidebar border-border">
        <SidebarContent
          active={active}
          onNavigate={onNavigate}
          profile={profile}
          onAvatarUpdated={handleAvatarUpdated}
        />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r overflow-hidden bg-sidebar border-border lg:hidden"
            >
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors z-10"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent
                active={active}
                onNavigate={onNavigate}
                profile={profile}
                onAvatarUpdated={handleAvatarUpdated}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Mobile-only top bar (hamburger + logo + avatar) */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border lg:hidden flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl h-9 w-9"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <TradeNovaLogo />
          </div>

          {/* Avatar top-right on mobile (like YouTube) */}
          <div
            className="cursor-pointer"
            onClick={() => onNavigate('settings')}
          >
            <UserAvatar
              url={profile?.avatar_url ?? null}
              displayName={profile?.display_name || profile?.full_name}
              email={profile?.email ?? null}
              size="sm"
            />
          </div>
        </div>

        {/* Desktop TopBar slot (contains filters + theme + logout + avatar) */}
        {topBar}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom nav ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 lg:hidden border-t bg-sidebar border-border">
        <div className="flex items-center justify-around px-2 py-1">
          {bottomNavItems.map(item => {
            const Icon = item.icon;
            const selected = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cx(
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all',
                  selected ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className={cx('h-5 w-5', selected && 'drop-shadow-[0_0_6px_rgba(124,58,237,0.6)]')} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
