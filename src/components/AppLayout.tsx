// src/components/AppLayout.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, BarChart3, BookOpen, Brain, CalendarDays, CheckCircle2, ChevronRight,
  Circle, CircleDollarSign, LayoutDashboard, Lock, Menu, PlayCircle, Search,
  Settings, Shield, Target, Users, X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useLearningNav, type LearningTreeLesson } from '@/contexts/LearningNavContext';

export const ADMIN_ITEM = { id: 'admin', label: 'Admin Panel', icon: Shield };
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import UserAvatar from '@/components/UserAvatar';
import { useProfile } from '@/hooks/useProfile';
import SupportChat from '@/components/SupportChat';


export const BASE_ITEMS = [
  { id: 'dashboard',  label: 'Command Center',  icon: LayoutDashboard },
  { id: 'plan',     label: 'Trade Plan',     icon: CalendarDays },
  { id: 'trades',     label: 'Trade Vault',      icon: CircleDollarSign },
  { id: 'journal',    label: 'Mind Journal',     icon: BookOpen },
  { id: 'analytics',  label: 'Edge Analytics',   icon: BarChart3 },
  { id: 'replay',     label: 'Replay Studio',    icon: PlayCircle },
  { id: 'community',  label: 'Community',        icon: Users },
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

function CourseTreeNav({
  onBack,
}: {
  onBack: () => void;
}) {
  const { tree } = useLearningNav();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [lockedModal, setLockedModal] = useState<string | null>(null);
  const [notifyState, setNotifyState] = useState<'idle' | 'saving' | 'done'>('idle');


  // Auto-open category that contains the selected lesson; otherwise first cat.
  useEffect(() => {
    if (!tree) return;
    const selectedCat = tree.lessons.find((l) => l.id === tree.selectedLessonId)?.category;
    setOpen((prev) => {
      const next = { ...prev };
      if (selectedCat && !(selectedCat in next)) next[selectedCat] = true;
      if (Object.keys(next).length === 0 && tree.categories[0]) {
        next[tree.categories[0].name] = true;
      }
      return next;
    });
  }, [tree?.selectedLessonId, tree?.categories.length]);

  if (!tree) {
    return (
      <div className="px-3 py-6 text-xs text-muted-foreground">
        Loading lessons…
      </div>
    );
  }

  const search = tree.search.trim().toLowerCase();
  const matches = (l: LearningTreeLesson) =>
    !search || l.title.toLowerCase().includes(search);

  const lessonsByCat: Record<string, LearningTreeLesson[]> = {};
  tree.lessons.forEach((l) => {
    (lessonsByCat[l.category] = lessonsByCat[l.category] || []).push(l);
  });
  Object.values(lessonsByCat).forEach((arr) =>
    arr.sort((a, b) => a.order_index - b.order_index),
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All apps
        </button>
      </div>

      <div className="px-3 pb-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={tree.search}
            onChange={(e) => tree.setSearch(e.target.value)}
            placeholder="Search lessons…"
            className="w-full pl-8 pr-3 py-2 text-xs bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
          />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-3 px-1">
          Course library
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {tree.categories.map((cat) => {
          const allLs = lessonsByCat[cat.name] || [];
          const ls = allLs.filter(matches);
          if (cat.is_locked) {
            // Locked category: show name + count only, no expand, click → modal
            return (
              <div key={cat.id} className="mb-0.5">
                <button
                  onClick={() => { setLockedModal(cat.name); setNotifyState('idle'); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  <Lock className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
                  {cat.emoji && <span className="text-sm flex-shrink-0 opacity-60">{cat.emoji}</span>}
                  <span className="flex-1 truncate">{cat.name}</span>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{allLs.length}</span>
                </button>
              </div>
            );
          }
          if (ls.length === 0 && search) return null;
          const done = ls.filter((l) => tree.progress[l.id]?.completed).length;
          const isOpen = !!open[cat.name] || (!!search && ls.length > 0);
          const hasSelected = ls.some((l) => l.id === tree.selectedLessonId);
          return (
            <div key={cat.id} className="mb-0.5">
              <button
                onClick={() =>
                  setOpen((o) => ({ ...o, [cat.name]: !isOpen }))
                }
                className={cx(
                  'w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-medium transition-colors',
                  hasSelected
                    ? 'text-primary'
                    : 'text-foreground hover:bg-muted',
                )}
              >
                <ChevronRight
                  className={cx(
                    'h-3.5 w-3.5 flex-shrink-0 text-muted-foreground transition-transform',
                    isOpen && 'rotate-90',
                  )}
                />
                {cat.emoji && (
                  <span className="text-sm flex-shrink-0">{cat.emoji}</span>
                )}
                <span className="flex-1 truncate">{cat.name}</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">
                  {done}/{ls.length || allLs.length}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && ls.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden"
                  >
                    <div className="ml-3 pl-3 border-l border-border my-1 space-y-0.5">
                      {ls.map((l) => {
                        const p = tree.progress[l.id];
                        const isDone = p?.completed ?? false;
                        const inProg = !isDone && (p?.progress_pct ?? 0) > 0;
                        const locked = l.is_premium || l.is_pro;
                        const active = l.id === tree.selectedLessonId;
                        return (
                          <button
                            key={l.id}
                            onClick={() => tree.onSelect(l)}
                            className={cx(
                              'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-xs transition-colors',
                              active
                                ? 'bg-primary text-primary-foreground font-medium'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                            )}
                          >
                            <span className="flex-1 truncate leading-snug">
                              {l.title}
                            </span>
                            <span className="flex-shrink-0">
                              {locked ? (
                                <Lock className={cx('h-3 w-3', active ? 'text-primary-foreground/80' : 'text-muted-foreground')} />
                              ) : isDone ? (
                                <CheckCircle2 className={cx('h-3.5 w-3.5', active ? 'text-primary-foreground' : 'text-success')} />
                              ) : inProg ? (
                                <div className={cx('h-2 w-2 rounded-full', active ? 'bg-primary-foreground' : 'bg-primary')} />
                              ) : (
                                <Circle className="h-3 w-3 text-muted-foreground/50" />
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <LockedCategoryModal
        categoryName={lockedModal}
        onClose={() => setLockedModal(null)}
        notifyState={notifyState}
        onNotify={async () => {
          if (notifyState !== 'idle' || !lockedModal) return;
          setNotifyState('saving');
          try {
            const { data: { user: u } } = await supabase.auth.getUser();
            await supabase.from('support_messages').insert({
              user_id: u?.id ?? null,
              subject: `Notify me: ${lockedModal}`,
              message: `User requested to be notified when the "${lockedModal}" learning path is released.`,
              status: 'new',
            } as any);
          } catch { /* swallow — UX is the same */ }
          setNotifyState('done');
        }}
      />
    </div>
  );
}

function LockedCategoryModal({
  categoryName, onClose, onNotify, notifyState,
}: {
  categoryName: string | null;
  onClose: () => void;
  onNotify: () => void;
  notifyState: 'idle' | 'saving' | 'done';
}) {
  return (
    <Dialog open={!!categoryName} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-3 flex items-center gap-2">
            <Badge className="rounded-full bg-primary/10 text-primary hover:bg-primary/10">
              <Lock className="mr-1 h-3 w-3" />
              Coming soon
            </Badge>
          </div>
          <DialogTitle className="font-heading text-xl">Category Locked</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {categoryName ? <><span className="text-foreground font-medium">{categoryName}</span> — t</> : 'T'}his learning path is not available yet and will be released in a future TradeNova Academy update.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="ghost" onClick={onClose}>Close</Button>
          <Button onClick={onNotify} disabled={notifyState !== 'idle'}>
            {notifyState === 'done' ? '✓ You\'ll be notified' : notifyState === 'saving' ? 'Saving…' : 'Notify Me'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function SidebarContent({ active, onNavigate }: {
  active: string; onNavigate: (id: string) => void;
}) {
  const { user } = useAuth();
  const { tree } = useLearningNav();
  const [isAdmin, setIsAdmin] = useState(false);
  const [forceMainNav, setForceMainNav] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  // Reset the "All apps" override whenever the active route changes.
  useEffect(() => { setForceMainNav(false); }, [active]);

  const items = isAdmin ? [...BASE_ITEMS, ADMIN_ITEM] : BASE_ITEMS;
  const showCourseTree = active === 'resources' && !!tree && !forceMainNav;

  return (
    <div className="flex flex-col h-full">
      <div className="p-5 pb-4 flex-shrink-0"><Logo /></div>

      {showCourseTree ? (
        <CourseTreeNav onBack={() => setForceMainNav(true)} />
      ) : (
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
                    <span className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">ADMIN</span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      )}

      <div className="p-4 flex-shrink-0">
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
