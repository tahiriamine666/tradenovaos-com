// src/components/UserAvatar.tsx
// Avatar component with upload functionality.
// Shows user photo, falls back to initials.
// Click to upload new photo — uploads to Supabase Storage.

import React, { useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Camera, Loader2, X, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserAvatarProps {
  url:         string | null;
  displayName: string | null;
  email:       string | null;
  size?:       'sm' | 'md' | 'lg' | 'xl';
  editable?:   boolean;
  onUpdated?:  (newUrl: string) => void;
}

const SIZE_MAP = {
  sm: { container: 'w-7 h-7',   text: 'text-xs',  icon: 'h-3 w-3'   },
  md: { container: 'w-9 h-9',   text: 'text-sm',  icon: 'h-3.5 w-3.5' },
  lg: { container: 'w-14 h-14', text: 'text-lg',  icon: 'h-4 w-4'   },
  xl: { container: 'w-20 h-20', text: 'text-2xl', icon: 'h-5 w-5'   },
};

function getInitials(name: string | null, email: string | null): string {
  if (name?.trim()) {
    return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return 'U';
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function UserAvatar({
  url, displayName, email, size = 'md', editable = false, onUpdated,
}: UserAvatarProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading,  setUploading]  = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [hover,      setHover]      = useState(false);

  const sz       = SIZE_MAP[size];
  const initials = getInitials(displayName, email);
  const src      = previewUrl ?? url;

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 2MB for profile photos.', variant: 'destructive' });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      toast({ title: 'Invalid file type', description: 'Use JPG, PNG, WebP or GIF.', variant: 'destructive' });
      return;
    }

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = ev => setPreviewUrl(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      // Upload to Supabase Storage: avatars/{user_id}/avatar.{ext}
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw uploadErr;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(path);

      // Bust cache with timestamp
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

      // Save to profiles
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBust, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (updateErr) throw updateErr;

      setPreviewUrl(urlWithCacheBust);
      onUpdated?.(urlWithCacheBust);
      toast({ title: 'Profile photo updated!' });

    } catch (err: any) {
      setPreviewUrl(null);
      toast({ title: 'Upload failed', description: err.message ?? 'Please try again.', variant: 'destructive' });
      console.error('Avatar upload error:', err);
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [user, onUpdated]);

  return (
    <div
      className={`relative inline-flex flex-shrink-0 ${editable ? 'cursor-pointer' : ''}`}
      onMouseEnter={() => editable && setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => editable && !uploading && fileInputRef.current?.click()}
    >
      {/* Avatar circle */}
      <div className={`
        ${sz.container} rounded-full overflow-hidden flex-shrink-0
        bg-gradient-to-br from-primary/80 to-primary
        flex items-center justify-center
        ring-2 ring-background
        ${editable ? 'transition-all duration-200' : ''}
        ${editable && hover ? 'ring-primary/50' : ''}
      `}>
        {uploading ? (
          <Loader2 className={`${sz.icon} text-white animate-spin`} />
        ) : src ? (
          <img
            src={src}
            alt={displayName ?? 'Avatar'}
            className="w-full h-full object-cover"
            onError={() => setPreviewUrl(null)}
          />
        ) : (
          <span className={`${sz.text} font-bold text-white select-none`}>
            {initials}
          </span>
        )}
      </div>

      {/* Camera overlay on hover */}
      <AnimatePresence>
        {editable && hover && !uploading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`
              absolute inset-0 rounded-full
              bg-black/50 flex items-center justify-center
            `}
          >
            <Camera className={`${sz.icon} text-white`} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden file input */}
      {editable && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
      )}
    </div>
  );
}
