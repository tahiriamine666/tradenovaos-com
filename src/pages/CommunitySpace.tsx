import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Search, Users } from 'lucide-react';
import PostComposer from '@/components/community/PostComposer';
import PostCard from '@/components/community/PostCard';
import PostDetailDrawer from '@/components/community/PostDetailDrawer';
import ProfileDrawer from '@/components/community/ProfileDrawer';
import { CommunityLeftRail, CommunityRightRail } from '@/components/community/CommunitySidebars';
import {
  useFeed, useCommunityProfile, CATEGORY_META,
  type PostCategory, type CommunityPost, type CommunityProfile,
} from '@/hooks/useCommunity';
import { useAuth } from '@/contexts/AuthContext';

type Filter =
  | { kind: 'category'; value: PostCategory }
  | { kind: 'my' }
  | { kind: 'bookmarks' };

export default function CommunitySpace() {
  const { user } = useAuth();
  useCommunityProfile(user?.id); // bootstrap own profile on first visit

  const [filter, setFilter] = useState<Filter>({ kind: 'category', value: 'feed' });
  const [search, setSearch] = useState('');
  const [openPost, setOpenPost] = useState<CommunityPost | null>(null);
  const [openProfileId, setOpenProfileId] = useState<string | null>(null);
  const [openProfileSeed, setOpenProfileSeed] = useState<CommunityProfile | null>(null);

  const feedOpts = useMemo(() => {
    if (filter.kind === 'category') return { category: filter.value };
    if (filter.kind === 'my')       return { authorId: user?.id ?? null };
    return { bookmarksOnly: true };
  }, [filter, user?.id]);

  const { posts, loading, hasMore, loadMore, toggleLike, toggleBookmark, deletePost } = useFeed(feedOpts);

  const filtered = useMemo(() => {
    if (!search.trim()) return posts;
    const q = search.toLowerCase();
    return posts.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.content.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q)) ||
      (p.author?.username ?? '').toLowerCase().includes(q)
    );
  }, [posts, search]);

  // Infinite scroll sentinel
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinel.current) return;
    const io = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '300px' });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [loadMore]);

  // Keep openPost in sync with the feed list (for like/bookmark counts)
  useEffect(() => {
    if (!openPost) return;
    const fresh = posts.find(p => p.id === openPost.id);
    if (fresh && fresh !== openPost) setOpenPost(fresh);
  }, [posts]); // eslint-disable-line react-hooks/exhaustive-deps

  const heading =
    filter.kind === 'my'        ? 'My Posts'
    : filter.kind === 'bookmarks' ? 'Bookmarks'
    : CATEGORY_META[filter.value].label;

  const subhead =
    filter.kind === 'my'        ? 'Everything you have shared with the community.'
    : filter.kind === 'bookmarks' ? 'Posts you saved for later.'
    : filter.value === 'feed'   ? 'Everything trending across every channel.'
    : `The latest from the ${CATEGORY_META[filter.value].label} channel.`;

  const openProfile = (profile: CommunityProfile, userId: string) => {
    setOpenProfileSeed(profile); setOpenProfileId(userId);
  };

  return (
    <div className="flex gap-6 max-w-[1400px] mx-auto">
      <CommunityLeftRail
        active={filter}
        onChange={(f) => { setFilter(f); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      />

      <div className="flex-1 min-w-0 space-y-5">
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-black text-foreground font-heading tracking-tight">{heading}</h1>
              <p className="text-sm text-muted-foreground">{subhead}</p>
            </div>
          </div>
        </motion.div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search posts, tags, traders…"
            className="w-full bg-card border border-border rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-primary/50"
          />
        </div>

        <PostComposer
          onCreated={() => { /* realtime appends; nothing to do */ }}
          defaultCategory={filter.kind === 'category' ? filter.value : undefined}
        />

        {loading && posts.length === 0 ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="space-y-4">
            {filtered.map(p => (
              <PostCard
                key={p.id}
                post={p}
                onOpen={() => setOpenPost(p)}
                onLike={() => toggleLike(p)}
                onBookmark={() => toggleBookmark(p)}
                onDelete={() => deletePost(p.id)}
                onOpenProfile={openProfile}
              />
            ))}
            <div ref={sentinel} className="h-12 flex items-center justify-center">
              {hasMore && loading && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              {!hasMore && posts.length > 6 && (
                <p className="text-xs text-muted-foreground">You're all caught up.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <CommunityRightRail onOpenProfile={openProfile} />

      <PostDetailDrawer
        post={openPost}
        onClose={() => setOpenPost(null)}
        onLike={() => openPost && toggleLike(openPost)}
        onBookmark={() => openPost && toggleBookmark(openPost)}
        onDelete={() => openPost && deletePost(openPost.id)}
        onOpenProfile={openProfile}
      />

      <ProfileDrawer
        userId={openProfileId}
        initialProfile={openProfileSeed}
        onClose={() => { setOpenProfileId(null); setOpenProfileSeed(null); }}
      />
    </div>
  );
}

function EmptyState({ filter }: { filter: Filter }) {
  const copy =
    filter.kind === 'my'        ? { t: 'No posts yet', s: 'Share your first trade idea, setup, or lesson above.' }
    : filter.kind === 'bookmarks' ? { t: 'Nothing bookmarked', s: 'Tap the bookmark icon on any post to save it for later.' }
    : { t: 'Be the first to post', s: 'This channel is quiet — start the conversation.' };
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-primary/10 mx-auto mb-3 flex items-center justify-center">
        <Users className="h-5 w-5 text-primary" />
      </div>
      <p className="text-base font-bold text-foreground">{copy.t}</p>
      <p className="text-sm text-muted-foreground mt-1">{copy.s}</p>
    </div>
  );
}
