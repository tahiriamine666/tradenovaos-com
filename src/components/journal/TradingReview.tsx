import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useActiveAccount } from '@/contexts/ActiveAccountContext';
import { useTradesChanged } from '@/contexts/TradeDialogContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type PeriodType = 'weekly' | 'biweekly';
const ANCHOR = new Date(2024, 0, 1); // Monday, anchors bi-weekly blocks

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function periodFor(type: PeriodType, ref: Date) {
  const d = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  let start = addDays(d, -((d.getDay() + 6) % 7));
  if (type === 'biweekly') {
    const weeks = Math.round((start.getTime() - ANCHOR.getTime()) / (7 * 864e5));
    if (((weeks % 2) + 2) % 2 === 1) start = addDays(start, -7);
  }
  return { start, end: addDays(start, type === 'weekly' ? 6 : 13) };
}

const TEXT_FIELDS = [
  ['what_worked', 'What Worked'], ['what_didnt_work', "What Didn't Work"], ['biggest_mistake', 'Biggest Mistake'],
  ['best_decision', 'Best Decision'], ['recurring_patterns', 'Recurring Patterns'],
  ['rules_followed', 'Rules Followed'], ['rules_broken', 'Rules Broken'],
  ['what_to_fix', 'What I Need to Fix'], ['what_to_modify', 'What I Need to Modify'], ['next_period_focus', 'Next Period Focus'],
  ['keep_doing', 'Keep'], ['stop_doing', 'Stop'], ['start_doing', 'Start'], ['overall_notes', 'Overall Notes'],
] as const;
const RATINGS = [['process_rating', 'Process'], ['execution_rating', 'Execution'], ['risk_rating', 'Risk'], ['psychology_rating', 'Psychology']] as const;
type Review = Record<string, string | number | null>;
const emptyReview = (): Review => Object.fromEntries([...TEXT_FIELDS, ...RATINGS].map(([k]) => [k, null]));

type T = { id: string; pair: string; side: string | null; result: number | null; rr: number | null; session: string | null; setup: string | null; playbook_id: string | null;
  emotion_before: string | null; emotion_after: string | null; confidence_score: number | null; discipline_score: number | null; stress_score: number | null; followed_plan: boolean | null; impulsive_entry: boolean | null };

const avg = (xs: number[]) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
const fmt = (n: number | null, d = 2) => n == null ? '—' : n.toLocaleString(undefined, { maximumFractionDigits: d });
const money = (n: number | null) => n == null ? '—' : `${n > 0 ? '+' : ''}${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
function counts(xs: (string | null)[]) { const m: Record<string, number> = {}; xs.forEach((x) => { if (x) m[x] = (m[x] ?? 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); }
const pct = (xs: (boolean | null)[], v: boolean) => { const k = xs.filter((x) => x != null); return k.length ? `${Math.round(k.filter((x) => x === v).length / k.length * 100)}% (${k.length})` : '—'; };

export function TradingReview() {
  const { user } = useAuth();
  const { activeAccountId, version } = useActiveAccount();
  const [type, setType] = useState<PeriodType>('weekly');
  const [ref, setRef] = useState(new Date());
  const [trades, setTrades] = useState<T[]>([]);
  const [playbooks, setPlaybooks] = useState<Record<string, string>>({});
  const [review, setReview] = useState<Review>(emptyReview());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { start, end } = useMemo(() => periodFor(type, ref), [type, ref]);
  const accountKey = activeAccountId ?? 'all';
  const isCurrent = iso(periodFor(type, new Date()).start) === iso(start);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let q = supabase.from('trades').select('id,pair,side,result,rr,session,setup,playbook_id,emotion_before,emotion_after,confidence_score,discipline_score,stress_score,followed_plan,impulsive_entry')
      .eq('user_id', user.id).gte('trade_date', iso(start)).lte('trade_date', iso(end));
    if (activeAccountId) q = q.eq('trading_account_id', activeAccountId);
    const [{ data: t }, { data: r }, { data: p }] = await Promise.all([
      q,
      supabase.from('trading_reviews').select('*').eq('user_id', user.id).eq('account_key', accountKey).eq('period_type', type).eq('period_start', iso(start)).maybeSingle(),
      supabase.from('playbooks').select('id,title').eq('user_id', user.id),
    ]);
    setTrades((t ?? []) as T[]);
    setPlaybooks(Object.fromEntries((p ?? []).map((x) => [x.id, x.title])));
    setReview(r ? { ...emptyReview(), ...Object.fromEntries(Object.keys(emptyReview()).map((k) => [k, (r as any)[k]])) } : emptyReview());
    setLoading(false);
  }, [user, activeAccountId, accountKey, type, start, end]);
  useEffect(() => { load(); }, [load, version]);
  useTradesChanged(load);

  const stats = useMemo(() => {
    const pnl = trades.map((t) => Number(t.result ?? 0));
    const wins = pnl.filter((x) => x > 0), losses = pnl.filter((x) => x < 0);
    const sorted = [...trades].sort((a, b) => Number(b.result ?? 0) - Number(a.result ?? 0));
    const nums = (k: keyof T) => trades.map((t) => t[k]).filter((x): x is number => typeof x === 'number');
    return {
      total: trades.length, wins: wins.length, losses: losses.length, be: pnl.filter((x) => x === 0).length,
      winRate: trades.length ? wins.length / trades.length * 100 : null,
      net: trades.length ? pnl.reduce((a, b) => a + b, 0) : null,
      rr: avg(trades.filter((t) => t.rr != null).map((t) => Number(t.rr))),
      avgWin: avg(wins), avgLoss: avg(losses), best: sorted[0], worst: sorted[sorted.length - 1],
      pair: counts(trades.map((t) => t.pair))[0],
      sessions: counts(trades.map((t) => t.session)), sides: counts(trades.map((t) => t.side)),
      setups: counts(trades.map((t) => (t.playbook_id && playbooks[t.playbook_id]) || t.setup)),
      conf: avg(nums('confidence_score')), disc: avg(nums('discipline_score')), stress: avg(nums('stress_score')),
      plan: pct(trades.map((t) => t.followed_plan), true), impulsive: pct(trades.map((t) => t.impulsive_entry), true),
      emoBefore: counts(trades.map((t) => t.emotion_before))[0], emoAfter: counts(trades.map((t) => t.emotion_after))[0],
    };
  }, [trades, playbooks]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('trading_reviews').upsert({
      ...(review as any), user_id: user.id, account_id: activeAccountId ?? null, account_key: accountKey,
      period_type: type, period_start: iso(start), period_end: iso(end),
    }, { onConflict: 'user_id,account_key,period_type,period_start' });
    setSaving(false);
    toast(error ? { title: 'Review not saved', description: 'Please try again.', variant: 'destructive' } : { title: 'Review saved' });
  };

  const shift = (dir: number) => setRef(addDays(start, dir * (type === 'weekly' ? 7 : 14)));
  const range = `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
  const set = (k: string, v: string | number | null) => setReview((r) => ({ ...r, [k]: v }));
  const breakdown = (rows: [string, number][]) => rows.length ? rows.map(([k, n]) => `${k} (${n})`).join(', ') : '—';

  return (
    <div className="feature-reveal space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card p-3">
        <div className="flex rounded-md border border-border p-0.5">
          {(['weekly', 'biweekly'] as const).map((p) => (
            <button key={p} type="button" onClick={() => setType(p)} className={cn('rounded px-3 py-1.5 text-xs font-medium transition-colors', type === p ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground')}>
              {p === 'weekly' ? 'Weekly' : 'Bi-Weekly'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Previous period"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" size="sm" onClick={() => setRef(new Date())} disabled={isCurrent}>Current</Button>
          <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Next period"><ChevronRight className="h-4 w-4" /></Button>
          <span className="ml-1 font-mono text-xs text-foreground">{range}</span>
        </div>
      </div>

      {loading ? <Skeleton className="h-96 w-full" /> : (<>
        <Block title="1. Performance Summary">
          {stats.total === 0 ? <p className="text-sm text-muted-foreground">No trades logged in this period.</p> : (<>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              <Kpi l="Trades" v={String(stats.total)} />
              <Kpi l="W / L / BE" v={`${stats.wins} / ${stats.losses} / ${stats.be}`} />
              <Kpi l="Win rate" v={`${fmt(stats.winRate, 1)}%`} />
              <Kpi l="Net P&L" v={money(stats.net)} tone={stats.net} />
              <Kpi l="Avg R:R" v={fmt(stats.rr)} />
              <Kpi l="Avg win" v={money(stats.avgWin)} tone={stats.avgWin} />
              <Kpi l="Avg loss" v={money(stats.avgLoss)} tone={stats.avgLoss} />
              <Kpi l="Best trade" v={stats.best ? `${stats.best.pair} ${money(Number(stats.best.result ?? 0))}` : '—'} />
              <Kpi l="Worst trade" v={stats.worst ? `${stats.worst.pair} ${money(Number(stats.worst.result ?? 0))}` : '—'} />
              <Kpi l="Top pair" v={stats.pair ? `${stats.pair[0]} (${stats.pair[1]})` : '—'} />
            </div>
            <dl className="mt-3 grid gap-1.5 text-xs sm:grid-cols-3">
              <Row l="Sessions" v={breakdown(stats.sessions)} /><Row l="Long vs short" v={breakdown(stats.sides)} /><Row l="Setups / playbooks" v={breakdown(stats.setups)} />
            </dl>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              <Kpi l="Avg confidence" v={stats.conf == null ? '—' : `${fmt(stats.conf, 1)}/10`} />
              <Kpi l="Avg discipline" v={stats.disc == null ? '—' : `${fmt(stats.disc, 1)}/10`} />
              <Kpi l="Avg stress" v={stats.stress == null ? '—' : `${fmt(stats.stress, 1)}/10`} />
              <Kpi l="Followed plan" v={stats.plan} />
              <Kpi l="Impulsive" v={stats.impulsive} />
              <Kpi l="Top emotion before" v={stats.emoBefore ? stats.emoBefore[0] : '—'} />
              <Kpi l="Top emotion after" v={stats.emoAfter ? stats.emoAfter[0] : '—'} />
            </div>
          </>)}
        </Block>

        <Block title="2. Process & Psychology Scores">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {RATINGS.map(([k, l]) => (
              <div key={k}>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">{l} <span className="font-mono text-foreground">{review[k] ?? '—'}/10</span></p>
                <div className="flex gap-0.5">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                    <button key={n} type="button" aria-label={`${l} ${n}`} onClick={() => set(k, review[k] === n ? null : n)}
                      className={cn('h-6 flex-1 rounded-sm border text-[10px] transition-colors', Number(review[k]) >= n ? 'border-primary bg-primary/25 text-primary' : 'border-border text-muted-foreground hover:bg-muted')}>{n}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Block>

        {[
          ['3. What Worked', ['what_worked']], ['4. What Didn\'t Work', ['what_didnt_work']], ['5. Biggest Mistake', ['biggest_mistake']],
          ['6. Best Decision', ['best_decision']], ['7. Recurring Patterns', ['recurring_patterns']], ['8. Rules Followed / Broken', ['rules_followed', 'rules_broken']],
          ['9. What I Need to Fix', ['what_to_fix']], ['10. What I Need to Modify', ['what_to_modify']], ['11. Next Period Focus', ['next_period_focus']],
          ['12. Keep / Stop / Start', ['keep_doing', 'stop_doing', 'start_doing']], ['13. Overall Notes', ['overall_notes']],
        ].map(([title, keys]) => (
          <Block key={title as string} title={title as string}>
            <div className={cn('grid gap-3', (keys as string[]).length === 2 && 'sm:grid-cols-2', (keys as string[]).length === 3 && 'sm:grid-cols-3')}>
              {(keys as string[]).map((k) => (
                <div key={k}>
                  {(keys as string[]).length > 1 && <p className="mb-1.5 text-xs font-medium text-muted-foreground">{TEXT_FIELDS.find(([f]) => f === k)?.[1]}</p>}
                  <textarea value={(review[k] as string) ?? ''} onChange={(e) => set(k, e.target.value || null)} rows={3}
                    className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              ))}
            </div>
          </Block>
        ))}

        <div className="sticky bottom-3 flex justify-end">
          <Button onClick={save} disabled={saving} className="gap-2 shadow-lg"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save review'}</Button>
        </div>
      </>)}
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-md border border-border bg-card p-4"><h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">{title}</h3>{children}</section>;
}
function Kpi({ l, v, tone }: { l: string; v: string; tone?: number | null }) {
  return <div className="rounded-md border border-border bg-background/60 px-3 py-2"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
    <p className={cn('mt-1 truncate font-mono text-sm font-semibold', tone != null && tone > 0 ? 'text-success' : tone != null && tone < 0 ? 'text-danger' : 'text-foreground')}>{v}</p></div>;
}
function Row({ l, v }: { l: string; v: string }) {
  return <div><dt className="text-muted-foreground">{l}</dt><dd className="text-foreground">{v}</dd></div>;
}
