import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Pencil, Save, X, Calendar, Target, Shield, ListChecks,
  FileText, TrendingUp, Check,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const BIAS: Record<string, { label: string; color: string; bg: string; border: string; dot: string }> = {
  bullish: { label: 'Bullish', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  bearish: { label: 'Bearish', color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/30',     dot: 'bg-red-400' },
  neutral: { label: 'Neutral', color: 'text-muted-foreground', bg: 'bg-muted/40',  border: 'border-border',          dot: 'bg-muted-foreground' },
  ranging: { label: 'Ranging', color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   dot: 'bg-amber-400' },
};

const SESSIONS = ['London', 'New York', 'Asia', 'Overlap'];

const DEFAULT_CHECKLIST = [
  { id: 'bias', label: 'Define market bias' },
  { id: 'levels', label: 'Mark key levels' },
  { id: 'confirm', label: 'Wait for confirmation' },
  { id: 'risk', label: 'Follow risk rules' },
  { id: 'news', label: 'Review news / catalysts' },
];

interface FormState {
  market_bias: string;
  focus: string;
  session: string;
  main_setup: string;
  secondary_setup: string;
  max_daily_loss: string;
  max_risk_per_trade: string;
  max_trades: string;
  daily_target: string;
  notes: string;
  checklist: Record<string, boolean>;
}

const emptyForm = (): FormState => ({
  market_bias: 'neutral',
  focus: '',
  session: 'London',
  main_setup: '',
  secondary_setup: '',
  max_daily_loss: '',
  max_risk_per_trade: '',
  max_trades: '',
  daily_target: '',
  notes: '',
  checklist: Object.fromEntries(DEFAULT_CHECKLIST.map(c => [c.id, false])),
});

export default function TradePlanWorkspace() {
  const { user } = useAuth();
  const today = new Date().toISOString().split('T')[0];
  const localKey = `tradeplan-extras-${today}`;

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [planId, setPlanId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  // Load plan
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('trade_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_date', today)
        .maybeSingle();

      const extras = (() => {
        try { return JSON.parse(localStorage.getItem(localKey) || '{}'); }
        catch { return {}; }
      })();

      if (data) {
        setPlanId(data.id);
        setForm({
          market_bias: data.market_bias ?? 'neutral',
          focus: data.focus ?? '',
          session: extras.session ?? 'London',
          main_setup: data.setups_to_trade?.[0] ?? '',
          secondary_setup: data.setups_to_trade?.[1] ?? '',
          max_daily_loss: data.max_daily_loss?.toString() ?? '',
          max_risk_per_trade: data.max_risk_per_trade?.toString() ?? '',
          max_trades: extras.max_trades ?? '',
          daily_target: extras.daily_target ?? '',
          notes: data.notes ?? '',
          checklist: { ...emptyForm().checklist, ...(extras.checklist ?? {}) },
        });
      } else {
        setEditing(true);
      }
      setLoading(false);
    })();
  }, [user, today, localKey]);

  const update = useCallback(<K extends keyof FormState>(k: K, v: FormState[K]) => {
    setForm(f => ({ ...f, [k]: v }));
  }, []);

  // Auto-save notes & checklist extras
  useEffect(() => {
    if (loading) return;
    const t = setTimeout(() => {
      localStorage.setItem(localKey, JSON.stringify({
        session: form.session,
        max_trades: form.max_trades,
        daily_target: form.daily_target,
        checklist: form.checklist,
      }));
    }, 400);
    return () => clearTimeout(t);
  }, [form, localKey, loading]);

  const savePlan = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const setups = [form.main_setup, form.secondary_setup].filter(Boolean);
      const payload = {
        user_id: user.id,
        plan_date: today,
        market_bias: form.market_bias,
        focus: form.focus || null,
        max_daily_loss: form.max_daily_loss ? Number(form.max_daily_loss) : null,
        max_risk_per_trade: form.max_risk_per_trade ? Number(form.max_risk_per_trade) : null,
        setups_to_trade: setups,
        notes: form.notes || null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('trade_plans')
        .upsert(payload, { onConflict: 'user_id,plan_date' })
        .select()
        .single();
      if (error) throw error;
      setPlanId(data.id);
      setEditing(false);
      toast({ title: 'Plan saved', description: 'Your trade plan is locked in.' });
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleCheck = (id: string) => {
    setForm(f => ({ ...f, checklist: { ...f.checklist, [id]: !f.checklist[id] } }));
  };

  const setupCount = useMemo(
    () => [form.main_setup, form.secondary_setup].filter(Boolean).length,
    [form.main_setup, form.secondary_setup],
  );

  const checklistProgress = useMemo(() => {
    const done = DEFAULT_CHECKLIST.filter(c => form.checklist[c.id]).length;
    return Math.round((done / DEFAULT_CHECKLIST.length) * 100);
  }, [form.checklist]);

  const bias = BIAS[form.market_bias] ?? BIAS.neutral;
  const dateLabel = new Date(today).toLocaleDateString(undefined, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="h-32 rounded-3xl bg-muted/30 animate-pulse" />
        <div className="h-96 rounded-3xl bg-muted/30 animate-pulse" />
      </div>
    );
  }

  const readOnly = !editing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="max-w-4xl mx-auto"
    >
      <div className="relative rounded-3xl border border-border/60 bg-card/60 backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-transparent pointer-events-none" />

        {/* HEADER */}
        <div className="relative px-8 py-6 border-b border-border/60 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/10 border border-primary/20">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">Trade Plan</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{dateLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${bias.bg} ${bias.border} ${bias.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${bias.dot}`} />
              {bias.label}
            </span>
            <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-muted/40 border border-border text-muted-foreground">
              {setupCount} {setupCount === 1 ? 'setup' : 'setups'}
            </span>
            <div className="w-px h-6 bg-border mx-1" />
            {editing ? (
              <>
                {planId && (
                  <button
                    onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
                <button
                  onClick={savePlan}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {saving ? 'Saving…' : 'Save Plan'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
          </div>
        </div>

        {/* SECTION: MARKET PLAN */}
        <Section icon={TrendingUp} title="Market Plan" description="Structure for the session ahead">
          <Row label="Market Bias">
            {readOnly ? (
              <span className={`text-sm font-medium ${bias.color}`}>{bias.label}</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(BIAS).map(([k, b]) => (
                  <button
                    key={k}
                    onClick={() => update('market_bias', k)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      form.market_bias === k
                        ? `${b.bg} ${b.border} ${b.color}`
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            )}
          </Row>
          <Row label="Market Focus">
            {readOnly ? (
              <span className="text-sm text-foreground">{form.focus || <Empty />}</span>
            ) : (
              <input
                value={form.focus}
                onChange={e => update('focus', e.target.value)}
                placeholder="e.g. Bullish continuation on NQ pullbacks"
                className="w-full text-sm bg-transparent border-0 p-0 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-0"
              />
            )}
          </Row>
          <Row label="Session">
            {readOnly ? (
              <span className="text-sm text-foreground">{form.session}</span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {SESSIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => update('session', s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      form.session === s
                        ? 'bg-primary/10 border-primary/30 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </Row>
          <Row label="Main Setup">
            {readOnly ? (
              <span className="text-sm text-foreground">{form.main_setup || <Empty />}</span>
            ) : (
              <input
                value={form.main_setup}
                onChange={e => update('main_setup', e.target.value)}
                placeholder="e.g. ICT Silver Bullet"
                className="w-full text-sm bg-transparent border-0 p-0 text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            )}
          </Row>
          <Row label="Secondary Setup" last>
            {readOnly ? (
              <span className="text-sm text-foreground">{form.secondary_setup || <Empty />}</span>
            ) : (
              <input
                value={form.secondary_setup}
                onChange={e => update('secondary_setup', e.target.value)}
                placeholder="e.g. Liquidity sweep + FVG"
                className="w-full text-sm bg-transparent border-0 p-0 text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            )}
          </Row>
        </Section>

        {/* SECTION: RISK */}
        <Section icon={Shield} title="Risk Management" description="Boundaries that protect your capital">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 px-8 pb-6">
            <RiskCard
              label="Max Daily Loss"
              prefix="$"
              value={form.max_daily_loss}
              readOnly={readOnly}
              onChange={v => update('max_daily_loss', v)}
              placeholder="250"
            />
            <RiskCard
              label="Risk Per Trade"
              suffix="%"
              value={form.max_risk_per_trade}
              readOnly={readOnly}
              onChange={v => update('max_risk_per_trade', v)}
              placeholder="0.5"
            />
            <RiskCard
              label="Max Trades"
              value={form.max_trades}
              readOnly={readOnly}
              onChange={v => update('max_trades', v)}
              placeholder="3"
            />
            <RiskCard
              label="Daily Target"
              prefix="$"
              value={form.daily_target}
              readOnly={readOnly}
              onChange={v => update('daily_target', v)}
              placeholder="500"
            />
          </div>
        </Section>

        {/* SECTION: CHECKLIST */}
        <Section icon={ListChecks} title="Execution Checklist" description="Run through before pulling the trigger">
          <div className="px-8 pb-2">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-muted-foreground">{checklistProgress}% complete</span>
              <span className="text-xs text-muted-foreground">
                {DEFAULT_CHECKLIST.filter(c => form.checklist[c.id]).length}/{DEFAULT_CHECKLIST.length}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
              <motion.div
                initial={false}
                animate={{ width: `${checklistProgress}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
              />
            </div>
          </div>
          <div className="px-8 pb-6 pt-4 space-y-1">
            {DEFAULT_CHECKLIST.map(item => {
              const checked = !!form.checklist[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className="group w-full flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-lg hover:bg-muted/40 transition-colors text-left"
                >
                  <div
                    className={`flex items-center justify-center w-5 h-5 rounded-md border transition-all ${
                      checked
                        ? 'bg-primary border-primary'
                        : 'border-border group-hover:border-foreground/40'
                    }`}
                  >
                    {checked && <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />}
                  </div>
                  <span
                    className={`text-sm transition-colors ${
                      checked ? 'text-muted-foreground line-through' : 'text-foreground'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>

        {/* SECTION: NOTES */}
        <Section icon={FileText} title="Notes" description="Key levels, observations, reminders" last>
          <div className="px-8 pb-8">
            <textarea
              value={form.notes}
              onChange={e => update('notes', e.target.value)}
              placeholder="Write freely — markdown welcome. Auto-saves on Save Plan."
              rows={6}
              readOnly={readOnly}
              className="w-full text-sm leading-relaxed bg-transparent border-0 p-0 text-foreground placeholder:text-muted-foreground/50 focus:outline-none resize-none"
            />
          </div>
        </Section>
      </div>
    </motion.div>
  );
}

/* ─────────── Subcomponents ─────────── */

function Section({
  icon: Icon, title, description, children, last,
}: {
  icon: React.ElementType; title: string; description?: string;
  children: React.ReactNode; last?: boolean;
}) {
  return (
    <section className={last ? '' : 'border-b border-border/60'}>
      <div className="px-8 pt-6 pb-4 flex items-start gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted/50 mt-0.5">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground tracking-tight">{title}</h2>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function Row({
  label, children, last,
}: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div
      className={`mx-8 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 sm:gap-6 py-3 ${
        last ? '' : 'border-b border-border/40'
      }`}
    >
      <span className="text-xs font-medium text-muted-foreground pt-1">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function RiskCard({
  label, value, onChange, readOnly, prefix, suffix, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  readOnly: boolean; prefix?: string; suffix?: string; placeholder?: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 hover:border-border transition-colors">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      {readOnly ? (
        <p className="text-base font-semibold text-foreground mt-1">
          {value ? `${prefix ?? ''}${value}${suffix ?? ''}` : <span className="text-muted-foreground/60 font-normal">—</span>}
        </p>
      ) : (
        <div className="flex items-baseline gap-0.5 mt-1">
          {prefix && <span className="text-base font-semibold text-muted-foreground">{prefix}</span>}
          <input
            type="number"
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full text-base font-semibold bg-transparent border-0 p-0 text-foreground placeholder:text-muted-foreground/40 focus:outline-none"
          />
          {suffix && <span className="text-base font-semibold text-muted-foreground">{suffix}</span>}
        </div>
      )}
    </div>
  );
}

function Empty() {
  return <span className="text-muted-foreground/60">—</span>;
}
