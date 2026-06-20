import React from 'react';
import { motion } from 'framer-motion';
import {
  Heart, MessageCircle, Bookmark, Share2, MoreHorizontal, Flag, Trash2,
  TrendingUp, TrendingDown, Lock, Crown, Globe,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import UserAvatar from '@/components/UserAvatar';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  CATEGORY_META, TYPE_META, relativeTime, tierBadgeClass, useSignedImageUrls,
  type CommunityPost, type CommunityProfile,
} from '@/hooks/useCommunity';

interface Props {
  post: CommunityPost;
  onOpen: () => void;
  onLike: () => void;
  onBookmark: () => void;
  onDelete: () => void;
  onOpenProfile: (profile: CommunityProfile, userId: string) => void;
}

export default function PostCard({ post, onOpen, onLike, onBookmark, onDelete, onOpenProfile }: Props) {
  const { user } = useAuth();
  const isOwn = user?.id === post.user_id;
  const images = useSignedImageUrls(post.image_urls);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const report = async () => {
    if (!user) return;
    const reason = prompt('Reason for report?');
    if (!reason?.trim()) return;
    await supabase.from('community_reports').insert({
      reporter_id: user.id, target_type: 'post', target_id: post.id, reason: reason.trim(),
    });
    toast({ title: 'Reported. Our team will review.' });
    setMenuOpen(false);
  };

  const share = async () => {
    const url = `${window.location.origin}/app?community=${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied' });
    } catch { /* noop */ }
  };

  const VisIcon = post.visibility === 'elite' ? Crown : post.visibility === 'pro' ? Lock : Globe;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/20 transition-colors"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <button
          onClick={() => post.author && onOpenProfile(post.author, post.user_id)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left group"
        >
          <UserAvatar
            url={post.author?.avatar_url ?? null}
            displayName={post.author?.username ?? 'Trader'}
            email={null} size="sm"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                @{post.author?.username ?? 'trader'}
              </p>
              <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${tierBadgeClass(post.author?.experience_level ?? 'beginner')}`}>
                {post.author?.experience_level ?? 'beginner'}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">{relativeTime(post.created_at)} · {CATEGORY_META[post.category].label}</p>
          </div>
        </button>

        <span className={`hidden sm:inline-flex text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full border ${TYPE_META[post.type].tone}`}>
          {TYPE_META[post.type].label}
        </span>

        <span className="text-muted-foreground" title={post.visibility}><VisIcon className="h-3.5 w-3.5" /></span>

        <div className="relative">
          <button onClick={() => setMenuOpen(m => !m)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-10 w-40 rounded-xl border border-border bg-popover shadow-lg overflow-hidden">
              <button onClick={report} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted">
                <Flag className="h-3 w-3" /> Report
              </button>
              {isOwn && (
                <button onClick={() => { onDelete(); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-muted">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <button onClick={onOpen} className="w-full text-left px-4 pb-3">
        <h3 className="text-base font-bold text-foreground mb-1.5 leading-snug">{post.title}</h3>
        {post.content && (
          <p className="text-sm text-foreground/75 leading-relaxed whitespace-pre-wrap line-clamp-4">{post.content}</p>
        )}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {post.tags.map(t => (
              <span key={t} className="text-[11px] font-medium text-primary bg-primary/8 border border-primary/15 rounded-full px-2 py-0.5">#{t}</span>
            ))}
          </div>
        )}
      </button>

      {/* Trade idea */}
      {post.type === 'trade_idea' && post.trade_idea && <TradeIdeaBlock idea={post.trade_idea} />}

      {/* Images */}
      {images.length > 0 && (
        <button onClick={onOpen} className={`grid w-full ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-1 bg-background`}>
          {images.slice(0, 4).map((src, i) => (
            <div key={i} className={`overflow-hidden ${images.length === 3 && i === 0 ? 'col-span-2' : ''} ${images.length === 1 ? 'max-h-[480px]' : 'max-h-[260px]'}`}>
              {src && <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />}
            </div>
          ))}
        </button>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 py-2 border-t border-border">
        <ActionBtn icon={Heart} count={post.like_count} active={post.liked} activeClass="text-red-500 fill-red-500" onClick={onLike} label="Like" />
        <ActionBtn icon={MessageCircle} count={post.comment_count} onClick={onOpen} label="Comment" />
        <ActionBtn icon={Bookmark} count={post.bookmark_count} active={post.bookmarked} activeClass="text-primary fill-primary" onClick={onBookmark} label="Save" />
        <ActionBtn icon={Share2} onClick={share} label="Share" />
      </div>
    </motion.article>
  );
}

function ActionBtn({ icon: Icon, count, active, activeClass, onClick, label }: {
  icon: any; count?: number; active?: boolean; activeClass?: string; onClick: () => void; label: string;
}) {
  return (
    <button onClick={onClick} aria-label={label}
      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg hover:bg-muted text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
      <Icon className={`h-4 w-4 ${active ? activeClass : ''}`} />
      {count !== undefined && count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}

function TradeIdeaBlock({ idea }: { idea: NonNullable<CommunityPost['trade_idea']> }) {
  const dir = idea.direction === 'short' ? 'short' : 'long';
  const dirCls = dir === 'long'
    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
    : 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30';
  const DirIcon = dir === 'long' ? TrendingUp : TrendingDown;
  return (
    <div className="mx-4 mb-3 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 to-violet-500/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-lg font-black font-mono text-foreground tracking-tight">{idea.pair || '—'}</span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${dirCls}`}>
          <DirIcon className="h-3 w-3" /> {dir}
        </span>
        {idea.setup && <span className="ml-auto text-[11px] font-medium text-muted-foreground truncate">{idea.setup}</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Stat label="Entry"  value={idea.entry} mono />
        <Stat label="Stop"   value={idea.sl}    mono color="text-red-500" />
        <Stat label="Target" value={idea.tp}    mono color="text-emerald-500" />
        <Stat label="Risk"   value={idea.risk_pct ? `${idea.risk_pct}%` : '—'} />
        <Stat label="RR"     value={idea.expected_rr ? `${idea.expected_rr}R` : '—'} color="text-primary" />
      </div>
    </div>
  );
}

function Stat({ label, value, mono, color }: { label: string; value?: any; mono?: boolean; color?: string }) {
  return (
    <div className="bg-background/60 rounded-lg p-2 text-center border border-border/50">
      <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${mono ? 'font-mono' : ''} ${color ?? 'text-foreground'}`}>{value ?? '—'}</p>
    </div>
  );
}
