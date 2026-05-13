// src/components/UserAvatar.tsx
import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, Loader2, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface UserAvatarProps {
  url:          string | null;
  displayName:  string | null;
  email:        string | null;
  size?:        'sm' | 'md' | 'lg' | 'xl';
  editable?:    boolean;
  onUpdated?:   (url: string) => void;
}

const SIZES = {
  sm: { wrap: 'w-7 h-7',   text: 'text-xs',  icon: 'h-3 w-3'     },
  md: { wrap: 'w-9 h-9',   text: 'text-sm',  icon: 'h-3.5 w-3.5' },
  lg: { wrap: 'w-14 h-14', text: 'text-lg',  icon: 'h-4 w-4'     },
  xl: { wrap: 'w-20 h-20', text: 'text-2xl', icon: 'h-5 w-5'     },
};

function initials(name: string | null, email: string | null) {
  if (name?.trim()) return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return 'U';
}

export default function UserAvatar({ url, displayName, email, size = 'md', editable = false, onUpdated }: UserAvatarProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview,   setPreview]   = useState<string | null>(null);
  const [hover,     setHover]     = useState(false);

  const sz  = SIZES[size];
  const src = preview ?? url;
  const ini = initials(displayName, email);

  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 2MB', variant: 'destructive' }); return;
    }
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) {
      toast({ title: 'Invalid type', description: 'JPG, PNG, WebP or GIF only', variant: 'destructive' }); return;
    }

    // Instant preview
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
      const final = `${publicUrl}?t=${Date.now()}`;

      const { error: dbErr } = await supabase.from('profiles')
        .update({ avatar_url: final, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (dbErr) throw dbErr;

      setPreview(final);
      onUpdated?.(final);
      toast({ title: 'Profile photo updated!' });
    } catch (err: any) {
      setPreview(null);
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }, [user, onUpdated]);

  return (
    <div
      className={`relative inline-flex flex-shrink-0 ${editable ? 'cursor-pointer' : ''}`}
      onMouseEnter={() => editable && setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => editable && !uploading && inputRef.current?.click()}
    >
      <div className={`${sz.wrap} rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center ring-2 ring-background`}>
        {uploading ? (
          <Loader2 className={`${sz.icon} text-white animate-spin`} />
        ) : src ? (
          <img src={src} alt={displayName ?? 'Avatar'} className="w-full h-full object-cover"
            onError={() => setPreview(null)} />
        ) : (
          <span className={`${sz.text} font-bold text-white select-none`}>{ini}</span>
        )}
      </div>

      <AnimatePresence>
        {editable && hover && !uploading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
            <Camera className={`${sz.icon} text-white`} />
          </motion.div>
        )}
      </AnimatePresence>

      {editable && <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFile} className="hidden" />}
    </div>
  );
}
