import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, BookMarked, BookOpen, ImageIcon, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTradeDialog, useTradesChanged } from '@/contexts/TradeDialogContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { TradeDetailDialog, type DetailTrade } from '@/components/journal/TradeDetailDialog';
import type { Psychology } from '@/components/journal/PsychologyFields';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TradingReview } from '@/components/journal/TradingReview';

type JournalTrade = {
  id: string;
  pair: string;
  side: string | null;
  result: number | null;
  rr: number | null;
  trade_date: string;
  setup: string | null;
  notes: string | null;
  outcome: string | null;
  screenshot_url: string | null;
  before_screenshot_url: string | null;
  session: string | null;
  tags: string[];
  weekly_context: string | null;
  daily_bias: string | null;
  timeframe: string | null;
  playbook_id: string | null;
} & Partial<Psychology>;

async function signedScreenshot(path: string) {
  const storagePath = path.match(/trade-screenshots\/(.+)/)?.[1] ?? path;
  const { data } = await supabase.storage.from('trade-screenshots').createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}

const ctx = (v: string | null) => (v && v.trim() ? v : null);
const fmtDate = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
const money = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const resultOf = (t: JournalTrade) => (t.result == null ? null : Number(t.result) > 0 ? 'Win' : Number(t.result) < 0 ? 'Loss' : 'BE');
type SortKey = 'date' | 'pair' | 'pnl' | 'rr';

export default function TradeJournal() {
  const { user } = useAuth();
  const { activeAccountId, version } = useActiveAccount();
  const { openNew, openEdit } = useTradeDialog();
  const [trades, setTrades] = useState<JournalTrade[]>([]);
  const [screenshots, setScreenshots] = useState<Record<string, { before?: string; after?: string }>>({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DetailTrade | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('trades').select('id,trading_account_id,pair,side,result,rr,trade_date,setup,notes,outcome,screenshot_url,before_screenshot_url,session,tags,weekly_context,daily_bias,timeframe,playbook_id,emotion_before,emotion_after,confidence_score,discipline_score,execution_score,stress_score,followed_plan,impulsive_entry,psychology_note')
      .eq('user_id', user.id).order('trade_date', { ascending: false });
    if (activeAccountId) query = query.eq('trading_account_id', activeAccountId);
    const { data, error } = await query;
    if (error) { toast({ title: "Could not load trades", description: error.message, variant: "destructive" }); setLoading(false); return; }
    const rows = (data ?? []) as JournalTrade[];
    setTrades(rows);
    const pairs = await Promise.all(rows.filter((trade) => trade.screenshot_url || trade.before_screenshot_url).map(async (trade) => {
      const [before, after] = await Promise.all([
        trade.before_screenshot_url ? signedScreenshot(trade.before_screenshot_url) : null,
        trade.screenshot_url ? signedScreenshot(trade.screenshot_url) : null,
      ]);
      return [trade.id, { before: before ?? undefined, after: after ?? undefined }] as const;
    }));
    setScreenshots(Object.fromEntries(pairs));
    setLoading(false);
  }, [user, activeAccountId]);

  useEffect(() => { load(); }, [load, version]);
  useTradesChanged(load);

  const handleDelete = async (trade: JournalTrade) => {
    if (!user) return;
    if (!window.confirm(`Delete the ${trade.pair} trade from ${trade.trade_date}?`)) return;
    const { error } = await supabase.from('trades').delete().eq('id', trade.id).eq('user_id', user.id);
    if (error) {
      toast({ title: 'Could not delete', description: 'Please try again.', variant: 'destructive' });
      return;
    }
    setTrades((prev) => prev.filter((row) => row.id !== trade.id));
    toast({ title: 'Trade removed', description: `${trade.pair} deleted.` });
  };

  const openDetail = (t: JournalTrade) => setSelected({ ...t, weekly: ctx(t.weekly_context) ?? '—', daily: ctx(t.daily_bias) ?? '—' } as DetailTrade);
  const [q, setQ] = useState('');
  const [fPair, setFPair] = useState('');
  const [fResult, setFResult] = useState('');
  const [fSession, setFSession] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'date', dir: -1 });

  const pairs = useMemo(() => Array.from(new Set(trades.map(t => t.pair))).sort(), [trades]);
  const sessions = useMemo(() => Array.from(new Set(trades.map(t => t.session).filter(Boolean) as string[])).sort(), [trades]);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = trades.filter(t =>
      (!fPair || t.pair === fPair) && (!fResult || resultOf(t) === fResult) && (!fSession || t.session === fSession) &&
      (!term || [t.pair, t.setup, t.notes].some(v => v?.toLowerCase().includes(term))));
    const val = (t: JournalTrade): string | number => sort.key === 'date' ? t.trade_date : sort.key === 'pair' ? t.pair : sort.key === 'pnl' ? Number(t.result ?? 0) : Number(t.rr ?? -Infinity);
    return [...list].sort((x, y) => { const a = val(x), b = val(y); return (a < b ? -1 : a > b ? 1 : 0) * sort.dir; });
  }, [trades, q, fPair, fResult, fSession, sort]);

  const stats = useMemo(() => {
    if (!rows.length) return null;
    const withRes = rows.filter(t => t.result != null);
    const wins = withRes.filter(t => Number(t.result) > 0).length;
    const rrs = rows.filter(t => t.rr != null).map(t => Number(t.rr));
    return {
      total: rows.length,
      win: withRes.length ? `${Math.round((wins / withRes.length) * 100)}%` : '—',
      pnl: withRes.length ? withRes.reduce((s, t) => s + Number(t.result), 0) : null,
      rr: rrs.length ? (rrs.reduce((s, v) => s + v, 0) / rrs.length).toFixed(2) : '—',
    };
  }, [rows]);

  const toggleSort = (key: SortKey) => setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'pair' ? 1 : -1 });
  const filtered = !!(q || fPair || fResult || fSession);
  const selectCls = 'h-8 rounded-md border border-border bg-background px-2 text-xs text-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40';
  const tone = (n: number | null) => n == null ? 'text-muted-foreground' : n > 0 ? 'text-success' : n < 0 ? 'text-danger' : 'text-muted-foreground';

  const SortTh = ({ k, label, right }: { k: SortKey; label: string; right?: boolean }) => (
    <th className={cn('whitespace-nowrap px-3 py-2.5 font-medium', right && 'text-right')}>
      <button type="button" onClick={() => toggleSort(k)} className={cn('inline-flex items-center gap-1 uppercase transition-colors hover:text-foreground focus-visible:outline-none focus-visible:text-primary', sort.key === k && 'text-primary')}>
        {label}{sort.key === k ? (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}
      </button>
    </th>
  );

  const ResultBadge = ({ t }: { t: JournalTrade }) => {
    const r = resultOf(t);
    if (!r) return <span className="text-muted-foreground">—</span>;
    return <span className={cn('inline-flex rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', r === 'Win' ? 'bg-success/15 text-success' : r === 'Loss' ? 'bg-danger/15 text-danger' : 'bg-muted text-muted-foreground')}>{r}</span>;
  };

  const Psych = ({ t }: { t: JournalTrade }) => t.discipline_score != null
    ? <span className="font-mono text-xs text-foreground" title="Discipline">{t.discipline_score}/10</span>
    : t.emotion_before ? <span className="text-xs text-muted-foreground">{t.emotion_before}</span> : <span className="text-muted-foreground">—</span>;

  const Charts = ({ t }: { t: JournalTrade }) => {
    const s = screenshots[t.id];
    if (!s?.before && !s?.after) return <ImageIcon className="h-4 w-4 text-muted-foreground/50" aria-label="No charts" />;
    return <div className="flex -space-x-3">{(['before', 'after'] as const).map(k => s[k] && <img key={k} src={s[k]} alt={`${t.pair} ${k} chart`} className="h-8 w-12 rounded-sm border border-border object-cover ring-2 ring-card" />)}</div>;
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Trade Journal</h1>
          <p className="text-sm text-muted-foreground">Every trade, setup and result in one complete journal.</p>
          </div>
        <Button onClick={openNew} className="h-9 gap-2"><Plus className="h-4 w-4" /> Log Trade</Button>
        </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {([['Total Trades', stats ? String(stats.total) : '—', null], ['Win Rate', stats?.win ?? '—', null], ['Net P&L', stats?.pnl != null ? money(stats.pnl) : '—', stats?.pnl ?? null], ['Avg R:R', stats?.rr ?? '—', null]] as [string, string, number | null][]).map(([k, v, n]) => (
          <div key={k} className="bg-card px-4 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p>
            <p className={cn('mt-0.5 font-mono text-lg font-semibold', n != null ? tone(n) : 'text-foreground')}>{v}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="trades" className="space-y-4">
        <TabsList className="h-auto flex-wrap rounded-md border border-border bg-card p-0.5">
          {([['trades', 'Daily Journal'], ['weekly', 'Weekly Review'], ['biweekly', 'Bi-Weekly Review']] as const).map(([v, label]) => (
            <TabsTrigger key={v} value={v} className="h-8 rounded px-4 text-xs font-semibold capitalize transition-colors duration-200 data-[state=active]:bg-primary/15 data-[state=active]:text-primary data-[state=active]:shadow-none">{label}</TabsTrigger>
                  ))}
        </TabsList>
        <TabsContent value="weekly"><TradingReview type="weekly" /></TabsContent>
        <TabsContent value="biweekly"><TradingReview type="biweekly" /></TabsContent>
        <TabsContent value="trades" className="space-y-3">
          {!loading && trades.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-2">
              <div className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search pair, setup, notes" aria-label="Search trades" className={cn(selectCls, 'w-full pl-8')} />
              </div>
              <select value={fPair} onChange={e => setFPair(e.target.value)} aria-label="Filter by pair" className={selectCls}><option value="">All pairs</option>{pairs.map(p => <option key={p}>{p}</option>)}</select>
              <select value={fResult} onChange={e => setFResult(e.target.value)} aria-label="Filter by result" className={selectCls}><option value="">All results</option><option>Win</option><option>Loss</option><option value="BE">Breakeven</option></select>
              {sessions.length > 0 && <select value={fSession} onChange={e => setFSession(e.target.value)} aria-label="Filter by session" className={selectCls}><option value="">All sessions</option>{sessions.map(p => <option key={p}>{p}</option>)}</select>}
              {filtered && <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => { setQ(''); setFPair(''); setFResult(''); setFSession(''); }}>Clear</Button>}
            </div>
          )}

          {loading ? <Skeleton className="h-72 w-full rounded-lg" /> : trades.length === 0 ? (
            <div className="feature-reveal flex min-h-[280px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 px-6 text-center">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md border border-border bg-background"><BookOpen className="h-5 w-5 text-muted-foreground" /></div>
              <p className="text-base font-semibold text-foreground">No trades logged yet</p>
              <p className="mt-1.5 text-sm text-muted-foreground">Your journal becomes more valuable with every trade you record.</p>
              <Button onClick={openNew} className="mt-5 gap-2"><Plus className="h-4 w-4" /> Log First Trade</Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">No trades match these filters.</div>
          ) : (<>
            {/* Desktop table */}
            <div className="feature-reveal hidden overflow-hidden rounded-lg border border-border bg-card md:block">
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 border-b border-border bg-card text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <SortTh k="date" label="Date" /><SortTh k="pair" label="Pair" />
                      <th className="px-3 py-2.5 font-medium">Context</th><th className="px-3 py-2.5 font-medium">Setup</th>
                      <th className="px-3 py-2.5 font-medium">Result</th><SortTh k="pnl" label="P&L" right /><SortTh k="rr" label="R:R" right />
                      <th className="px-3 py-2.5 font-medium">Session / TF</th><th className="px-3 py-2.5 font-medium">Psych</th>
                      <th className="px-3 py-2.5 font-medium">Charts</th><th className="px-3 py-2.5 font-medium sr-only">Actions</th>
                </tr>
              </thead>
              <tbody className="journal-rows divide-y divide-border">
                    {rows.map(t => {
                      const pnl = t.result == null ? null : Number(t.result);
                      const w = ctx(t.weekly_context), d = ctx(t.daily_bias);
                  return (
                        <tr key={t.id} onClick={() => openDetail(t)} tabIndex={0} onKeyDown={e => e.key === 'Enter' && openDetail(t)}
                          className="group h-12 cursor-pointer transition-colors duration-200 hover:bg-primary/5 focus:bg-primary/5 focus:outline-none">
                          <td className="whitespace-nowrap px-3 text-xs text-muted-foreground">{fmtDate(t.trade_date)}</td>
                          <td className="whitespace-nowrap px-3 font-semibold text-foreground">{t.pair}{t.side && <span className="ml-1.5 text-[10px] font-medium uppercase text-muted-foreground">{t.side}</span>}</td>
                          <td className="whitespace-nowrap px-3 text-xs">
                            {w || d ? <div className="flex flex-col leading-tight"><span><span className="text-muted-foreground">W:</span> <Bias v={w} /></span><span><span className="text-muted-foreground">D:</span> <Bias v={d} /></span></div> : <span className="text-muted-foreground">—</span>}
                          </td>
                          <td className="max-w-[180px] px-3 text-xs text-foreground">
                            <span className="flex items-center gap-1 truncate">{t.playbook_id && <BookMarked className="h-3 w-3 shrink-0 text-primary" aria-label="Playbook" />}<span className="truncate">{t.setup || '—'}</span></span>
                            {t.notes && <span className="block truncate text-[11px] text-muted-foreground">{t.notes}</span>}
                          </td>
                          <td className="px-3"><ResultBadge t={t} /></td>
                          <td className={cn('whitespace-nowrap px-3 text-right font-mono font-semibold', tone(pnl))}>{pnl == null ? '—' : money(pnl)}</td>
                          <td className="whitespace-nowrap px-3 text-right font-mono text-foreground">{t.rr != null ? `${Number(t.rr).toFixed(2)}R` : '—'}</td>
                          <td className="whitespace-nowrap px-3 text-xs text-muted-foreground">{[t.session, t.timeframe].filter(Boolean).join(' · ') || '—'}</td>
                          <td className="px-3"><Psych t={t} /></td>
                          <td className="px-3"><Charts t={t} /></td>
                          <td className="px-3">
                            <div className="flex items-center justify-end gap-1 opacity-60 transition-opacity duration-200 group-hover:opacity-100 group-focus:opacity-100">
                              <button type="button" aria-label={`Edit ${t.pair} trade`} onClick={e => { e.stopPropagation(); openEdit(t as never); }} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><Pencil className="h-3.5 w-3.5" /></button>
                              <button type="button" aria-label={`Delete ${t.pair} trade`} onClick={e => { e.stopPropagation(); handleDelete(t); }} className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-danger/15 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

            {/* Mobile cards */}
            <div className="journal-rows space-y-2 md:hidden">
              {rows.map(t => {
                const pnl = t.result == null ? null : Number(t.result);
                const w = ctx(t.weekly_context), d = ctx(t.daily_bias);
                return (
                  <article key={t.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2"><span className="font-semibold text-foreground">{t.pair}</span><ResultBadge t={t} /></div>
                      <span className={cn('font-mono text-sm font-semibold', tone(pnl))}>{pnl == null ? '—' : money(pnl)}</span>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <div><dt className="inline text-muted-foreground">Date: </dt><dd className="inline text-foreground">{fmtDate(t.trade_date)}</dd></div>
                      <div><dt className="inline text-muted-foreground">R:R: </dt><dd className="inline font-mono text-foreground">{t.rr != null ? `${Number(t.rr).toFixed(2)}R` : '—'}</dd></div>
                      <div><dt className="inline text-muted-foreground">Bias: </dt><dd className="inline text-foreground">{d || w || '—'}</dd></div>
                      <div><dt className="inline text-muted-foreground">Session: </dt><dd className="inline text-foreground">{t.session || '—'}</dd></div>
                    </dl>
                    <div className="mt-2.5 flex items-center justify-between border-t border-border pt-2">
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-primary" onClick={() => openDetail(t)}>View Details</Button>
                      <div className="flex gap-1">
                        <button type="button" aria-label={`Edit ${t.pair} trade`} onClick={() => openEdit(t as never)} className="rounded p-1.5 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                        <button type="button" aria-label={`Delete ${t.pair} trade`} onClick={() => handleDelete(t)} className="rounded p-1.5 text-muted-foreground hover:text-danger"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>)}
        </TabsContent>
      </Tabs>
      <TradeDetailDialog trade={selected} open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }} />
    </div>
  );
}

function Bias({ v }: { v: string | null }) {
  if (!v) return <span className="text-muted-foreground">—</span>;
  const n = v.toLowerCase();
  return <span className={cn('font-medium', n.includes('bull') ? 'text-success' : n.includes('bear') ? 'text-danger' : 'text-foreground')}>{v}</span>;
}
