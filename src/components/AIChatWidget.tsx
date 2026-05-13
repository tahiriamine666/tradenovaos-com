// src/components/AIChatWidget.tsx
// TradeNova AI Assistant — Intercom-style chat widget
// Real conversation UI, Claude AI integration, typing animation
// Drop anywhere in your layout — renders as fixed overlay

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  X, Send, Sparkles, RotateCcw,
  MessageCircle, ExternalLink, ChevronDown,
  Bot, User, Zap, AlertCircle,
} from 'lucide-react';

// ─── Config ────────────────────────────────────────────────────────────────────
const WHATSAPP  = '+212XXXXXXXXX'; // ← replace
const EMAIL     = 'support@tradenovaos.com';
const BOT_NAME  = 'Nova';

// ─── Types ────────────────────────────────────────────────────────────────────
type Role = 'user' | 'assistant';

interface Message {
  id:        string;
  role:      Role;
  content:   string;
  ts:        number;
  isError?:  boolean;
}

type QuickAction = { label: string; prompt: string; icon: string };

// ─── Quick actions ────────────────────────────────────────────────────────────
const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Billing Help',    prompt: 'I need help with billing or my subscription.',  icon: '💳' },
  { label: 'Account Issues',  prompt: 'I have an issue with my account.',              icon: '🔐' },
  { label: 'Replay Studio',   prompt: 'How does Replay Studio work?',                  icon: '▶️' },
  { label: 'AI Insights',     prompt: 'Tell me about the AI Insights feature.',        icon: '✨' },
  { label: 'Bug Report',      prompt: 'I want to report a bug.',                      icon: '🐛' },
  { label: 'Talk to Support', prompt: 'I need to speak with a human support agent.',   icon: '🧑‍💻' },
];

// ─── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are Nova, the TradeNova AI Assistant — a friendly, concise, and knowledgeable support agent for TradeNova, a premium trading SaaS.

TradeNova features:
- Trade Journal: Log trades with emotion, execution score, outcome
- Edge Analytics: Win rate, profit factor, expectancy, setup performance
- Mind Journal: Track psychological patterns and emotions
- Playbook Lab: Define setups, rules, checklists
- Replay Studio (Elite): Candle-by-candle session replay
- AI Insights (Pro+): Claude analyzes trade patterns
- CSV Import (Pro+): Import from any broker
- Trading Calendar: P&L heatmap

Plans: Free (50 trades/mo), Pro ($29/mo), Elite ($59/mo)
Payment: Currently via Payoneer (manual), Stripe coming soon
14-day free trial on Pro and Elite

Rules:
- Be concise — max 3 short paragraphs per reply
- Use bullet points for lists
- Be warm, helpful, and professional
- For billing/account issues, offer to escalate to human support
- For bugs, ask for steps to reproduce
- Never make up features that don't exist
- If asked something outside TradeNova, redirect politely
- End responses with a follow-up question or helpful tip when appropriate`;

// ─── API call ─────────────────────────────────────────────────────────────────
async function callAI(messages: { role: Role; content: string }[]): Promise<string> {
  const { data, error } = await supabase.functions.invoke('ai-chat', {
    body: { messages: messages.slice(-12) },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any)?.text ?? 'Sorry, I could not generate a response.';
}

// ─── Pulse ring ───────────────────────────────────────────────────────────────
function PulseRing() {
  return (
    <>
      {[1, 1.5, 2].map((scale, i) => (
        <motion.span key={i}
          className="absolute inset-0 rounded-full bg-violet-500/25"
          animate={{ scale: [1, scale, scale], opacity: [0.5, 0, 0] }}
          transition={{ duration: 2.5, delay: i * 0.5, repeat: Infinity, repeatDelay: 0.5 }}
        />
      ))}
    </>
  );
}

// ─── Typing dots ─────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 0.15, 0.3].map((delay, i) => (
        <motion.div key={i}
          className="w-2 h-2 rounded-full bg-violet-400"
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.7, delay, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';

  // Parse simple markdown: **bold**, bullet lists
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('- ') || line.startsWith('• ')) {
        return (
          <div key={i} className="flex items-start gap-1.5 ml-1">
            <span className="text-violet-400 mt-1 flex-shrink-0 text-[10px]">●</span>
            <span>{line.slice(2)}</span>
          </div>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-1.5" />;
      // Bold
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <div key={i}>
          {parts.map((p, j) =>
            p.startsWith('**') && p.endsWith('**')
              ? <strong key={j} className="font-semibold text-white">{p.slice(2, -2)}</strong>
              : <span key={j}>{p}</span>
          )}
        </div>
      );
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`flex items-end gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 mb-0.5 shadow-lg shadow-violet-500/20">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
      )}

      <div className={`max-w-[82%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-0.5 ${
          isUser
            ? 'bg-violet-600 text-white rounded-br-md shadow-lg shadow-violet-500/20'
            : msg.isError
            ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-bl-md'
            : 'bg-white/[0.06] border border-white/[0.08] text-white/85 rounded-bl-md'
        }`}>
          {renderContent(msg.content)}
        </div>
        <span className="text-[10px] text-white/20 px-1">
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}

// ─── Main widget ──────────────────────────────────────────────────────────────
export default function AIChatWidget() {
  const { user } = useAuth();
  const [open,     setOpen]     = useState(false);
  const [input,    setInput]    = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing,   setTyping]   = useState(false);
  const [convId,   setConvId]   = useState<string | null>(null);
  const [unread,   setUnread]   = useState(false);
  const [userName, setUserName] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const scrollRef      = useRef<HTMLDivElement>(null);

  // Load user name
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name,full_name').eq('id', user.id).single()
      .then(({ data }) => {
        if (data) setUserName(data.display_name ?? data.full_name ?? '');
      });
  }, [user]);

  // Welcome message
  const welcomeMessage: Message = useMemo(() => ({
    id: 'welcome',
    role: 'assistant',
    content: `👋 Hi${userName ? ` ${userName.split(' ')[0]}` : ' trader'}! I'm **Nova**, the TradeNova AI Assistant.\n\nAsk me anything about:\n- Billing & subscriptions\n- Account & settings\n- Trade journal & analytics\n- Playbook Lab & AI Insights\n- Replay Studio\n- Feature requests or bugs\n\nHow can I help you today?`,
    ts: Date.now(),
  }), [userName]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, typing]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300);
      setUnread(false);
    }
  }, [open]);

  // Save conversation (no-op: persistence not enabled)
  const saveConversation = useCallback(async (_msgs: Message[]) => {
    return;
  }, []);

  // Send message
  const sendMessage = useCallback(async (text: string) => {
    const content = text.trim();
    if (!content || typing) return;

    setInput('');

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content, ts: Date.now() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setTyping(true);

    // Check for human escalation
    const wantsHuman = /human|agent|support team|speak to someone|real person|talk to/i.test(content);

    let responseText: string;
    try {
      if (wantsHuman) {
        responseText = `Of course! You can reach our team directly:\n\n- **WhatsApp:** [Chat now](https://wa.me/${WHATSAPP.replace(/\D/g, '')})\n- **Email:** ${EMAIL}\n\nWe typically respond within a few hours. Is there anything else I can help clarify in the meantime?`;
      } else {
        // Call Claude
        const history = newMessages.map(m => ({ role: m.role, content: m.content }));
        responseText = await callAI(history);
      }
    } catch (err) {
      console.error('Chat error:', err);
      responseText = 'Sorry, I had trouble connecting. Please try again or contact us directly.';
    }

    const assistantMsg: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: responseText,
      ts: Date.now(),
      isError: responseText.includes('trouble connecting'),
    };

    const finalMessages = [...newMessages, assistantMsg];
    setMessages(finalMessages);
    setTyping(false);

    // Save async
    saveConversation(finalMessages);

    // Show unread badge if closed
    if (!open) setUnread(true);
  }, [messages, typing, open, saveConversation]);

  const handleQuickAction = (action: QuickAction) => sendMessage(action.prompt);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const handleReset = () => {
    setMessages([]);
    setConvId(null);
    inputRef.current?.focus();
  };

  const handleOpen = () => { setOpen(true); setUnread(false); };
  const handleClose = () => setOpen(false);

  const allMessages = messages.length === 0 ? [welcomeMessage] : [welcomeMessage, ...messages];
  const showQuickActions = messages.length === 0;

  const whatsappUrl = `https://wa.me/${WHATSAPP.replace(/\D/g, '')}?text=${encodeURIComponent('Hi TradeNova! I need support.')}`;

  return (
    <div className="app-chrome fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">

      {/* ── Chat window ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-window"
            initial={{ opacity: 0, scale: 0.9, y: 20, originX: 1, originY: 1 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            style={{ height: 'min(580px, calc(100dvh - 100px))', transformOrigin: 'bottom right' }}
            className="w-[380px] max-w-[calc(100vw-1.5rem)] flex flex-col rounded-2xl overflow-hidden border border-white/[0.09] bg-[#0c0c16] shadow-2xl shadow-black/70"
          >
            {/* ── Header ── */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.07] bg-gradient-to-r from-violet-600/15 via-transparent to-transparent flex-shrink-0">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                  <Sparkles className="h-4.5 w-4.5 text-white h-[18px] w-[18px]" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0c0c16]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{BOT_NAME} · TradeNova AI</p>
                <p className="text-[11px] text-emerald-400/80 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Online · Replies instantly
                </p>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button onClick={handleReset} title="New conversation"
                    className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white/70 transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}
                <button onClick={handleClose}
                  className="p-2 rounded-lg hover:bg-white/[0.06] text-white/30 hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth"
              style={{ scrollbarWidth: 'none' }}>

              {allMessages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}

              {/* Typing indicator */}
              <AnimatePresence>
                {typing && (
                  <motion.div key="typing"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-end gap-2">
                    <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/20">
                      <Sparkles className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl rounded-bl-md">
                      <TypingDots />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
            </div>

            {/* ── Quick actions ── */}
            <AnimatePresence>
              {showQuickActions && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden flex-shrink-0">
                  <div className="px-4 pb-3">
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2 font-semibold">Quick actions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_ACTIONS.map(action => (
                        <button key={action.label} onClick={() => handleQuickAction(action)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/[0.09] bg-white/[0.03] hover:bg-white/[0.07] hover:border-violet-500/30 text-white/60 hover:text-white text-xs font-medium transition-all">
                          <span>{action.icon}</span>
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Input ── */}
            <div className="px-3 pb-3 pt-2 border-t border-white/[0.06] flex-shrink-0">
              <div className="flex items-end gap-2 bg-white/[0.04] border border-white/[0.09] rounded-2xl px-3.5 py-2.5 focus-within:border-violet-500/40 focus-within:bg-white/[0.06] transition-all">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a question…"
                  disabled={typing}
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 focus:outline-none resize-none min-h-[20px] max-h-[100px] disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || typing}
                  className="p-1.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-violet-500/20 flex-shrink-0"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2 px-1">
                <p className="text-[10px] text-white/15">Powered by Claude AI</p>
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] text-violet-400/50 hover:text-violet-400 transition-colors flex items-center gap-1">
                  Talk to human <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating button ── */}
      <AnimatePresence mode="wait">
        {!open ? (
          <motion.button
            key="open-btn"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleOpen}
            className="relative w-14 h-14 rounded-full bg-violet-600 shadow-2xl shadow-violet-500/40 hover:bg-violet-500 transition-colors flex items-center justify-center"
            aria-label="Open AI chat assistant"
          >
            <PulseRing />
            <Sparkles className="h-6 w-6 text-white relative z-10" />
            {unread && (
              <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="absolute top-0 right-0 w-4 h-4 rounded-full bg-emerald-500 border-2 border-[#06060f] flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">1</span>
              </motion.span>
            )}
          </motion.button>
        ) : (
          <motion.button
            key="close-btn"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 18, stiffness: 300 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleClose}
            className="w-14 h-14 rounded-full bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.12] transition-colors flex items-center justify-center shadow-xl"
          >
            <ChevronDown className="h-6 w-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
