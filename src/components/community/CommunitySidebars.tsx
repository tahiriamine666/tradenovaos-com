import React from 'react';
import { UserPlus, Trophy, Flame } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import {
  CATEGORY_META, useCommunityProfile, useSuggestedTraders, useFollow, tierBadgeClass,
  type PostCategory, type CommunityProfile,
} from '@/hooks/useCommunity';
import { supabase } from '@/integrations/supabase/client';

type Filter =
  | { kind: 'category'; value: PostCategory }
  | { kind: 'my' }
  | { kind: 'bookmarks' };

const LEFT_ITEMS: Array<{ label: string; filter: Filter; icon: string }> = [
  { label: 'Feed',          filter: { kind: 'category', value: 'feed' },         icon: '🌐' },
  { label: 'Trade Ideas',   filter: { kind: 'category', value: 'trade-ideas' },  icon: '📈' },
  { label: 'Setups',        filter: { kind: 'category', value: 'setups' },       icon: '🎯' },
  { label: 'Psychology',    filter: { kind: 'category', value: 'psychology' },   icon: '🧠' },
  { label: 'Risk',          filter: { kind: 'category', value: 'risk' },         icon: '🛡️' },
  { label: 'ICT',           filter: { kind: 'category', value: 'ict' },          icon: '🕯️' },
  { label: 'SMC',           filter: { kind: 'category', value: 'smc' },          icon: '🏛️' },
  { label: 'Funded Traders',filter: { kind: 'category', value: 'funded' },       icon: '🏆' },
];
const FOOTER_ITEMS: Array<{ label: string; filter: Filter; icon: string }> = [
  { label: 'My Posts',  filter: { kind: 'my' },        icon: '📝' },
  { label: 'Bookmarks', filter: { kind: 'bookmarks' }, icon: '🔖' },
];

export function CommunityLeftRail({
  active, onChange,
}: {
  active: Filter;
  onChange: (f: Filter) => void;
}) {
  const isActive = (f: Filter) => JSON.stringify(f) === JSON.stringify(active);
  const Item = ({ label, filter, icon }: { label: string; filter: Filter; icon: string }) => (
    <button onClick={() => onChange(filter)}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
        isActive(filter)
          ? 'bg-primary/12 text-primary border border-primary/20'
          : 'text-foreground/75 hover:bg-muted hover:text-foreground border border-transparent'
      }`}>
      <span className="text-base">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
    </button>
  );

  return (
    <aside className="hidden lg:block w-60 flex-shrink-0">
      <div className="sticky top-4 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Channels</p>
        {LEFT_ITEMS.map(i => <Item key={i.label} {...i} />)}
        <div className="h-px bg-border my-3 mx-3" />
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Library</p>
        {FOOTER_ITEMS.map(i => <Item key={i.label} {...i} />)}
      </div>
    </aside>
  );
}

export function CommunityRightRail({ onOpenProfile }: {
  onOpenProfile: (profile: CommunityProfile, userId: string) => void;
}) {
  const { user } = useAuth();
  const { profile: me } = useCommunityProfile(user?.id);
  const suggested = useSuggestedTraders(5);
  const [myStats, setMyStats] = React.useState<{ xp: number; streak: number; followers: number } | null>(null);

  React.useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: ls }, { count: followers }] = await Promise.all([
        supabase.from('learning_stats').select('xp_total, streak_days').eq('user_id', user.id).maybeSingle(),
        supabase.from('community_follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', user.id),
      ]);
      setMyStats({
        xp: (ls as any)?.xp_total ?? 0,
        streak: (ls as any)?.streak_days ?? 0,
        followers: followers ?? 0,
      });
    })();
  }, [user]);

  return (
    <aside className="hidden xl:block w-72 flex-shrink-0">
      <div className="sticky top-4 space-y-4">
        {me && (
          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 to-transparent p-4">
            <button
              onClick={() => onOpenProfile(me, me.user_id)}
              className="flex items-center gap-3 w-full text-left"
            >
              <UserAvatar url={me.avatar_url} displayName={me.username} email={null} size="md" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">@{me.username}</p>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${tierBadgeClass(me.experience_level)}`}>
                  {me.experience_level}
                </span>
              </div>
            </button>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
              <Stat icon={Trophy} value={myStats?.xp.toLocaleString() ?? '—'} label="XP" />
              <Stat icon={Flame}  value={myStats?.streak ? `${myStats.streak}d` : '—'} label="Streak" />
              <Stat icon={UserPlus} value={myStats?.followers ?? '—'} label="Followers" />
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Suggested traders</p>
          {suggested.length === 0 ? (
            <p className="text-xs text-muted-foreground">No suggestions yet.</p>
          ) : (
            <div className="space-y-2">
              {suggested.map(p => <SuggestedRow key={p.user_id} profile={p} onOpen={() => onOpenProfile(p, p.user_id)} />)}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-dashed border-border p-4 text-center">
          <p className="text-xs font-semibold text-muted-foreground">Coming soon</p>
          <p className="text-[11px] text-muted-foreground mt-1">Real-time chat, Challenges, Leaderboard, Badges.</p>
        </div>
      </div>
    </aside>
  );
}

function Stat({ icon: Icon, value, label }: { icon: any; value: any; label: string }) {
  return (
    <div className="text-center">
      <Icon className="h-3.5 w-3.5 text-primary mx-auto mb-0.5" />
      <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function SuggestedRow({ profile, onOpen }: { profile: CommunityProfile; onOpen: () => void }) {
  const { following, toggle, loading } = useFollow(profile.user_id);
  return (
    <div className="flex items-center gap-2.5">
      <button onClick={onOpen} className="flex items-center gap-2.5 flex-1 min-w-0 text-left group">
        <UserAvatar url={profile.avatar_url} displayName={profile.username} email={null} size="sm" />
        <div className="min-w-0">
          <p className="text-xs font-bold text-foreground truncate group-hover:text-primary">@{profile.username}</p>
          <p className="text-[10px] text-muted-foreground capitalize">{profile.experience_level}</p>
        </div>
      </button>
      <button onClick={toggle} disabled={loading}
        className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-all ${
          following
            ? 'bg-muted text-muted-foreground border-border'
            : 'bg-primary/10 text-primary border-primary/30 hover:bg-primary/15'
        }`}>
        {following ? 'Following' : 'Follow'}
      </button>
    </div>
  );
}
