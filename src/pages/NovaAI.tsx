import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { History, SlidersHorizontal, Plus, Send, User, ChevronDown, Lightbulb, Activity } from 'lucide-react';
import robotAsset from '@/assets/nova-robot-wave.png.asset.json';
import { openCustomerPortal } from '@/lib/dodo';

// Local Vite preview doesn't proxy CDN asset paths; the hosted preview does.
const ROBOT = import.meta.env.DEV ? `https://id-preview--0ee4a120-abbf-401b-9623-1114b47e7fda.lovable.app${robotAsset.url}` : robotAsset.url;

type Msg = { id: string; role: 'user' | 'assistant'; content: string };
type Conv = { id: string; title: string; preview: string | null; updated_at: string };
type Trade = { trade_date: string; created_at: string; result: number | null; rr: number | null; session: string | null; weekly_context: string | null; daily_bias: string | null; pair: string };
type Prefs = { trading_style: string; main_session: string; markets: string[]; custom_notes: string; response_style: string };

const SUGGESTIONS = ['Analyze my performance', 'What mistakes am I repeating?', 'Review my last 10 trades', 'Analyze my psychology', 'Review my trading plan', 'What is my strongest setup?'];
const card = 'rounded-2xl border border-border/70 bg-card/60';
const label = 'text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground';
const uid = () => Math.random().toString(36).slice(2);

function Robot({ className = '', thinking = false }: { className?: string; thinking?: boolean }) {
  return (
    <div className={`relative ${className}`}>
      <div className={`pointer-events-none absolute inset-[15%] rounded-full bg-primary blur-3xl transition-opacity duration-700 ${thinking ? 'animate-pulse opacity-40' : 'opacity-20'}`} style={{ animationDuration: '2.4s' }} />
      <img src={ROBOT} alt="NOVA" draggable={false} className="nova-float relative h-full w-full select-none object-contain mix-blend-lighten" />
    </div>
  );
}

// ── Real-data metrics & insights ─────────────────────────────────────────────
function useTraderIntel(userId?: string) {
  const [trades, setTrades] = useState<Trade[] | null>(null);
  const [activity, setActivity] = useState<{ text: string; date: string }[]>([]);
  useEffect(() => {
    if (!userId) return;
    (async () => {
      const [t, j, p, a] = await Promise.all([
        supabase.from('trades').select('trade_date,created_at,result,rr,session,weekly_context,daily_bias,pair').eq('user_id', userId).order('trade_date', { ascending: false }).limit(300),
        supabase.from('journal_entries').select('entry_date,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1),
        supabase.from('trade_plans').select('plan_date,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1),
        supabase.from('trading_accounts').select('account_name,last_synced_at').eq('user_id', userId).not('last_synced_at', 'is', null).order('last_synced_at', { ascending: false }).limit(1),
      ]);
      const ts = (t.data || []) as Trade[];
      setTrades(ts);
      const act: { text: string; date: string }[] = [];
      if (ts[0]) act.push({ text: `Last trade logged · ${ts[0].pair}`, date: ts[0].created_at });
      if (j.data?.[0]) act.push({ text: 'Journal entry added', date: j.data[0].created_at });
      if (p.data?.[0]) act.push({ text: `Trade plan updated · ${p.data[0].plan_date}`, date: p.data[0].updated_at });
      if (a.data?.[0]) act.push({ text: `Account synced · ${a.data[0].account_name}`, date: a.data[0].last_synced_at as string });
      setActivity(act.sort((x, y) => +new Date(y.date) - +new Date(x.date)));
    })();
  }, [userId]);

  const metrics = useMemo(() => {
    if (!trades || trades.length < 3) return null;
    const r = trades.map(t => Number(t.result) || 0);
    const wins = r.filter(v => v > 0), losses = r.filter(v => v < 0);
    const gl = Math.abs(losses.reduce((s, v) => s + v, 0)), gw = wins.reduce((s, v) => s + v, 0);
    const rr = trades.filter(t => t.rr != null).map(t => Number(t.rr));
    return {
      winRate: `${Math.round(wins.length / r.length * 100)}%`,
      avgRR: rr.length ? (rr.reduce((s, v) => s + v, 0) / rr.length).toFixed(2) : '—',
      pf: gl ? (gw / gl).toFixed(2) : '—',
      avg: (() => { const a = r.reduce((s, v) => s + v, 0) / r.length; return `${a >= 0 ? '+' : '-'}$${Math.abs(a).toFixed(0)}`; })(),
    };
  }, [trades]);

  const tips = useMemo(() => {
    if (!trades || trades.length < 8) return [];
    const wr = (xs: Trade[]) => xs.length ? Math.round(xs.filter(t => Number(t.result) > 0).length / xs.length * 100) : 0;
    const out: { title: string; body: string }[] = [];
    // Session comparison
    const bySes: Record<string, Trade[]> = {};
    trades.forEach(t => { if (t.session) (bySes[t.session] ||= []).push(t); });
    const ses = Object.entries(bySes).filter(([, v]) => v.length >= 4).map(([k, v]) => ({ k, w: wr(v), n: v.length })).sort((a, b) => b.w - a.w);
    if (ses.length >= 2 && ses[0].w - ses[ses.length - 1].w >= 10)
      out.push({ title: `${ses[0].k} is your strongest session`, body: `${ses[0].w}% win rate over ${ses[0].n} trades vs ${ses[ses.length - 1].w}% in ${ses[ses.length - 1].k}.` });
    // Bias alignment
    const both = trades.filter(t => t.weekly_context && t.daily_bias);
    const norm = (s: string) => s.toLowerCase().includes('bull') ? 'bull' : s.toLowerCase().includes('bear') ? 'bear' : s.toLowerCase();
    const al = both.filter(t => norm(t.weekly_context!) === norm(t.daily_bias!)), mis = both.filter(t => norm(t.weekly_context!) !== norm(t.daily_bias!));
    if (al.length >= 4 && mis.length >= 4 && Math.abs(wr(al) - wr(mis)) >= 10)
      out.push({ title: wr(al) > wr(mis) ? 'Bias alignment pays off' : 'Aligned bias isn’t helping yet', body: `When weekly and daily bias matched you won ${wr(al)}% (${al.length} trades) vs ${wr(mis)}% when they didn’t (${mis.length}).` });
    // First trade of day vs later
    const byDay: Record<string, Trade[]> = {};
    trades.forEach(t => (byDay[t.trade_date] ||= []).push(t));
    const first: Trade[] = [], later: Trade[] = [];
    Object.values(byDay).forEach(d => { const s = [...d].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at)); first.push(s[0]); later.push(...s.slice(1)); });
    if (first.length >= 4 && later.length >= 4 && Math.abs(wr(first) - wr(later)) >= 10)
      out.push({ title: wr(first) > wr(later) ? 'Your first trade is your best' : 'You warm up during the day', body: `First trade of the day wins ${wr(first)}%, later trades win ${wr(later)}%.` });
    return out.slice(0, 3);
  }, [trades]);

  return { trades, metrics, tips, activity };
}

function ago(d: string) {
  const m = Math.round((Date.now() - +new Date(d)) / 60000);
  if (m < 60) return `${Math.max(m, 1)}m ago`; if (m < 1440) return `${Math.round(m / 60)}h ago`; return `${Math.round(m / 1440)}d ago`;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function NovaAI() {
  const { user, profile } = useAuth() as any;
  const firstName = ((profile?.display_name || profile?.full_name || user?.email?.split('@')[0] || '') as string).split(' ')[0];
  const intel = useTraderIntel(user?.id);
  const [convId, setConvId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [usage, setUsage] = useState<{ plan: string; limit: number; used: number; resets_at: string } | null>(null);
  const [outOfCredits, setOutOfCredits] = useState(false);
  const loadUsage = useCallback(async () => {
    const { data } = await (supabase.rpc as any)('get_nova_usage');
    if (data) { setUsage(data); setOutOfCredits(data.limit > 0 && data.used >= data.limit); }
  }, []);
  useEffect(() => { loadUsage(); }, [loadUsage]);
  const [histOpen, setHistOpen] = useState(false);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [prefOpen, setPrefOpen] = useState(false);
  const [intelOpen, setIntelOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const ta = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' }); }, [msgs]);
  useEffect(() => { ta.current?.focus(); }, [convId, busy]);

  const loadConvs = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('nova_conversations').select('id,title,preview,updated_at').eq('user_id', user.id).order('updated_at', { ascending: false }).limit(50);
    setConvs((data || []) as Conv[]);
  }, [user]);

  const openConv = async (id: string) => {
    const { data, error } = await supabase.from('nova_messages').select('id,role,content').eq('conversation_id', id).order('created_at');
    if (error) return toast({ title: 'Could not load conversation', description: error.message, variant: 'destructive' });
    setConvId(id); setMsgs((data || []) as Msg[]); setHistOpen(false);
  };

  const send = async (text: string) => {
    const q = text.trim(); if (!q || busy || !user) return;
    setInput(''); setBusy(true);
    const userMsg: Msg = { id: uid(), role: 'user', content: q };
    const next = [...msgs, userMsg];
    setMsgs(next);
    try {
      let cid = convId;
      if (!cid) {
        const { data, error } = await supabase.from('nova_conversations').insert({ user_id: user.id, title: q.slice(0, 60), preview: q.slice(0, 120) }).select('id').single();
        if (error) throw error; cid = data.id; setConvId(cid);
      }
      const { error: e1 } = await supabase.from('nova_messages').insert({ conversation_id: cid, user_id: user.id, role: 'user', content: q });
      if (e1) throw e1;

      const { data: s } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nova-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        if (j.code === 'nova_credits_exhausted') { setUsage(j.usage ?? usage); setMsgs(m => m.filter(x => x.id !== userMsg.id)); setOutOfCredits(true); return; }
        throw new Error(j.error || `NOVA error (${res.status})`);
      }
      const aid = uid(); let acc = '';
      setMsgs(m => [...m, { id: aid, role: 'assistant', content: '' }]);
      const reader = res.body.getReader(); const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs(m => m.map(x => x.id === aid ? { ...x, content: acc } : x));
      }
      if (!acc.trim()) throw new Error('NOVA returned an empty answer.');
      const { error: e2 } = await supabase.from('nova_messages').insert({ conversation_id: cid, user_id: user.id, role: 'assistant', content: acc });
      if (e2) throw e2;
      loadUsage();
      await supabase.from('nova_conversations').update({ preview: acc.replace(/[#*_`>]/g, '').slice(0, 120) }).eq('id', cid);
    } catch (e: any) {
      toast({ title: 'NOVA could not answer', description: e?.message, variant: 'destructive' });
      setMsgs(m => m.filter(x => x.content !== '' || x.role !== 'assistant'));
    } finally { setBusy(false); }
  };

  const newConv = () => { setConvId(null); setMsgs([]); setInput(''); };
  const empty = msgs.length === 0;

  const intelPanel = (
    <div className="space-y-4">
      <section className={`${card} p-5`}>
        <p className={label}>Trading tips from NOVA</p>
        <div className="mt-4 space-y-3">
          {intel.trades === null ? <p className="text-sm text-muted-foreground">Loading…</p>
            : intel.tips.length ? intel.tips.map(t => (
              <div key={t.title} className="flex gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div><p className="text-sm font-semibold text-foreground">{t.title}</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t.body}</p></div>
              </div>))
              : <p className="text-sm text-muted-foreground">Log more trades (with session and bias) and NOVA will surface patterns here.</p>}
        </div>
      </section>
      <section className={`${card} p-5`}>
        <p className={label}>Performance metrics</p>
        {intel.metrics ? (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {[['Win Rate', intel.metrics.winRate], ['Avg R:R', intel.metrics.avgRR], ['Profit Factor', intel.metrics.pf], ['Avg Trade', intel.metrics.avg]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-border/60 bg-background/40 p-3">
                <p className="text-[11px] text-muted-foreground">{k}</p><p className="mt-1 font-display text-xl font-semibold text-foreground">{v}</p>
              </div>))}
          </div>
        ) : <p className="mt-4 text-sm text-muted-foreground">{intel.trades === null ? 'Loading…' : 'Not enough trading data yet'}</p>}
      </section>
      <section className={`${card} p-5`}>
        <p className={label}>Recent activity</p>
        <ul className="mt-4 space-y-2.5">
          {intel.activity.length ? intel.activity.map(a => (
            <li key={a.text} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-foreground"><Activity className="h-3.5 w-3.5 text-primary" />{a.text}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{ago(a.date)}</span>
            </li>)) : <li className="text-sm text-muted-foreground">No recent activity yet</li>}
        </ul>
      </section>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {usage && usage.limit > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-2 text-xs">
          <span className="text-muted-foreground"><span className="font-semibold uppercase text-primary">{usage.plan}</span> · {usage.used.toLocaleString()} / {usage.limit.toLocaleString()} NOVA credits used · resets {new Date(usage.resets_at + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          <span className="text-muted-foreground">{Math.max(0, usage.limit - usage.used).toLocaleString()} remaining</span>
        </div>
      )}
      {outOfCredits && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
          <span>You've used your NOVA credits for this billing period.</span>
          {usage?.plan === 'pro' && <button onClick={() => { openCustomerPortal().catch(() => { window.location.href = '/pricing'; }); }} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Upgrade to Elite</button>}
        </div>
      )}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Robot className="h-20 w-14 shrink-0 sm:h-24 sm:w-16" thinking={busy} />
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">NOVA <span className="text-base font-medium text-muted-foreground">· Trading Intelligence Workspace</span></h1>
            <p className="mt-1 text-sm text-muted-foreground">Analyze your trading. Understand your behavior. Improve your execution.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { loadConvs(); setHistOpen(true); }} className="flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"><History className="h-3.5 w-3.5" /> History</button>
          <button onClick={() => setPrefOpen(true)} className="flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"><SlidersHorizontal className="h-3.5 w-3.5" /> Update Preferences</button>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,36fr)_minmax(0,64fr)]">
        {/* Conversation first on mobile */}
        <section className={`${card} order-1 flex h-[calc(100vh-13rem)] min-h-[520px] flex-col overflow-hidden lg:order-2`}>
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-3">
            <p className={label}>Active conversation</p>
            <button onClick={newConv} className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-primary"><Plus className="h-3.5 w-3.5" /> New</button>
          </div>
          <div ref={scroller} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {empty ? (
              <div className="flex flex-col items-center pt-2 text-center animate-fade-in">
                <Robot className="h-36 w-28 sm:h-44 sm:w-32" />
                <p className="mt-2 text-xs text-muted-foreground">Ready when you are.</p>
                <div className="mt-5 max-w-lg rounded-2xl border border-primary/25 bg-card p-4 text-left text-sm leading-relaxed text-foreground shadow-[0_0_24px_hsl(var(--primary)/0.08)]">
                  Hey {firstName || 'trader'}, NOVA is ready.<br />I can analyze your trades, plans, journal, execution and performance. What would you like to review?
                </div>
                <div className="mt-4 flex max-w-xl flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map(s => <button key={s} onClick={() => send(s)} className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary">{s}</button>)}
                </div>
              </div>
            ) : msgs.map(m => m.role === 'user' ? (
              <div key={m.id} className="nova-msg flex justify-end gap-2">
                <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl border border-border bg-secondary/60 px-4 py-2.5 text-sm text-foreground">{m.content}</div>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary"><User className="h-3.5 w-3.5 text-muted-foreground" /></div>
              </div>
            ) : (
              <div key={m.id} className="nova-msg flex gap-2">
                <img src={ROBOT} alt="" className="h-8 w-7 shrink-0 object-contain mix-blend-lighten" />
                <div className="max-w-[85%] rounded-2xl border border-primary/25 bg-card px-4 py-3 text-sm text-foreground shadow-[0_0_20px_hsl(var(--primary)/0.06)]">
                  {m.content ? <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-strong:text-foreground"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                    : <span className="animate-pulse text-muted-foreground">NOVA is analyzing your trading data…</span>}
                </div>
              </div>
            ))}
          </div>
          <form onSubmit={e => { e.preventDefault(); send(input); }} className="border-t border-border/60 p-3">
            <div className="flex items-end gap-2 rounded-xl border border-border bg-background/60 p-2 focus-within:border-primary/50">
              <textarea ref={ta} rows={1} value={input} disabled={busy} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask NOVA anything about your trading..." className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Send" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-40"><Send className="h-4 w-4" /></button>
            </div>
          </form>
        </section>

        <aside className="order-2 lg:order-1">
          <button onClick={() => setIntelOpen(o => !o)} className={`${card} mb-3 flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-foreground lg:hidden`}>
            Trader intelligence <ChevronDown className={`h-4 w-4 transition-transform ${intelOpen ? 'rotate-180' : ''}`} />
          </button>
          <div className={`${intelOpen ? 'block' : 'hidden'} lg:block`}>{intelPanel}</div>
        </aside>
      </div>

      <Sheet open={histOpen} onOpenChange={setHistOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>NOVA conversations</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-2 overflow-y-auto">
            {convs.length ? convs.map(c => (
              <button key={c.id} onClick={() => openConv(c.id)} className={`w-full rounded-xl border p-3 text-left transition-colors hover:border-primary/40 ${c.id === convId ? 'border-primary/50' : 'border-border'}`}>
                <div className="flex justify-between gap-2"><p className="truncate text-sm font-semibold text-foreground">{c.title}</p><span className="shrink-0 text-[11px] text-muted-foreground">{new Date(c.updated_at).toLocaleDateString()}</span></div>
                {c.preview && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.preview}</p>}
              </button>)) : <p className="text-sm text-muted-foreground">No saved conversations yet.</p>}
          </div>
        </SheetContent>
      </Sheet>

      <PrefsDialog open={prefOpen} onOpenChange={setPrefOpen} userId={user?.id} />
    </div>
  );
}

function Chips({ options, value, multi, onChange }: { options: string[]; value: string[]; multi?: boolean; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(o => { const on = value.includes(o); return (
        <button type="button" key={o} onClick={() => onChange(multi ? (on ? value.filter(x => x !== o) : [...value, o]) : [o])}
          className={`rounded-full border px-3 py-1 text-xs transition-colors ${on ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>{o}</button>); })}
    </div>
  );
}

function PrefsDialog({ open, onOpenChange, userId }: { open: boolean; onOpenChange: (o: boolean) => void; userId?: string }) {
  const [p, setP] = useState<Prefs>({ trading_style: '', main_session: '', markets: [], custom_notes: '', response_style: 'concise' });
  useEffect(() => {
    if (!open || !userId) return;
    supabase.from('nova_preferences').select('*').eq('user_id', userId).maybeSingle().then(({ data }) => data && setP({
      trading_style: data.trading_style || '', main_session: data.main_session || '', markets: data.markets || [], custom_notes: data.custom_notes || '', response_style: data.response_style || 'concise' }));
  }, [open, userId]);
  const save = async () => {
    if (!userId) return;
    const { error } = await supabase.from('nova_preferences').upsert({ user_id: userId, ...p }, { onConflict: 'user_id' });
    if (error) return toast({ title: 'Could not save preferences', description: error.message, variant: 'destructive' });
    toast({ title: 'NOVA preferences saved' }); onOpenChange(false);
  };
  const row = (t: string, el: React.ReactNode) => <div className="space-y-2"><p className={label}>{t}</p>{el}</div>;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>NOVA preferences</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {row('Trading style', <Chips options={['Scalper', 'Day Trader', 'Swing Trader', 'Custom']} value={[p.trading_style]} onChange={v => setP({ ...p, trading_style: v[0] })} />)}
          {row('Main session', <Chips options={['London', 'New York', 'Asia', 'Multiple']} value={[p.main_session]} onChange={v => setP({ ...p, main_session: v[0] })} />)}
          {row('Markets', <Chips multi options={['Forex', 'Indices', 'Gold', 'Crypto', 'Stocks', 'Custom']} value={p.markets} onChange={v => setP({ ...p, markets: v })} />)}
          {(p.trading_style === 'Custom' || p.markets.includes('Custom')) && row('Custom details', <input className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/50" value={p.custom_notes} onChange={e => setP({ ...p, custom_notes: e.target.value })} placeholder="e.g. NQ futures, ICT concepts" />)}
          {row('Response style', <Chips options={['concise', 'detailed']} value={[p.response_style]} onChange={v => setP({ ...p, response_style: v[0] })} />)}
          <button onClick={save} className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Save preferences</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
