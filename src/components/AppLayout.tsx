// ─── AppLayout.tsx ────────────────────────────────────────────────────────────
// Responsive layout: desktop = fixed sidebar, mobile = slide-in drawer + bottom nav
// Drop-in replacement for the hardcoded sidebar + main in Index.tsx

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3, BookOpen, Brain, CalendarDays, CircleDollarSign,
  LayoutDashboard, LogOut, Menu, Moon, PlayCircle,
  Settings, Sun, Target, Upload, X, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Sidebar items ────────────────────────────────────────────────────────────
export const sidebarItems = [
  { id: 'dashboard',  label: 'Command Center',  icon: LayoutDashboard },
  { id: 'plan',       label: 'Trade Plan',       icon: CalendarDays },
  { id: 'trades',     label: 'Trade Vault',      icon: CircleDollarSign },
  { id: 'journal',    label: 'Mind Journal',     icon: BookOpen },
  { id: 'analytics',  label: 'Edge Analytics',   icon: BarChart3 },
  { id: 'playbooks',  label: 'Playbook Lab',     icon: Target },
  { id: 'ai',         label: 'AI Insights',      icon: Brain },
  { id: 'import',     label: 'Import CSV',       icon: Upload },
  { id: 'replay',     label: 'Replay Studio',    icon: PlayCircle },
  { id: 'resources',  label: 'Learning Hub',     icon: Brain },
  { id: 'settings',   label: 'Studio Settings',  icon: Settings },
];

// Bottom nav items (mobile only — most important 5)
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

// ─── Sidebar content (shared between desktop + mobile drawer) ─────────────────
function SidebarContent({
  active,
  onNavigate,
}: {
  active: string;
  onNavigate: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <p className="font-heading font-bold text-foreground">TradeNova</p>
            <p className="text-xs text-muted-foreground">Focused trading workspace</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const selected = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-medium transition-all',
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
      <div className="mt-auto p-6">
        <div className="rounded-xl bg-primary/10 p-4">
          <p className="font-heading font-semibold text-sm text-foreground">Upgrade to Pro</p>
          <p className="text-xs text-muted-foreground mt-1">Unlock replay, AI insights, and imports</p>
          <Button size="sm" className="mt-3 w-full rounded-xl">Start 14-day trial</Button>
        </div>
      </div>
    </div>
  );
}

// ─── Main AppLayout ────────────────────────────────────────────────────────────
interface AppLayoutProps {
  active: string;
  onNavigate: (id: string) => void;
  dark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
  onNewTrade?: () => void;
  children: React.ReactNode;
  pageTitle?: string;
}

export default function AppLayout({
  active,
  onNavigate,
  dark,
  onToggleTheme,
  onLogout,
  onNewTrade,
  children,
  pageTitle,
}: AppLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [active]);

  // Close drawer on escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  const currentPage = sidebarItems.find(i => i.id === active)?.label ?? 'Dashboard';

  return (
    <div className={cx('flex h-screen overflow-hidden font-body', dark ? 'dark' : '')}>

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col border-r overflow-y-auto bg-sidebar border-border">
        <SidebarContent active={active} onNavigate={onNavigate} />
      </aside>

      {/* ── Mobile drawer overlay ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 lg:hidden"
              onClick={() => setDrawerOpen(false)}
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col border-r overflow-y-auto bg-sidebar border-border lg:hidden"
            >
              {/* Close button */}
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <SidebarContent active={active} onNavigate={onNavigate} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Top bar */}
        <header className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-xl h-9 w-9"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Logo on mobile (when no sidebar) */}
            <div className="flex items-center gap-2 lg:hidden">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-sm text-foreground">TradeNova</span>
            </div>

            {/* Page title — desktop */}
            <h1 className="hidden lg:block text-lg font-heading font-bold text-foreground">
              {pageTitle ?? currentPage}
            </h1>
            <Badge className="hidden sm:inline-flex bg-primary/10 text-primary border-0">Pro</Badge>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-1 sm:gap-3">
            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTheme}
              className="rounded-xl h-9 w-9"
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>

            {/* New trade — hidden on small mobile */}
            <Button onClick={onNewTrade} className="hidden sm:inline-flex rounded-xl h-9 text-sm px-4">
              + New Trade
            </Button>

            {/* Logout */}
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              className="rounded-xl h-9 w-9"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        {/* Scrollable page content */}
        {/* pb-20 on mobile to clear the bottom nav */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 lg:pb-8">
          {children}
        </div>
      </main>

      {/* ── Mobile bottom navigation ── */}
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
                  'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all min-w-0',
                  selected ? 'text-primary' : 'text-muted-foreground'
                )}
              >
                <Icon className={cx('h-5 w-5', selected && 'drop-shadow-[0_0_6px_rgba(124,58,237,0.6)]')} />
                <span className="text-[10px] font-medium truncate">{item.label}</span>
              </button>
            );
          })}

          {/* More button → opens drawer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl text-muted-foreground transition-all"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

    </div>
  );
}
