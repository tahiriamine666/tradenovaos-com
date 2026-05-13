// src/components/SupportChat.tsx
// Floating support chat widget — Intercom-style, premium dark UI
// Drop this component anywhere in your app layout (e.g. AppLayout or Index.tsx)
// It renders as a fixed overlay — does NOT affect layout flow

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  MessageCircle, X, Send, ExternalLink, Mail,
  ChevronRight, AlertCircle, CheckCircle2,
  HelpCircle, CreditCard, Lightbulb, Bug,
  ArrowLeft, Loader2, Zap,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ─── Config ────────────────────────────────────────────────────────────────────
const WHATSAPP = '+212XXXXXXXXX'; // ← replace with your number
const EMAIL    = 'support@tradenovaos.com';

// ─── Quick help topics ────────────────────────────────────────────────────────
const TOPICS = [
  { id: 'billing',  icon: CreditCard,  label: 'Billing Help',     color: 'text-amber-400',   bg: 'bg-amber-400/10',  subject: 'Billing question' },
  { id: 'account',  icon: HelpCircle,  label: 'Account Issues',   color: 'text-blue-400',    bg: 'bg-blue-400/10',   subject: 'Account issue' },
  { id: 'feature',  icon: Lightbulb,   label: 'Feature Request',  color: 'text-emerald-400', bg: 'bg-emerald-400/10',subject: 'Feature request' },
  { id: 'bug',      icon: Bug,         label: 'Bug Report',       color: 'text-red-400',     bg: 'bg-red-400/10',    subject: 'Bug report' },
];

type View = 'home' | 'form' | 'success';

// ─── Form state ───────────────────────────────────────────────────────────────
interface FormState {
  name:    string;
  email:   string;
  subject: string;
  message: string;
}

// ─── Pulse ring ───────────────────────────────────────────────────────────────
function PulseRing() {
  return (
    <>
      <motion.span
        className="absolute inset-0 rounded-full bg-violet-500/30"
        animate={{ scale: [1, 1.6, 1.6], opacity: [0.6, 0, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1 }}
      />
      <motion.span
        className="absolute inset-0 rounded-full bg-violet-500/20"
        animate={{ scale: [1, 1.9, 1.9], opacity: [0.4, 0, 0] }}
        transition={{ duration: 2.4, delay: 0.4, repeat: Infinity, repeatDelay: 1 }}
      />
    </>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────
export default function SupportChat() {
  const { user } = useAuth();
  const [open,      setOpen]      = useState(false);
  const [view,      setView]      = useState<View>('home');
  const [form,      setForm]      = useState<FormState>({ name: '', email: '', subject: 'general', message: '' });
  const [sending,   setSending]   = useState(false);
  const [errors,    setErrors]    = useState<Partial<FormState>>({});
  const [unread,    setUnread]    = useState(false);

  // Pre-fill from user profile
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name,full_name,email').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setForm(f => ({
          ...f,
          name:  data.display_name ?? data.full_name ?? '',
          email: data.email ?? '',
        }));
      });
  }, [user]);

  const handleOpen = () => {
    setOpen(true);
    setUnread(false);
  };

  const handleClose = () => {
    setOpen(false);
    // Reset to home after close animation
    setTimeout(() => { setView('home'); setErrors({}); }, 300);
  };

  const setTopic = (subject: string) => {
    setForm(f => ({ ...f, subject }));
    setView('form');
  };

  const validate = (): boolean => {
    const e: Partial<FormState> = {};
    if (!form.name.trim())    e.name    = 'Name is required';
    if (!form.email.trim())   e.email   = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!form.message.trim()) e.message = 'Message is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSend = async () => {
    if (!validate()) return;
    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        user_id: user?.id ?? null,
        name:    form.name.trim(),
        email:   form.email.trim(),
        subject: form.subject,
        message: form.message.trim(),
      });
      if (error) throw error;
      setView('success');
    } catch (err: any) {
      toast({
        title: 'Could not send message',
        description: 'Please try WhatsApp or email instead.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const whatsappUrl = `https://wa.me/${WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi TradeNova support! I need help with: ${form.subject}`)}`;

  return (
    <>
      {/* ── Floating button ── */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <AnimatePresence>
          {!open && (
            <motion.button
              key="chat-btn"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 18, stiffness: 300 }}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.94 }}
              onClick={handleOpen}
              className="relative flex items-center justify-center w-14 h-14 rounded-full bg-violet-600 shadow-2xl shadow-violet-500/40 hover:bg-violet-500 transition-colors"
              aria-label="Open support chat"
            >
              <PulseRing />
              <MessageCircle className="h-6 w-6 text-white relative z-10" />
              {unread && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#080812]" />
              )}
            </motion.button>
          )}
        </AnimatePresence>

        {/* ── Chat panel ── */}
        <AnimatePresence>
          {open && (
            <motion.div
              key="chat-panel"
              initial={{ opacity: 0, scale: 0.92, y: 16, originX: 1, originY: 1 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="absolute bottom-0 right-0 w-[360px] max-w-[calc(100vw-1.5rem)] rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0d0d18] shadow-2xl shadow-black/60"
              style={{ transformOrigin: 'bottom right' }}
            >
              {/* Header */}
              <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-violet-600/20 via-violet-500/5 to-transparent border-b border-white/[0.06]">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white text-sm">TradeNova Support</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        <p className="text-[11px] text-white/40">We reply within a few hours</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={handleClose}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-white/30 hover:text-white transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="overflow-y-auto max-h-[480px]">
                <AnimatePresence mode="wait">

                  {/* ── Home view ── */}
                  {view === 'home' && (
                    <motion.div key="home"
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 8 }} transition={{ duration: 0.18 }}
                      className="p-5 space-y-4"
                    >
                      <p className="text-sm text-white/50">
                        Hi{form.name ? ` ${form.name.split(' ')[0]}` : ''} 👋 How can we help you today?
                      </p>

                      {/* Quick topics */}
                      <div className="space-y-2">
                        {TOPICS.map(topic => {
                          const Icon = topic.icon;
                          return (
                            <motion.button key={topic.id}
                              whileHover={{ x: 2 }}
                              onClick={() => setTopic(topic.subject)}
                              className="flex items-center gap-3 w-full p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.12] transition-all group"
                            >
                              <div className={`w-8 h-8 rounded-lg ${topic.bg} flex items-center justify-center flex-shrink-0`}>
                                <Icon className={`h-4 w-4 ${topic.color}`} />
                              </div>
                              <span className="text-sm text-white/70 group-hover:text-white transition-colors flex-1 text-left">
                                {topic.label}
                              </span>
                              <ChevronRight className="h-3.5 w-3.5 text-white/20 group-hover:text-white/40 transition-colors" />
                            </motion.button>
                          );
                        })}
                      </div>

                      {/* Divider */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-white/[0.06]" />
                        <span className="text-[10px] text-white/20 uppercase tracking-wider">or reach us directly</span>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                      </div>

                      {/* Direct contact */}
                      <div className="grid grid-cols-2 gap-2">
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all">
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </a>
                        <a href={`mailto:${EMAIL}?subject=Support`}
                          className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/[0.08] text-white/40 text-xs font-medium hover:bg-white/[0.04] hover:text-white/70 hover:border-white/[0.15] transition-all">
                          <Mail className="h-3.5 w-3.5" /> Email
                        </a>
                      </div>

                      {/* Send a message CTA */}
                      <button onClick={() => setView('form')}
                        className="flex items-center justify-between w-full p-3.5 rounded-xl bg-violet-600/10 border border-violet-500/20 hover:bg-violet-600/15 hover:border-violet-500/30 transition-all group">
                        <span className="text-sm text-violet-300 font-medium">Send us a message</span>
                        <ChevronRight className="h-4 w-4 text-violet-400/60 group-hover:text-violet-400 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    </motion.div>
                  )}

                  {/* ── Form view ── */}
                  {view === 'form' && (
                    <motion.div key="form"
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.18 }}
                      className="p-5 space-y-3"
                    >
                      <button onClick={() => setView('home')}
                        className="flex items-center gap-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors mb-1">
                        <ArrowLeft className="h-3 w-3" /> Back
                      </button>

                      {/* Subject display */}
                      <div className="flex items-center gap-2 p-2.5 rounded-lg bg-violet-500/8 border border-violet-500/15">
                        <span className="text-[11px] text-violet-400/70">Topic:</span>
                        <span className="text-[11px] font-medium text-violet-300">{form.subject}</span>
                        <button onClick={() => setView('home')}
                          className="ml-auto text-violet-400/40 hover:text-violet-400 transition-colors">
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Name */}
                      <div>
                        <label className="text-[11px] font-medium text-white/30 block mb-1.5">Name</label>
                        <input
                          value={form.name}
                          onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(er => ({ ...er, name: '' })); }}
                          placeholder="Your name"
                          className={`w-full text-sm rounded-xl border bg-white/[0.03] px-3 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 transition-all ${errors.name ? 'border-red-500/40 focus:ring-red-500/30' : 'border-white/[0.08] focus:border-violet-500/40 focus:ring-violet-500/20'}`}
                        />
                        {errors.name && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.name}</p>}
                      </div>

                      {/* Email */}
                      <div>
                        <label className="text-[11px] font-medium text-white/30 block mb-1.5">Email</label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: '' })); }}
                          placeholder="you@example.com"
                          className={`w-full text-sm rounded-xl border bg-white/[0.03] px-3 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 transition-all ${errors.email ? 'border-red-500/40 focus:ring-red-500/30' : 'border-white/[0.08] focus:border-violet-500/40 focus:ring-violet-500/20'}`}
                        />
                        {errors.email && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.email}</p>}
                      </div>

                      {/* Message */}
                      <div>
                        <label className="text-[11px] font-medium text-white/30 block mb-1.5">Message</label>
                        <textarea
                          value={form.message}
                          onChange={e => { setForm(f => ({ ...f, message: e.target.value })); setErrors(er => ({ ...er, message: '' })); }}
                          placeholder="Describe your issue or question..."
                          rows={4}
                          className={`w-full text-sm rounded-xl border bg-white/[0.03] px-3 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-1 transition-all resize-none ${errors.message ? 'border-red-500/40 focus:ring-red-500/30' : 'border-white/[0.08] focus:border-violet-500/40 focus:ring-violet-500/20'}`}
                        />
                        {errors.message && <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" />{errors.message}</p>}
                      </div>

                      {/* Actions */}
                      <div className="space-y-2 pt-1">
                        <motion.button
                          onClick={handleSend}
                          disabled={sending}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {sending
                            ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                            : <><Send className="h-4 w-4" /> Send Message</>
                          }
                        </motion.button>

                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 transition-all">
                          <MessageCircle className="h-4 w-4" /> WhatsApp Support
                        </a>
                      </div>
                    </motion.div>
                  )}

                  {/* ── Success view ── */}
                  {view === 'success' && (
                    <motion.div key="success"
                      initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }} transition={{ duration: 0.22 }}
                      className="p-8 text-center space-y-4"
                    >
                      <motion.div
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 14, delay: 0.1 }}
                        className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto"
                      >
                        <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                      </motion.div>
                      <div>
                        <p className="font-bold text-white text-base">Message sent!</p>
                        <p className="text-sm text-white/40 mt-1 leading-relaxed">
                          We got your message and will reply to <strong className="text-white/60">{form.email}</strong> within a few hours.
                        </p>
                      </div>
                      <div className="pt-2 space-y-2">
                        <p className="text-xs text-white/25">Need faster help?</p>
                        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-sm font-medium hover:bg-emerald-500/10 transition-all">
                          <MessageCircle className="h-4 w-4" /> WhatsApp Support
                        </a>
                        <button onClick={handleClose}
                          className="w-full py-2.5 rounded-xl text-sm text-white/30 hover:text-white/50 transition-colors">
                          Close
                        </button>
                      </div>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>

              {/* Footer */}
              {view !== 'success' && (
                <div className="px-5 py-3 border-t border-white/[0.05] flex items-center justify-center">
                  <p className="text-[10px] text-white/15">
                    Powered by <span className="text-violet-400/50 font-medium">TradeNova</span>
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
