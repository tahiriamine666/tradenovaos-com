// src/components/AppLayout.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Award, BarChart3, BookOpen, Brain, CalendarClock, CalendarDays,
  CheckCircle2, ChevronRight, Circle, CircleDollarSign, ClipboardCheck,
  LayoutDashboard, List, Lock, Menu, PanelLeftClose, PanelLeftOpen, Search, Settings, Shield, Users, X,
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
import BrandLogo from '@/components/BrandLogo';


export const BASE_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',  icon: LayoutDashboard },
  { id: 'journal',   label: 'Journal',    icon: BookOpen },
  { id: 'trades',    label: 'Trade Logs', icon: List },
  { id: 'analytics', label: 'Analytics',  icon: BarChart3 },
  { id: 'ai',        label: 'Nova AI',    icon: Brain },
  { id: 'plan',      label: 'Checklist',  icon: ClipboardCheck },
  { id: 'economic',  label: 'Economic',   icon: CalendarClock },
  { id: 'certificates', label: 'Certificates', icon: Award },
  { id: 'settings',  label: 'Settings',   icon: Settings },
];

const BOTTOM_NAV = [
  { id: 'dashboard', icon: LayoutDashboard, label: 'Home' },
  { id: 'plan',    icon: CalendarDays,    label: 'Plan' },
  { id: 'trades',  icon: CircleDollarSign, label: 'Trades' },
  { id: 'community', icon: Users,          label: 'Community' },
  { id: 'settings', icon: Settings,         label: 'Settings' },
];

function cx(...v: (string|boolean|undefined|null)[]) { return v.filter(Boolean).join(' '); }

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <BrandLogo className="w-11 h-11 rounded-md flex-shrink-0 object-cover shadow-[0_0_24px_hsl(var(--primary)/0.28)] ring-1 ring-primary/25" />
      <div className="leading-tight">
        <p className="font-heading font-bold text-foreground tracking-tight text-[15px]">TradeNova</p>
        <p className="text-[10px] text-primary/70 uppercase">Trading OS</p>
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


function SidebarContent({ active, onNavigate, collapsed = false, onToggleCollapse }: {
  active: string; onNavigate: (id: string) => void; collapsed?: boolean; onToggleCollapse?: () => void;
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
      <div className={cx('flex items-center flex-shrink-0 pb-4', collapsed ? 'justify-center px-2 pt-5' : 'justify-between gap-2 p-5 pb-4')}>
        {collapsed ? (
          <Button variant="ghost" size="icon" onClick={onToggleCollapse} title="Expand sidebar" aria-label="Expand sidebar" className="h-10 w-10 text-primary">
            <PanelLeftOpen className="h-5 w-5" />
          </Button>
        ) : <>
          <Logo />
          {onToggleCollapse && <Button variant="ghost" size="icon" onClick={onToggleCollapse} title="Collapse sidebar" aria-label="Collapse sidebar" className="h-8 w-8 shrink-0 text-muted-foreground"><PanelLeftClose className="h-4 w-4" /></Button>}
        </>}
      </div>

      {showCourseTree && !collapsed ? (
        <CourseTreeNav onBack={() => setForceMainNav(true)} />
      ) : (
        <div className={cx('flex-1 overflow-y-auto', collapsed ? 'px-2' : 'px-3')}>
          <nav className="space-y-0.5">
            {items.map((item) => {
              const Icon = item.icon;
              const sel  = active === item.id;
              const isAdminItem = item.id === 'admin';
              return (
                 <Button key={item.id} variant="ghost" title={collapsed ? item.label : undefined} aria-label={item.label} aria-current={sel ? 'page' : undefined} onClick={() => onNavigate(item.id)}
                  className={cx(
                     'flex w-full items-center rounded-md text-sm font-medium transition-all',
                     collapsed ? 'h-10 justify-center px-0' : 'h-10 justify-start gap-3 px-3',
                    sel
                      ? 'bg-primary/15 text-primary border border-primary/25 shadow-[inset_3px_0_0_hsl(var(--primary)),0_0_24px_hsl(var(--primary)/0.10)]'
                      : 'border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border',
                  )}>
                  <Icon className="h-4 w-4 flex-shrink-0" />
                   {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                   {!collapsed && isAdminItem && !sel && (
                    <span className="text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">ADMIN</span>
                  )}
                 </Button>
              );
            })}
          </nav>
        </div>
      )}

      <div className={cx('flex-shrink-0', collapsed ? 'p-2' : 'p-4')}>
        {collapsed ? <Button variant="ghost" size="icon" title="Settings" aria-label="Settings" onClick={() => onNavigate('settings')} className="w-full"><Settings className="h-4 w-4" /></Button> : <SidebarUser onNavigate={onNavigate} />}
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
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('tradenova-sidebar-collapsed') === 'true'; } catch { return false; } });
  const toggleCollapsed = () => setCollapsed((value) => {
    try { localStorage.setItem('tradenova-sidebar-collapsed', String(!value)); } catch { /* storage unavailable */ }
    return !value;
  });

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
      <aside className={cx('hidden lg:flex flex-shrink-0 flex-col border-r overflow-hidden bg-sidebar border-border transition-[width] duration-200', collapsed ? 'w-16' : 'w-64')}>
        <SidebarContent active={active} onNavigate={onNavigate} collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
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
