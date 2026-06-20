import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';

/* =========================================================
 * Types
 * ======================================================= */
export type PostType = 'discussion' | 'trade_idea' | 'lesson' | 'question' | 'replay_review' | 'journal_insight';
export type PostCategory = 'feed' | 'trade-ideas' | 'setups' | 'psychology' | 'risk' | 'ict' | 'smc' | 'funded';
export type Visibility = 'public' | 'pro' | 'elite';

export interface TradeIdea {
  pair?: string; direction?: 'long' | 'short';
  entry?: number | string; sl?: number | string; tp?: number | string;
  risk_pct?: number | string; setup?: string; expected_rr?: number | string;
}

export interface CommunityProfile {
  user_id: string; username: string; bio: string | null;
  avatar_url: string | null; experience_level: 'beginner' | 'intermediate' | 'advanced' | 'elite';
}

export interface CommunityPost {
  id: string; user_id: string; type: PostType; category: PostCategory;
  title: string; content: string; tags: string[]; image_urls: string[];
  visibility: Visibility; trade_idea: TradeIdea | null;
  like_count: number; comment_count: number; bookmark_count: number;
  is_pinned: boolean; created_at: string;
  author?: CommunityProfile | null;
  liked?: boolean; bookmarked?: boolean;
}

export interface CommunityComment {
  id: string; post_id: string; user_id: string; parent_comment_id: string | null;
  content: string; like_count: number; created_at: string;
  author?: CommunityProfile | null;
}

/* =========================================================
 * Profile bootstrap — ensures the current user has a row in
 * community_profiles, derived from their app profile.
 * ======================================================= */
export function useCommunityProfile(userId?: string | null) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const target = userId ?? user?.id ?? null;
  const [data, setData] = useState<CommunityProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const ensureSelf = useCallback(async () => {
    if (!user || target !== user.id) return;
    const { data: existing } = await supabase
      .from('community_profiles').select('*').eq('user_id', user.id).maybeSingle();
    if (existing) { setData(existing as CommunityProfile); return; }

    const baseName = (profile?.display_name || profile?.full_name || (profile?.email ?? '').split('@')[0] || 'trader')
      .toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 18) || 'trader';
    let username = baseName;
    for (let i = 0; i < 6; i++) {
      const { data: row } = await supabase
        .from('community_profiles')
        .insert({
          user_id: user.id,
          username,
          avatar_url: profile?.avatar_url ?? null,
          experience_level: 'beginner',
        })
        .select().maybeSingle();
      if (row) { setData(row as CommunityProfile); return; }
      username = `${baseName}${Math.floor(Math.random() * 9000) + 1000}`;
    }
  }, [user, target, profile]);

  const load = useCallback(async () => {
    if (!target) { setLoading(false); return; }
    setLoading(true);
    const { data: row } = await supabase
      .from('community_profiles').select('*').eq('user_id', target).maybeSingle();
    setData((row as CommunityProfile) ?? null);
    setLoading(false);
    if (!row && user && target === user.id) await ensureSelf();
  }, [target, user, ensureSelf]);

  useEffect(() => { load(); }, [load]);

  const update = useCallback(async (patch: Partial<Pick<CommunityProfile, 'username' | 'bio' | 'avatar_url' | 'experience_level'>>) => {
    if (!user) return;
    const { data: row, error } = await supabase
      .from('community_profiles').update(patch).eq('user_id', user.id).select().maybeSingle();
    if (!error && row) setData(row as CommunityProfile);
    return { error };
  }, [user]);

  return { profile: data, loading, reload: load, update };
}

/* =========================================================
 * Feed — paginated query + Realtime
 * ======================================================= */
const PAGE = 20;

export function useFeed(opts: {
  category?: PostCategory | null;
  type?: PostType | null;
  authorId?: string | null;
  bookmarksOnly?: boolean;
}) {
  const { user } = useAuth();
  const { category, type, authorId, bookmarksOnly } = opts;
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const cursor = useRef<string | null>(null);
  const inflight = useRef(false);

  const hydrate = useCallback(async (raw: any[]): Promise<CommunityPost[]> => {
    if (raw.length === 0) return [];
    const userIds = Array.from(new Set(raw.map(p => p.user_id)));
    const ids = raw.map(p => p.id);
    const [{ data: authors }, likes, bookmarks] = await Promise.all([
      supabase.from('community_profiles').select('*').in('user_id', userIds),
      user ? supabase.from('community_likes').select('target_id')
        .eq('user_id', user.id).eq('target_type', 'post').in('target_id', ids) : Promise.resolve({ data: [] as any[] }),
      user ? supabase.from('community_bookmarks').select('post_id')
        .eq('user_id', user.id).in('post_id', ids) : Promise.resolve({ data: [] as any[] }),
    ]);
    const aMap = new Map((authors ?? []).map((a: any) => [a.user_id, a as CommunityProfile]));
    const likedSet = new Set((likes.data ?? []).map((l: any) => l.target_id));
    const bmSet = new Set((bookmarks.data ?? []).map((b: any) => b.post_id));
    return raw.map(p => ({
      ...p,
      author: aMap.get(p.user_id) ?? null,
      liked: likedSet.has(p.id),
      bookmarked: bmSet.has(p.id),
    })) as CommunityPost[];
  }, [user]);

  const fetchPage = useCallback(async (reset: boolean) => {
    if (inflight.current) return;
    inflight.current = true;
    if (reset) { setLoading(true); cursor.current = null; }

    let q = supabase.from('community_posts').select('*').order('created_at', { ascending: false }).limit(PAGE);
    if (cursor.current) q = q.lt('created_at', cursor.current);
    if (category && category !== 'feed') q = q.eq('category', category);
    if (type) q = q.eq('type', type);
    if (authorId) q = q.eq('user_id', authorId);

    let rows: any[] = [];
    if (bookmarksOnly && user) {
      const { data: bm } = await supabase.from('community_bookmarks')
        .select('post_id, created_at').eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .lt('created_at', cursor.current ?? new Date(8640000000000000).toISOString())
        .limit(PAGE);
      const ids = (bm ?? []).map((b: any) => b.post_id);
      if (ids.length === 0) { rows = []; }
      else {
        const { data } = await supabase.from('community_posts').select('*').in('id', ids);
        rows = (data ?? []).sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));
      }
      if ((bm ?? []).length < PAGE) setHasMore(false);
      if (bm && bm.length > 0) cursor.current = (bm[bm.length - 1] as any).created_at;
    } else {
      const { data } = await q;
      rows = data ?? [];
      if (rows.length < PAGE) setHasMore(false); else setHasMore(true);
      if (rows.length > 0) cursor.current = rows[rows.length - 1].created_at;
    }

    const hydrated = await hydrate(rows);
    setPosts(prev => reset ? hydrated : [...prev, ...hydrated]);
    setLoading(false);
    inflight.current = false;
  }, [category, type, authorId, bookmarksOnly, user, hydrate]);

  // Reset on filter change
  useEffect(() => {
    setPosts([]); setHasMore(true); cursor.current = null;
    fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, type, authorId, bookmarksOnly, user?.id]);

  // Realtime: new posts inserted into matching category appear on top.
  useEffect(() => {
    if (bookmarksOnly || authorId) return;
    const channel = supabase
      .channel(`community_feed_${category ?? 'all'}_${type ?? 'all'}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'community_posts' }, async (payload) => {
        const row: any = payload.new;
        if (category && category !== 'feed' && row.category !== category) return;
        if (type && row.type !== type) return;
        const [hydrated] = await hydrate([row]);
        if (hydrated) setPosts(prev => prev.find(p => p.id === hydrated.id) ? prev : [hydrated, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'community_posts' }, (payload) => {
        const row: any = payload.new;
        setPosts(prev => prev.map(p => p.id === row.id ? { ...p, ...row } : p));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'community_posts' }, (payload) => {
        const old: any = payload.old;
        setPosts(prev => prev.filter(p => p.id !== old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [category, type, authorId, bookmarksOnly, hydrate]);

  const loadMore = useCallback(() => { if (!loading && hasMore) fetchPage(false); }, [loading, hasMore, fetchPage]);
  const refresh = useCallback(() => fetchPage(true), [fetchPage]);

  // Local optimistic mutations
  const toggleLike = useCallback(async (post: CommunityPost) => {
    if (!user) return;
    const wasLiked = !!post.liked;
    setPosts(prev => prev.map(p => p.id === post.id
      ? { ...p, liked: !wasLiked, like_count: Math.max(0, p.like_count + (wasLiked ? -1 : 1)) }
      : p));
    if (wasLiked) {
      await supabase.from('community_likes').delete()
        .eq('user_id', user.id).eq('target_type', 'post').eq('target_id', post.id);
    } else {
      await supabase.from('community_likes').insert({
        user_id: user.id, target_type: 'post', target_id: post.id,
      });
    }
  }, [user]);

  const toggleBookmark = useCallback(async (post: CommunityPost) => {
    if (!user) return;
    const was = !!post.bookmarked;
    setPosts(prev => prev.map(p => p.id === post.id
      ? { ...p, bookmarked: !was, bookmark_count: Math.max(0, p.bookmark_count + (was ? -1 : 1)) }
      : p));
    if (was) {
      await supabase.from('community_bookmarks').delete()
        .eq('user_id', user.id).eq('post_id', post.id);
    } else {
      await supabase.from('community_bookmarks').insert({ user_id: user.id, post_id: post.id });
    }
  }, [user]);

  const deletePost = useCallback(async (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    await supabase.from('community_posts').delete().eq('id', postId);
  }, []);

  return { posts, loading, hasMore, loadMore, refresh, toggleLike, toggleBookmark, deletePost };
}

/* =========================================================
 * Follow
 * ======================================================= */
export function useFollow(targetUserId: string | null | undefined) {
  const { user } = useAuth();
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    const [a, b, c] = await Promise.all([
      user ? supabase.from('community_follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('follower_id', user.id).eq('following_id', targetUserId)
        : Promise.resolve({ count: 0 }),
      supabase.from('community_follows')
        .select('follower_id', { count: 'exact', head: true })
        .eq('following_id', targetUserId),
      supabase.from('community_follows')
        .select('following_id', { count: 'exact', head: true })
        .eq('follower_id', targetUserId),
    ]);
    setFollowing(((a as any).count ?? 0) > 0);
    setFollowers((b as any).count ?? 0);
    setFollowingCount((c as any).count ?? 0);
    setLoading(false);
  }, [targetUserId, user]);

  useEffect(() => { load(); }, [load]);

  const toggle = useCallback(async () => {
    if (!user || !targetUserId || user.id === targetUserId) return;
    if (following) {
      setFollowing(false); setFollowers(n => Math.max(0, n - 1));
      await supabase.from('community_follows').delete()
        .eq('follower_id', user.id).eq('following_id', targetUserId);
    } else {
      setFollowing(true); setFollowers(n => n + 1);
      await supabase.from('community_follows').insert({
        follower_id: user.id, following_id: targetUserId,
      });
    }
  }, [user, targetUserId, following]);

  return { following, followers, followingCount, loading, toggle, reload: load };
}

/* =========================================================
 * Suggested traders to follow
 * ======================================================= */
export function useSuggestedTraders(limit = 5) {
  const { user } = useAuth();
  const [list, setList] = useState<CommunityProfile[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('community_profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      const filtered = (data ?? []).filter((p: any) => !user || p.user_id !== user.id) as CommunityProfile[];
      setList(filtered.slice(0, limit));
    })();
  }, [user, limit]);

  return list;
}

/* =========================================================
 * Helpers
 * ======================================================= */
export function relativeTime(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = (Date.now() - d) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}

export function useSignedImageUrls(paths: string[]) {
  const [urls, setUrls] = useState<string[]>([]);
  const key = paths.join('|');
  useEffect(() => {
    let alive = true;
    if (paths.length === 0) { setUrls([]); return; }
    // Paths may already be full URLs (legacy / external). Only sign storage paths.
    const storagePaths = paths.map(p => p.startsWith('http') ? null : p);
    (async () => {
      const out: string[] = [];
      for (let i = 0; i < paths.length; i++) {
        const sp = storagePaths[i];
        if (sp == null) { out.push(paths[i]); continue; }
        const { data } = await supabase.storage.from('community-uploads').createSignedUrl(sp, 60 * 60 * 24);
        out.push(data?.signedUrl ?? '');
      }
      if (alive) setUrls(out);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return urls;
}

export function tierBadgeClass(level: string): string {
  switch (level) {
    case 'elite': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
    case 'advanced': return 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30';
    case 'intermediate': return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
    default: return 'bg-muted text-muted-foreground border-border';
  }
}

export const CATEGORY_META: Record<PostCategory, { label: string; icon: string }> = {
  'feed': { label: 'Feed', icon: '🌐' },
  'trade-ideas': { label: 'Trade Ideas', icon: '📈' },
  'setups': { label: 'Setups', icon: '🎯' },
  'psychology': { label: 'Psychology', icon: '🧠' },
  'risk': { label: 'Risk', icon: '🛡️' },
  'ict': { label: 'ICT', icon: '🕯️' },
  'smc': { label: 'SMC', icon: '🏛️' },
  'funded': { label: 'Funded Traders', icon: '🏆' },
};

export const TYPE_META: Record<PostType, { label: string; tone: string }> = {
  'discussion':       { label: 'Discussion',     tone: 'bg-muted text-foreground/80 border-border' },
  'trade_idea':       { label: 'Trade Idea',     tone: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30' },
  'lesson':           { label: 'Lesson',         tone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
  'question':         { label: 'Question',       tone: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30' },
  'replay_review':    { label: 'Replay Review',  tone: 'bg-fuchsia-500/15 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30' },
  'journal_insight':  { label: 'Journal',        tone: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30' },
};

export function useUserTier(): 'free' | 'pro' | 'elite' {
  const { profile } = useProfile();
  return useMemo(() => {
    const plan = (profile as any)?.plan_type ?? 'free';
    const status = (profile as any)?.subscription_status ?? 'inactive';
    if (plan === 'elite' && (status === 'active' || status === 'trialing')) return 'elite';
    if (plan === 'pro'   && (status === 'active' || status === 'trialing')) return 'pro';
    return 'free';
  }, [profile]);
}
