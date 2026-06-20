import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, X, Loader2, Lock, Sparkles, TrendingUp, TrendingDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import UserAvatar from '@/components/UserAvatar';
import { toast } from '@/hooks/use-toast';
import {
  CATEGORY_META, TYPE_META, useUserTier,
  type PostCategory, type PostType, type Visibility, type TradeIdea,
} from '@/hooks/useCommunity';

const POST_TYPES: PostType[] = ['discussion', 'trade_idea', 'lesson', 'question', 'replay_review', 'journal_insight'];
const POSTABLE_CATEGORIES: PostCategory[] = ['feed', 'trade-ideas', 'setups', 'psychology', 'risk', 'ict', 'smc', 'funded'];

export default function PostComposer({ onCreated, defaultCategory }: {
  onCreated: () => void;
  defaultCategory?: PostCategory;
}) {
  const { user } = useAuth();
  const { profile, displayName } = useProfile();
  const tier = useUserTier();

  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState<PostType>('discussion');
  const [category, setCategory] = useState<PostCategory>(defaultCategory && defaultCategory !== 'feed' ? defaultCategory : 'feed');
  const [tagsInput, setTagsInput] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('public');
  const [files, setFiles] = useState<File[]>([]);
  const [trade, setTrade] = useState<TradeIdea>({ direction: 'long' });
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setTitle(''); setContent(''); setType('discussion');
    setCategory(defaultCategory && defaultCategory !== 'feed' ? defaultCategory : 'feed');
    setTagsInput(''); setVisibility('public'); setFiles([]); setTrade({ direction: 'long' });
    setExpanded(false);
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!user || files.length === 0) return [];
    const paths: string[] = [];
    for (const f of files) {
      const ext = f.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from('community-uploads').upload(path, f, {
        cacheControl: '3600', upsert: false,
      });
      if (error) throw error;
      paths.push(path);
    }
    return paths;
  };

  const submit = async () => {
    if (!user) return;
    if (!title.trim()) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    setSubmitting(true);
    try {
      const image_urls = await uploadImages();
      const tags = tagsInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean).slice(0, 8);
      const payload: any = {
        user_id: user.id,
        title: title.trim().slice(0, 160),
        content: content.trim().slice(0, 8000),
        type, category, tags, image_urls, visibility,
        trade_idea: type === 'trade_idea' ? {
          pair: trade.pair, direction: trade.direction,
          entry: trade.entry, sl: trade.sl, tp: trade.tp,
          risk_pct: trade.risk_pct, setup: trade.setup, expected_rr: trade.expected_rr,
        } : null,
      };
      const { error } = await supabase.from('community_posts').insert(payload);
      if (error) throw error;
      toast({ title: 'Posted to the community' });
      reset(); onCreated();
    } catch (e: any) {
      toast({ title: 'Could not post', description: e.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all text-left"
      >
        <UserAvatar url={profile?.avatar_url ?? null} displayName={displayName} email={profile?.email ?? null} size="sm" />
        <span className="flex-1 text-sm text-muted-foreground">Share an idea, a chart, or a question…</span>
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Post
        </span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-lg shadow-primary/5"
    >
      <div className="flex items-center gap-3">
        <UserAvatar url={profile?.avatar_url ?? null} displayName={displayName} email={profile?.email ?? null} size="sm" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">{displayName}</p>
          <p className="text-[11px] text-muted-foreground">Posting to <span className="text-primary font-medium">{CATEGORY_META[category].label}</span></p>
        </div>
        <button onClick={reset} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Type pills */}
      <div className="flex flex-wrap gap-1.5">
        {POST_TYPES.map(t => (
          <button key={t} onClick={() => setType(t)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all ${
              type === t ? TYPE_META[t].tone : 'bg-background text-muted-foreground border-border hover:border-primary/30'
            }`}>
            {TYPE_META[t].label}
          </button>
        ))}
      </div>

      <input
        value={title} onChange={e => setTitle(e.target.value)} maxLength={160}
        placeholder="Title — make it specific"
        className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50"
      />
      <textarea
        value={content} onChange={e => setContent(e.target.value)} rows={5} maxLength={8000}
        placeholder={type === 'question' ? 'What are you trying to figure out?' : 'Share your thinking…'}
        className="w-full bg-background border border-border rounded-xl px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/50 resize-none"
      />

      {type === 'trade_idea' && (
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Trade Idea Details</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <input value={trade.pair ?? ''} onChange={e => setTrade(t => ({ ...t, pair: e.target.value.toUpperCase() }))}
              placeholder="Pair (XAUUSD)" className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono uppercase focus:outline-none focus:border-primary/50" />
            <div className="flex rounded-lg border border-border overflow-hidden text-xs font-semibold col-span-2 sm:col-span-1">
              <button type="button" onClick={() => setTrade(t => ({ ...t, direction: 'long' }))}
                className={`flex-1 flex items-center justify-center gap-1 ${trade.direction === 'long' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-background text-muted-foreground'}`}>
                <TrendingUp className="h-3 w-3" /> Long
              </button>
              <button type="button" onClick={() => setTrade(t => ({ ...t, direction: 'short' }))}
                className={`flex-1 flex items-center justify-center gap-1 ${trade.direction === 'short' ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-background text-muted-foreground'}`}>
                <TrendingDown className="h-3 w-3" /> Short
              </button>
            </div>
            <input value={trade.risk_pct ?? ''} onChange={e => setTrade(t => ({ ...t, risk_pct: e.target.value }))}
              placeholder="Risk %" type="number" step="0.1" className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50" />
            <input value={trade.expected_rr ?? ''} onChange={e => setTrade(t => ({ ...t, expected_rr: e.target.value }))}
              placeholder="RR" type="number" step="0.1" className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={trade.entry ?? ''} onChange={e => setTrade(t => ({ ...t, entry: e.target.value }))}
              placeholder="Entry" type="number" step="any" className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-primary/50" />
            <input value={trade.sl ?? ''} onChange={e => setTrade(t => ({ ...t, sl: e.target.value }))}
              placeholder="Stop" type="number" step="any" className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-red-500/50" />
            <input value={trade.tp ?? ''} onChange={e => setTrade(t => ({ ...t, tp: e.target.value }))}
              placeholder="Target" type="number" step="any" className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-500/50" />
          </div>
          <input value={trade.setup ?? ''} onChange={e => setTrade(t => ({ ...t, setup: e.target.value }))}
            placeholder="Setup name (e.g. FVG + OB retest)"
            className="w-full bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50" />
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group">
              <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
              <button onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 bg-background/90 rounded-full p-0.5 opacity-0 group-hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <select value={category} onChange={e => setCategory(e.target.value as PostCategory)}
          className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-primary/50">
          {POSTABLE_CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_META[c].icon} {CATEGORY_META[c].label}</option>)}
        </select>

        <input value={tagsInput} onChange={e => setTagsInput(e.target.value)}
          placeholder="tags, comma, separated"
          className="flex-1 min-w-[150px] bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-primary/50" />

        <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border bg-background hover:border-primary/30 text-xs font-medium text-muted-foreground hover:text-foreground">
          <ImageIcon className="h-3.5 w-3.5" /> Image
          <input type="file" accept="image/*" multiple hidden
            onChange={e => setFiles(prev => [...prev, ...Array.from(e.target.files ?? [])].slice(0, 4))} />
        </label>

        <select value={visibility} onChange={e => setVisibility(e.target.value as Visibility)}
          className="bg-background border border-border rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-primary/50">
          <option value="public">🌐 Public</option>
          {(tier === 'pro' || tier === 'elite') && <option value="pro">⭐ Pro members</option>}
          {tier === 'elite' && <option value="elite">👑 Elite members</option>}
        </select>
      </div>

      {tier === 'free' && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <Lock className="h-3 w-3" /> Upgrade to Pro or Elite to post for paid members only.
        </p>
      )}

      <div className="flex justify-end gap-2">
        <button onClick={reset} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted">Cancel</button>
        <button onClick={submit} disabled={submitting || !title.trim()}
          className="px-5 py-2 rounded-xl text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 inline-flex items-center gap-2">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {submitting ? 'Posting…' : 'Post to community'}
        </button>
      </div>
    </motion.div>
  );
}
