import React, { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Heart, Send, Loader2, CornerDownRight, Flag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import { toast } from '@/hooks/use-toast';
import {
  relativeTime, tierBadgeClass, useSignedImageUrls,
  type CommunityComment, type CommunityPost, type CommunityProfile,
} from '@/hooks/useCommunity';
import PostCard from './PostCard';

interface Props {
  post: CommunityPost | null;
  onClose: () => void;
  onLike: () => void;
  onBookmark: () => void;
  onDelete: () => void;
  onOpenProfile: (profile: CommunityProfile, userId: string) => void;
}

export default function PostDetailDrawer({ post, onClose, onLike, onBookmark, onDelete, onOpenProfile }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [replyTo, setReplyTo] = useState<CommunityComment | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const images = useSignedImageUrls(post?.image_urls ?? []);

  const load = useCallback(async () => {
    if (!post) return;
    setLoading(true);
    const { data: rows } = await supabase
      .from('community_comments').select('*').eq('post_id', post.id).order('created_at', { ascending: true });
    const arr = (rows ?? []) as CommunityComment[];
    const uids = Array.from(new Set(arr.map(c => c.user_id)));
    if (uids.length > 0) {
      const { data: profs } = await supabase.from('community_profiles').select('*').in('user_id', uids);
      const m = new Map((profs ?? []).map((p: any) => [p.user_id, p as CommunityProfile]));
      arr.forEach(c => { c.author = m.get(c.user_id) ?? null; });
    }
    setComments(arr);

    if (user && arr.length > 0) {
      const { data: liked } = await supabase.from('community_likes')
        .select('target_id').eq('user_id', user.id).eq('target_type', 'comment')
        .in('target_id', arr.map(c => c.id));
      setLikedIds(new Set((liked ?? []).map((l: any) => l.target_id)));
    } else setLikedIds(new Set());

    setLoading(false);
  }, [post, user]);

  useEffect(() => { if (post) { setReply(''); setReplyTo(null); load(); } }, [post, load]);

  useEffect(() => {
    if (!post) return;
    const channel = supabase
      .channel(`comments_${post.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'community_comments', filter: `post_id=eq.${post.id}`,
      }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [post, load]);

  const submitReply = async () => {
    if (!post || !user || !reply.trim()) return;
    setSubmitting(true);
    const { error } = await supabase.from('community_comments').insert({
      post_id: post.id, user_id: user.id, content: reply.trim().slice(0, 4000),
      parent_comment_id: replyTo?.id ?? null,
    });
    setSubmitting(false);
    if (error) { toast({ title: 'Failed to comment', description: error.message, variant: 'destructive' }); return; }
    setReply(''); setReplyTo(null);
  };

  const toggleCommentLike = async (c: CommunityComment) => {
    if (!user) return;
    const liked = likedIds.has(c.id);
    setLikedIds(prev => { const n = new Set(prev); liked ? n.delete(c.id) : n.add(c.id); return n; });
    setComments(prev => prev.map(x => x.id === c.id ? { ...x, like_count: Math.max(0, x.like_count + (liked ? -1 : 1)) } : x));
    if (liked) {
      await supabase.from('community_likes').delete()
        .eq('user_id', user.id).eq('target_type', 'comment').eq('target_id', c.id);
    } else {
      await supabase.from('community_likes').insert({
        user_id: user.id, target_type: 'comment', target_id: c.id,
      });
    }
  };

  const deleteComment = async (c: CommunityComment) => {
    if (c.user_id !== user?.id) return;
    setComments(prev => prev.filter(x => x.id !== c.id));
    await supabase.from('community_comments').delete().eq('id', c.id);
  };

  const reportComment = async (c: CommunityComment) => {
    if (!user) return;
    const reason = prompt('Reason for report?');
    if (!reason?.trim()) return;
    await supabase.from('community_reports').insert({
      reporter_id: user.id, target_type: 'comment', target_id: c.id, reason: reason.trim(),
    });
    toast({ title: 'Reported' });
  };

  // Build tree (depth-limited to 3)
  const rootComments = comments.filter(c => !c.parent_comment_id);
  const childrenOf = (id: string) => comments.filter(c => c.parent_comment_id === id);

  const renderComment = (c: CommunityComment, depth: number) => (
    <div key={c.id} className={depth > 0 ? 'ml-6 pl-3 border-l border-border' : ''}>
      <div className="flex gap-3 py-3">
        <button onClick={() => c.author && onOpenProfile(c.author, c.user_id)} className="flex-shrink-0">
          <UserAvatar url={c.author?.avatar_url ?? null} displayName={c.author?.username ?? 'Trader'} email={null} size="sm" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="rounded-2xl bg-muted/50 px-3.5 py-2.5">
            <div className="flex items-center gap-2 mb-0.5">
              <button onClick={() => c.author && onOpenProfile(c.author, c.user_id)} className="text-xs font-bold text-foreground hover:text-primary">
                @{c.author?.username ?? 'trader'}
              </button>
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${tierBadgeClass(c.author?.experience_level ?? 'beginner')}`}>
                {c.author?.experience_level ?? 'beginner'}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">{relativeTime(c.created_at)}</span>
            </div>
            <p className="text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed">{c.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1.5 px-2 text-[11px] text-muted-foreground">
            <button onClick={() => toggleCommentLike(c)} className={`inline-flex items-center gap-1 hover:text-foreground ${likedIds.has(c.id) ? 'text-red-500' : ''}`}>
              <Heart className={`h-3 w-3 ${likedIds.has(c.id) ? 'fill-red-500' : ''}`} /> {c.like_count > 0 ? c.like_count : ''}
            </button>
            {depth < 2 && (
              <button onClick={() => setReplyTo(c)} className="inline-flex items-center gap-1 hover:text-foreground">
                <CornerDownRight className="h-3 w-3" /> Reply
              </button>
            )}
            <button onClick={() => reportComment(c)} className="hover:text-foreground"><Flag className="h-3 w-3" /></button>
            {c.user_id === user?.id && (
              <button onClick={() => deleteComment(c)} className="hover:text-red-500">Delete</button>
            )}
          </div>
          {childrenOf(c.id).map(child => renderComment(child, depth + 1))}
        </div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {post && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 280 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-background border-l border-border flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border flex-shrink-0">
              <p className="text-sm font-bold text-foreground">Post</p>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <PostCard post={post} onOpen={() => {}} onLike={onLike} onBookmark={onBookmark} onDelete={() => { onDelete(); onClose(); }} onOpenProfile={onOpenProfile} />

              {images.length > 1 && (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((src, i) => src && <img key={i} src={src} alt="" className="w-full rounded-xl border border-border" />)}
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 px-1">
                  {post.comment_count} {post.comment_count === 1 ? 'Comment' : 'Comments'}
                </p>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : rootComments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">Be the first to comment.</p>
                ) : (
                  <div>{rootComments.map(c => renderComment(c, 0))}</div>
                )}
              </div>
            </div>

            <div className="border-t border-border p-3 flex-shrink-0 bg-background">
              {replyTo && (
                <div className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-lg bg-muted/60 text-xs">
                  <CornerDownRight className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground">Replying to <span className="font-semibold text-foreground">@{replyTo.author?.username}</span></span>
                  <button onClick={() => setReplyTo(null)} className="ml-auto text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                </div>
              )}
              <div className="flex gap-2">
                <textarea
                  value={reply} onChange={e => setReply(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitReply(); }}
                  rows={1}
                  placeholder="Add a comment… (⌘↵ to send)"
                  className="flex-1 bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-sm resize-none focus:outline-none focus:border-primary/50 max-h-32"
                />
                <button onClick={submitReply} disabled={submitting || !reply.trim()}
                  className="px-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
