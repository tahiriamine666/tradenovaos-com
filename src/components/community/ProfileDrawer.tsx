import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, UserPlus, UserMinus, Loader2, BookOpen, BarChart3, Flame, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import {
  useCommunityProfile, useFollow, useFeed, relativeTime, tierBadgeClass,
  type CommunityProfile,
} from '@/hooks/useCommunity';

interface Props {
  userId: string | null;
  initialProfile?: CommunityProfile | null;
  onClose: () => void;
}

interface Stats {
  totalTrades: number; winRate: number; playbooks: number; xp: number; streak: number;
}

export default function ProfileDrawer({ userId, initialProfile, onClose }: Props) {
  const { user } = useAuth();
  const { profile, loading } = useCommunityProfile(userId);
  const { following, followers, followingCount, toggle } = useFollow(userId);
  const { posts } = useFeed({ authorId: userId ?? undefined });
  const [stats, setStats] = useState<Stats | null>(null);

  const display = profile ?? initialProfile ?? null;
  const isSelf = user?.id === userId;

  useEffect(() => {
    if (!userId) { setStats(null); return; }
    (async () => {
      const [{ data: trades }, { data: playbooks }, { data: ls }] = await Promise.all([
        supabase.from('trades').select('result').eq('user_id', userId),
        supabase.from('playbooks').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('learning_stats').select('xp_total, streak_days').eq('user_id', userId).maybeSingle(),
      ]);
      const all = (trades ?? []) as { result: number | null }[];
      const wins = all.filter(t => (t.result ?? 0) > 0).length;
      setStats({
        totalTrades: all.length,
        winRate: all.length > 0 ? Math.round((wins / all.length) * 100) : 0,
        playbooks: (playbooks as any)?.length ?? 0,
        xp: (ls as any)?.xp_total ?? 0,
        streak: (ls as any)?.streak_days ?? 0,
      });
    })();
  }, [userId]);

  return (
    <AnimatePresence>
      {userId && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-[60] w-full max-w-md bg-background border-l border-border flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
              <p className="text-sm font-bold text-foreground">Trader Profile</p>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading && !display ? (
                <div className="flex justify-center pt-20"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
              ) : !display ? (
                <p className="text-center text-sm text-muted-foreground pt-20">Profile not found.</p>
              ) : (
                <>
                  {/* Header */}
                  <div className="p-6 pb-4 bg-gradient-to-br from-primary/8 to-transparent">
                    <div className="flex items-start gap-4">
                      <UserAvatar url={display.avatar_url} displayName={display.username} email={null} size="lg" />
                      <div className="flex-1 min-w-0 pt-1">
                        <h2 className="text-xl font-bold text-foreground truncate">@{display.username}</h2>
                        <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tierBadgeClass(display.experience_level)}`}>
                          {display.experience_level}
                        </span>
                        {display.bio && <p className="text-sm text-foreground/75 mt-2 leading-relaxed">{display.bio}</p>}
                      </div>
                    </div>

                    {!isSelf && user && (
                      <button onClick={toggle}
                        className={`w-full mt-4 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                          following
                            ? 'bg-muted text-foreground hover:bg-muted/80'
                            : 'bg-primary text-primary-foreground hover:bg-primary/90'
                        }`}>
                        {following ? <><UserMinus className="h-4 w-4" /> Following</> : <><UserPlus className="h-4 w-4" /> Follow</>}
                      </button>
                    )}
                  </div>

                  {/* Stat row */}
                  <div className="grid grid-cols-4 gap-px bg-border mx-5 rounded-xl overflow-hidden">
                    <Stat label="Followers" value={followers} />
                    <Stat label="Following" value={followingCount} />
                    <Stat label="Posts" value={posts.length} />
                    <Stat label="Win rate" value={stats ? `${stats.winRate}%` : '—'} tone={stats && stats.winRate >= 50 ? 'good' : stats ? 'bad' : undefined} />
                  </div>

                  {/* Trader stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-5">
                    <Pill icon={BarChart3} label="Trades" value={stats?.totalTrades ?? '—'} />
                    <Pill icon={BookOpen} label="Playbooks" value={stats?.playbooks ?? '—'} />
                    <Pill icon={Trophy} label="XP" value={stats?.xp.toLocaleString() ?? '—'} />
                    <Pill icon={Flame} label="Streak" value={stats?.streak ? `${stats.streak}d` : '—'} />
                  </div>

                  {/* Recent posts */}
                  <div className="px-5 pb-6">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 px-1">Recent Posts</p>
                    {posts.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6 rounded-xl border border-dashed border-border">No posts yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {posts.slice(0, 8).map(p => (
                          <div key={p.id} className="rounded-xl border border-border bg-card p-3">
                            <p className="text-sm font-semibold text-foreground line-clamp-1">{p.title}</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">{relativeTime(p.created_at)} · {p.like_count} likes · {p.comment_count} comments</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Stat({ label, value, tone }: { label: string; value: any; tone?: 'good' | 'bad' }) {
  return (
    <div className="bg-card p-2.5 text-center">
      <p className={`text-base font-black tabular-nums ${tone === 'good' ? 'text-emerald-500' : tone === 'bad' ? 'text-red-500' : 'text-foreground'}`}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
function Pill({ icon: Icon, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <Icon className="h-4 w-4 text-primary mb-1" />
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
