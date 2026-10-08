import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Camera, Loader2, CheckCircle2, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export const PROFILE_UPDATED_EVENT = 'tradenova:profile-updated';
export type ProfilePatch = Partial<{ display_name: string | null; full_name: string | null; bio: string | null; avatar_url: string | null; preferred_market: string | null; trading_style: string }>;
export function emitProfileUpdated(patch: ProfilePatch) {
  window.dispatchEvent(new CustomEvent(PROFILE_UPDATED_EVENT, { detail: patch }));
}

const MAX = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Center-crops to a 512px square WebP. */
async function squareCrop(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  canvas.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 512, 512);
  return new Promise((res, rej) => canvas.toBlob(b => (b ? res(b) : rej(new Error('Could not process image'))), 'image/webp', 0.9));
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: { display_name: string | null; full_name: string | null; bio: string | null; avatar_url: string | null; preferred_market: string | null; trading_style: string; email: string | null };
  markets: string[];
  styles: { value: string; label: string }[];
}

const control = 'h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/50';

export default function ProfileEditDialog({ open, onOpenChange, profile, markets, styles }: Props) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(profile);
  const [newAvatar, setNewAvatar] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(profile.avatar_url);
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    if (open) { setForm(profile); setPreview(profile.avatar_url); setNewAvatar(null); setRemoveAvatar(false); setState('idle'); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    if (!TYPES.includes(f.type)) return toast({ title: 'Unsupported file', description: 'Use JPG, PNG or WebP.' });
    if (f.size > MAX) return toast({ title: 'File too large', description: 'Max 5MB.' });
    try {
      const blob = await squareCrop(f);
      setNewAvatar(blob); setRemoveAvatar(false); setPreview(URL.createObjectURL(blob));
    } catch { toast({ title: 'Could not read image' }); }
  };

  const initials = (form.display_name || form.full_name || form.email || 'U').trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const marketOptions = form.preferred_market && !markets.includes(form.preferred_market) ? [form.preferred_market, ...markets] : markets;

  const save = async () => {
    if (!user) return;
    setState('saving');
    try {
      let avatar_url = profile.avatar_url;
      if (newAvatar) {
        const path = `${user.id}/avatar.webp`;
        const { error } = await supabase.storage.from('avatars').upload(path, newAvatar, { upsert: true, contentType: 'image/webp' });
        if (error) throw error;
        avatar_url = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?t=${Date.now()}`;
      } else if (removeAvatar) {
        const { data } = await supabase.storage.from('avatars').list(user.id);
        if (data?.length) await supabase.storage.from('avatars').remove(data.map(o => `${user.id}/${o.name}`));
        avatar_url = null;
      }
      const patch: ProfilePatch = {
        display_name: form.display_name?.trim() || null,
        full_name: form.full_name?.trim() || null,
        bio: form.bio?.trim() || null,
        preferred_market: form.preferred_market || null,
        trading_style: form.trading_style,
        avatar_url,
      };
      const { error } = await supabase.from('profiles').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (error) throw error;
      emitProfileUpdated(patch);
      setState('saved');
      setTimeout(() => onOpenChange(false), 700);
    } catch (err: any) {
      console.error('Profile save failed', err);
      setState('idle');
      toast({ title: 'Could not save profile', description: 'Please try again.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={o => state !== 'saving' && onOpenChange(o)}>
      <DialogContent className="max-w-lg border-border bg-card">
        <DialogHeader>
          <DialogTitle className="font-heading">Profile Settings</DialogTitle>
          <DialogDescription>How you appear across TradeNova.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-primary/10 transition-colors hover:border-primary/50" aria-label="Change profile photo">
            {preview ? <img src={preview} alt="Profile photo" className="h-full w-full object-cover" />
              : <span className="flex h-full w-full items-center justify-center font-heading text-xl font-semibold text-primary">{initials}</span>}
            <span className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 transition-opacity group-hover:opacity-100"><Camera className="h-5 w-5 text-foreground" /></span>
          </button>
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => fileRef.current?.click()}>{preview ? 'Replace photo' : 'Upload photo'}</Button>
              {preview && <Button type="button" size="sm" variant="ghost" className="text-muted-foreground" onClick={() => { setPreview(null); setNewAvatar(null); setRemoveAvatar(true); }}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Remove</Button>}
            </div>
            <p className="text-[11px] text-muted-foreground">JPG, PNG or WebP · max 5MB · cropped to a square</p>
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <L label="Display Name"><Input className={control} value={form.display_name ?? ''} onChange={e => setForm({ ...form, display_name: e.target.value })} /></L>
          <L label="Full Name"><Input className={control} value={form.full_name ?? ''} onChange={e => setForm({ ...form, full_name: e.target.value })} /></L>
          <L label="Preferred Market">
            <select className={control} value={form.preferred_market ?? ''} onChange={e => setForm({ ...form, preferred_market: e.target.value || null })}>
              <option value="">—</option>
              {marketOptions.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </L>
          <L label="Trading Style">
            <select className={control} value={form.trading_style} onChange={e => setForm({ ...form, trading_style: e.target.value })}>
              {styles.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </L>
          <L label="Bio" className="sm:col-span-2"><Textarea rows={3} className="resize-none border-border bg-background text-sm focus-visible:ring-primary/40" value={form.bio ?? ''} onChange={e => setForm({ ...form, bio: e.target.value })} /></L>
          <L label="Email" className="sm:col-span-2"><p className="truncate text-sm text-muted-foreground">{form.email ?? '—'}</p></L>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={state === 'saving'}>Cancel</Button>
          <Button onClick={save} disabled={state !== 'idle'}>
            {state === 'saving' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : state === 'saved' ? <><CheckCircle2 className="mr-2 h-4 w-4" />Saved</> : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function L({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return <div className={`space-y-1.5 ${className}`}><label className="block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>{children}</div>;
}
