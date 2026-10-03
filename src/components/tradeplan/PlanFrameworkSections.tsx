import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, Target, ChevronDown, Plus, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface PlanFramework {
  weekly: {
    enabled: boolean;
    structure: string; major_liquidity: string; external_liquidity: string;
    price_location: string; narrative: string; bullish_scenario: string;
    bearish_scenario: string; news: string; bias: string; main_idea: string;
    rules: string[];
  };
  scenario: {
    enabled: boolean;
    market: string; setup: string; confirmation: string;
    invalidation: string; trigger: string;
  };
  daily: {
    enabled: boolean;
    weekly_context: string; structure: string; bias: string; current_price: string;
    key_level: string; key_level_other: string; scenario: string;
    news: string; news_other: string; direction: string; rules: string[];
  };
}

export const EMPTY_FRAMEWORK: PlanFramework = {
  weekly: {
    enabled: false, structure: '', major_liquidity: '', external_liquidity: '',
    price_location: '', narrative: '', bullish_scenario: '', bearish_scenario: '',
    news: '', bias: '', main_idea: '', rules: [],
  },
  scenario: { enabled: false, market: '', setup: '', confirmation: '', invalidation: '', trigger: '' },
  daily: {
    enabled: false, weekly_context: '', structure: '', bias: '', current_price: '',
    key_level: '', key_level_other: '', scenario: '', news: '', news_other: '',
    direction: '', rules: ['No Confirmation = No Trade'],
  },
};

export function normalizeFramework(raw: any): PlanFramework {
  const r = raw && typeof raw === 'object' ? raw : {};
  return {
    weekly: { ...EMPTY_FRAMEWORK.weekly, ...(r.weekly ?? {}) },
    scenario: { ...EMPTY_FRAMEWORK.scenario, ...(r.scenario ?? {}) },
    daily: { ...EMPTY_FRAMEWORK.daily, ...(r.daily ?? {}) },
  };
}

const inputCls = 'w-full text-sm text-white/80 placeholder:text-white/20 bg-white/[0.03] border border-white/[0.07] rounded-xl px-3 py-2.5 focus:outline-none focus:border-primary/40 transition-colors';

function Field({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">{label}</p>
      <select value={value} onChange={e => onChange(e.target.value)} className={`${inputCls} cursor-pointer text-white/70`}>
        <option value="">Select...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function RulesEditor({ title, rules, onChange, placeholder }: { title: string; rules: string[]; onChange: (r: string[]) => void; placeholder: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">{title}</p>
      <div className="space-y-2">
        {rules.map((r, i) => (
          <div key={i} className="flex gap-2">
            <input value={r} placeholder={placeholder} onChange={e => onChange(rules.map((x, j) => j === i ? e.target.value : x))} className={inputCls} />
            <button type="button" aria-label="Delete rule" onClick={() => onChange(rules.filter((_, j) => j !== i))}
              className="px-2.5 rounded-xl border border-white/[0.08] text-white/30 hover:text-primary hover:border-primary/30 transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => onChange([...rules, ''])}
        className="mt-2 flex items-center gap-2 text-xs text-white/35 hover:text-primary transition-colors px-1">
        <Plus className="h-3.5 w-3.5" /> Add Rule
      </button>
    </div>
  );
}

function OptionalCard({ title, icon: Icon, enabled, onEnable, onSkip, enableLabel, children }: {
  title: string; icon: React.ElementType; enabled: boolean; onEnable: () => void; onSkip: () => void;
  enableLabel: string; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-white/[0.06]">
      <div className="flex items-center justify-between w-full px-6 py-4 gap-3">
        <button type="button" onClick={() => setOpen(v => !v)} className="flex items-center gap-2.5 flex-1 text-left group">
          <div className="w-6 h-6 rounded-lg bg-white/[0.04] flex items-center justify-center">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <p className="text-xs font-black text-white/70 uppercase tracking-widest">{title}</p>
          <span className="text-[9px] font-bold uppercase tracking-wider text-white/25 border border-white/[0.08] rounded-full px-2 py-0.5">Optional</span>
        </button>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-lg border border-white/[0.08] overflow-hidden text-[10px] font-bold">
            <button type="button" onClick={onSkip} className={`px-2.5 py-1 transition-colors ${!enabled ? 'bg-white/[0.06] text-white/70' : 'text-white/30 hover:text-white/60'}`}>Skip</button>
            <button type="button" onClick={() => { onEnable(); setOpen(true); }} className={`px-2.5 py-1 transition-colors ${enabled ? 'bg-primary/15 text-primary' : 'text-white/30 hover:text-white/60'}`}>Enable</button>
          </div>
          <button type="button" aria-label={open ? 'Collapse' : 'Expand'} onClick={() => setOpen(v => !v)} className="p-1 text-white/25 hover:text-white/50">
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="px-6 pb-5">
              {enabled ? children : (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-white/[0.08] px-4 py-3">
                  <p className="text-xs text-white/35">{title.charAt(0) + title.slice(1).toLowerCase()} is optional</p>
                  <button type="button" onClick={onEnable}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/25 bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/15 transition-colors">
                    <Plus className="h-3 w-3" /> {enableLabel}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function PlanFrameworkSections({ value, onChange }: { value: PlanFramework; onChange: (f: PlanFramework) => void }) {
  const w = value.weekly, s = value.scenario, d = value.daily;
  const setW = (patch: Partial<PlanFramework['weekly']>) => onChange({ ...value, weekly: { ...w, ...patch } });
  const setS = (patch: Partial<PlanFramework['scenario']>) => onChange({ ...value, scenario: { ...s, ...patch } });
  const setD = (patch: Partial<PlanFramework['daily']>) => onChange({ ...value, daily: { ...d, ...patch } });
  const grid = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4';

  return (
    <>
      <OptionalCard title="Weekly Outlook" icon={CalendarDays} enabled={w.enabled} enableLabel="Add Weekly Outlook"
        onEnable={() => setW({ enabled: true })} onSkip={() => setW({ enabled: false })}>
        <div className="space-y-5">
          <div className={grid}>
            <Field label="01 — Weekly Structure" value={w.structure} options={['Bullish', 'Bearish', 'Range']} onChange={v => setW({ structure: v })} />
            <Field label="02 — Major Liquidity" value={w.major_liquidity} options={['Major High', 'Major Low', 'Both']} onChange={v => setW({ major_liquidity: v })} />
            <Field label="03 — External Liquidity" value={w.external_liquidity} options={['BSL', 'SSL', 'Both']} onChange={v => setW({ external_liquidity: v })} />
            <Field label="04 — Current Price Location" value={w.price_location} options={['Premium', 'Discount', 'Mid-Range']} onChange={v => setW({ price_location: v })} />
            <Field label="05 — Weekly Narrative" value={w.narrative} options={['Impulse', 'Retracement', 'Expansion', 'Consolidation', 'Reversal']} onChange={v => setW({ narrative: v })} />
            <Field label="06 — Bullish Scenario" value={w.bullish_scenario} options={['Continue Higher', 'Sweep Low → Bullish Reaction', 'No Bullish Scenario']} onChange={v => setW({ bullish_scenario: v })} />
            <Field label="07 — Bearish Scenario" value={w.bearish_scenario} options={['Continue Lower', 'Sweep High → Bearish Reaction', 'No Bearish Scenario']} onChange={v => setW({ bearish_scenario: v })} />
            <Field label="08 — Important News / Events" value={w.news} options={['None', 'Low Impact', 'Medium Impact', 'High Impact']} onChange={v => setW({ news: v })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-[220px_minmax(0,1fr)] gap-4">
            <Field label="Weekly Bias" value={w.bias} options={['Bullish', 'Bearish', 'Neutral']} onChange={v => setW({ bias: v })} />
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Main Idea</p>
              <textarea rows={2} value={w.main_idea} onChange={e => setW({ main_idea: e.target.value })} placeholder="Describe the main weekly idea..." className={`${inputCls} resize-none`} />
            </div>
          </div>
          <RulesEditor title="Weekly Rules" rules={w.rules} onChange={r => setW({ rules: r })} placeholder="e.g. Wait for liquidity sweep" />
        </div>
      </OptionalCard>

      <OptionalCard title="Scenario Before Trade" icon={Target} enabled={s.enabled} enableLabel="Enable Scenario"
        onEnable={() => setS({ enabled: true })} onSkip={() => setS({ enabled: false })}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Market Scenario" value={s.market} options={['Bullish', 'Bearish', 'Neutral', 'Wait']} onChange={v => setS({ market: v })} />
            <Field label="Expected Setup" value={s.setup} options={['Liquidity Sweep', 'Breakout', 'Retracement', 'Reversal', 'Continuation', 'Other']} onChange={v => setS({ setup: v })} />
            <Field label="Confirmation Required" value={s.confirmation} options={['Market Structure Shift', 'Break of Structure', 'Fair Value Gap', 'Liquidity Sweep', 'Price Action', 'Other']} onChange={v => setS({ confirmation: v })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Invalidation</p>
              <textarea rows={2} value={s.invalidation} onChange={e => setS({ invalidation: e.target.value })} placeholder="Describe what would invalidate this scenario..." className={`${inputCls} resize-none`} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-2">Trigger</p>
              <textarea rows={2} value={s.trigger} onChange={e => setS({ trigger: e.target.value })} placeholder="What needs to happen before entering?" className={`${inputCls} resize-none`} />
            </div>
          </div>
        </div>
      </OptionalCard>

      <OptionalCard title="Daily Outlook" icon={CalendarDays} enabled={d.enabled} enableLabel="Enable Daily Outlook"
        onEnable={() => setD({ enabled: true })} onSkip={() => setD({ enabled: false })}>
        <div className="space-y-5">
          <div className={grid}>
            <Field label="01 — Weekly Context" value={d.weekly_context} options={['Bullish', 'Bearish', 'Range']} onChange={v => setD({ weekly_context: v })} />
            <Field label="02 — Daily Structure" value={d.structure} options={['Bullish', 'Bearish', 'Range', 'Transition']} onChange={v => setD({ structure: v })} />
            <Field label="03 — Daily Bias" value={d.bias} options={['Bullish', 'Bearish', 'Neutral']} onChange={v => setD({ bias: v })} />
            <Field label="04 — Current Price" value={d.current_price} options={['Premium', 'Discount', 'Mid-Range']} onChange={v => setD({ current_price: v })} />
            <div className="space-y-2">
              <Field label="05 — Key Level" value={d.key_level} options={['HTF PD Array', 'Previous High', 'Previous Low', 'Dealing Range', 'Other']} onChange={v => setD({ key_level: v })} />
              {d.key_level === 'Other' && <input value={d.key_level_other} onChange={e => setD({ key_level_other: e.target.value })} placeholder="Enter custom key level..." className={inputCls} />}
            </div>
            <Field label="06 — Daily Scenario" value={d.scenario} options={['Bullish Scenario', 'Bearish Scenario', 'Wait / Neutral']} onChange={v => setD({ scenario: v })} />
            <div className="space-y-2">
              <Field label="07 — News / Events" value={d.news} options={['No Major News', 'Major News', 'Central Bank', 'CPI / NFP', 'Other']} onChange={v => setD({ news: v })} />
              {d.news === 'Other' && <input value={d.news_other} onChange={e => setD({ news_other: e.target.value })} placeholder="Enter custom event..." className={inputCls} />}
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-4">
            <p className="text-xs font-black text-white/70 uppercase tracking-widest flex items-center gap-2"><Target className="h-3.5 w-3.5 text-primary" /> Today's Plan</p>
            <div className="max-w-xs">
              <Field label="Main Direction" value={d.direction} options={['Long', 'Short', 'Neutral']} onChange={v => setD({ direction: v })} />
            </div>
            <RulesEditor title="Rules" rules={d.rules} onChange={r => setD({ rules: r })} placeholder="Add a rule..." />
          </div>
        </div>
      </OptionalCard>
    </>
  );
}
