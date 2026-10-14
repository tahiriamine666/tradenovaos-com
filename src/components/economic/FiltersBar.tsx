import { useEffect, useState } from "react";
import { CalendarIcon, Check, ChevronDown, ChevronLeft, ChevronRight, Pencil, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import type { EventFilters, FilterImpact } from "@/lib/economic-calendar/types";
import { EVENT_TYPES, FILTER_IMPACTS, PANEL_CURRENCIES } from "@/lib/economic-calendar/eventTypes";
import { IMPACT_DOT } from "@/lib/economic-calendar/impactStyles";

import { DEFAULT_FILTERS, PRESETS, fromKey, rangeLabel, resolveRange, shiftRange, stepLabel, toKey } from "@/lib/economic-calendar/range";
import type { FilterPreset } from "@/lib/economic-calendar/usePreferences";
import { cn } from "@/lib/utils";

export const CATEGORIES = [...EVENT_TYPES] as string[];
export const MAJOR_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD", "NZD", "CNY"];
const IMPACTS = FILTER_IMPACTS;

const impactLabel = (s: string) => FILTER_IMPACTS.find((i) => i.id === s)?.label ?? s;
const sectionLabel = "text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";
const popCls = "pointer-events-auto border-border bg-popover p-0 shadow-xl data-[state=open]:duration-200";

function summary(sel: string[], all: string[], allLabel: string, noun: string, fmt: (s: string) => string = (s) => s) {
  if (!sel.length || (all.length && sel.length >= all.length)) return allLabel;
  if (sel.length <= 2) return sel.map(fmt).join(" + ");
  return `${sel.length} ${noun}`;
}

// ── Multi-select list ─────────────────────────────────────────────────────────
function MultiList({ options, value, onChange, labelOf = (s) => s }: { options: string[]; value: string[]; onChange: (v: string[]) => void; labelOf?: (s: string) => string }) {
  const toggle = (o: string) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-2">
        <button type="button" onClick={() => onChange([...options])} className="text-[11px] font-semibold text-primary hover:underline">Select All</button>
        <button type="button" onClick={() => onChange([])} className="text-[11px] font-semibold text-muted-foreground hover:text-foreground">Clear</button>
      </div>
      <div className="max-h-64 space-y-0.5 overflow-y-auto pr-1" role="listbox" aria-multiselectable>
        {options.map((o) => {
          const on = value.includes(o);
          return (
            <button key={o} type="button" role="option" aria-selected={on} onClick={() => toggle(o)}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none", on ? "text-foreground" : "text-muted-foreground")}>
              <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors duration-150", on ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                {on && <Check className="h-3 w-3" />}
              </span>
              {labelOf(o)}
            </button>
          );
        })}
        {!options.length && <p className="px-2 py-1.5 text-xs text-muted-foreground">Nothing available</p>}
      </div>
    </div>
  );
}

function MultiDropdown({ title, label, options, value, onChange, labelOf, width = "w-56" }: { title: string; label: string; options: string[]; value: string[]; onChange: (v: string[]) => void; labelOf?: (s: string) => string; width?: string }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9 gap-1.5", value.length && "border-primary/40 text-primary")}>
          {label}<ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn(popCls, width, "p-3")}>
        <p className={cn(sectionLabel, "mb-2 px-1")}>{title}</p>
        <MultiList options={options} value={draft} onChange={setDraft} labelOf={labelOf} />
        <div className="mt-3 flex justify-end">
          <Button size="sm" className="h-8" onClick={() => { onChange(draft.length >= options.length ? [] : draft); setOpen(false); }}>Apply</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Date range ────────────────────────────────────────────────────────────────
function RangePicker({ range, onChange }: { range: EventFilters["range"]; onChange: (r: EventFilters["range"]) => void }) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const cur = resolveRange(range);
  const [draft, setDraft] = useState<DateRange | undefined>({ from: cur.from, to: cur.to });
  useEffect(() => { if (open) { setCustom(range.mode === "custom"); setDraft({ from: cur.from, to: cur.to }); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <CalendarIcon className="h-3.5 w-3.5" />{rangeLabel(range)}<ChevronDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn(popCls, "w-auto max-w-[calc(100vw-1.5rem)]")}>
        {!custom ? (
          <div className="w-52 p-2">
            {PRESETS.map((p) => {
              const on = range.preset === p.id;
              return (
                <button key={p.id} type="button" onClick={() => { onChange({ mode: p.mode, preset: p.id }); setOpen(false); }}
                  className={cn("flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-150 hover:bg-secondary/60", on ? "text-primary" : "text-foreground")}>
                  {p.label}{on && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
            <div className="my-1 h-px bg-border" />
            <button type="button" onClick={() => setCustom(true)} className={cn("flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-sm transition-colors duration-150 hover:bg-secondary/60", range.mode === "custom" ? "text-primary" : "text-foreground")}>
              Custom Range…<ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </button>
          </div>
        ) : (
          <div className="p-3">
            <div className="mb-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border px-3 py-1.5"><p className={sectionLabel}>From</p><p className="text-sm text-foreground">{draft?.from ? format(draft.from, "MMM d, yyyy") : "Start date"}</p></div>
              <div className="rounded-lg border border-border px-3 py-1.5"><p className={sectionLabel}>To</p><p className="text-sm text-foreground">{draft?.to ? format(draft.to, "MMM d, yyyy") : "End date"}</p></div>
            </div>
            <Calendar mode="range" selected={draft} onSelect={setDraft} defaultMonth={draft?.from} numberOfMonths={typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 2} className="pointer-events-auto p-0" />
            <div className="mt-3 flex justify-end gap-2">
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setCustom(false)}>Cancel</Button>
              <Button size="sm" className="h-8" disabled={!draft?.from} onClick={() => {
                if (!draft?.from) return;
                onChange({ mode: "custom", from: toKey(draft.from), to: toKey(draft.to ?? draft.from) });
                setOpen(false);
              }}>Apply</Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Advanced filters panel (draft → Apply) ────────────────────────────────────
const ALL_IMPACTS = FILTER_IMPACTS.map((i) => i.id);
const ALL_TYPES = [...EVENT_TYPES] as string[];
const IMPACT_SWATCH: Record<FilterImpact, string> = IMPACT_DOT;

const expand = <T extends string>(v: T[], all: T[]) => (v.length ? v : [...all]);
const collapse = <T extends string>(v: T[], all: T[]) => (all.every((x) => v.includes(x)) ? [] : v);

/** Number of sections narrowed from "everything this week". */
export function activeFilterCount(f: EventFilters): number {
  let n = 0;
  if (f.range.preset !== "this_week") n++;
  if (f.impacts.length) n++;
  if (f.currencies.length) n++;
  if (f.categories.length) n++;
  if (f.countries.length) n++;
  return n;
}

function CheckRow({ on, label, onToggle, swatch }: { on: boolean; label: string; onToggle: () => void; swatch?: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={on} onClick={onToggle}
      className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm transition-colors duration-150 hover:bg-secondary/60 focus-visible:bg-secondary/60 focus-visible:outline-none", on ? "text-foreground" : "text-muted-foreground")}>
      <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-150", on ? "border-primary bg-primary text-primary-foreground scale-100" : "border-border")}>
        {on && <Check className="h-3 w-3" />}
      </span>
      {swatch && <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", swatch)} />}
      <span className="leading-tight">{label}</span>
    </button>
  );
}

function Section({ title, onAll, onNone, empty, children, className }: { title: string; onAll: () => void; onNone: () => void; empty: boolean; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card/60 p-3", empty && "border-primary/50", className)}>
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <p className={sectionLabel}>{title}</p>
        <div className="flex gap-2 text-[11px] font-semibold">
          <button type="button" onClick={onAll} className="text-primary hover:underline">All</button>
          <button type="button" onClick={onNone} className="text-muted-foreground hover:text-foreground">None</button>
        </div>
      </div>
      {children}
      {empty && <p className="mt-1 px-1 text-[11px] text-primary">Select at least one option.</p>}
    </div>
  );
}

const VIEW_OPTIONS = [...PRESETS.map((p) => ({ id: p.id as string, label: p.label })), { id: "custom", label: "Custom Date Range" }];

function FiltersPanel({ filters, onApply, presets, onSaveDefault, onCreatePreset, onUpdatePreset, onDeletePreset }: {
  filters: EventFilters; onApply: (f: EventFilters) => void;
  presets: FilterPreset[]; onSaveDefault: (f: EventFilters) => Promise<{ error?: string }>;
  onCreatePreset: (n: string, f: EventFilters) => Promise<{ error?: string }>;
  onUpdatePreset: (id: string, p: { name?: string; filters?: EventFilters }) => Promise<{ error?: string }>;
  onDeletePreset: (id: string) => Promise<{ error?: string }>;
}) {
  const [open, setOpen] = useState(false);
  // Draft holds explicit selections (empty = none); converted back to "empty = all" on Apply.
  const toDraft = (f: EventFilters) => ({ ...f, impacts: expand(f.impacts, ALL_IMPACTS), currencies: expand(f.currencies.filter((c) => PANEL_CURRENCIES.includes(c)).length ? f.currencies : [], PANEL_CURRENCIES), categories: expand(f.categories, ALL_TYPES) });
  const fromDraft = (d: EventFilters): EventFilters => ({ ...d, impacts: collapse(d.impacts, ALL_IMPACTS), currencies: collapse(d.currencies, PANEL_CURRENCIES), categories: collapse(d.categories, ALL_TYPES) });
  const [d, setD] = useState(() => toDraft(filters));
  const [naming, setNaming] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const cur = resolveRange(d.range);
  useEffect(() => { if (open) { setD(toDraft(filters)); setNaming(null); setRenaming(null); } }, [open, filters]); // eslint-disable-line react-hooks/exhaustive-deps
  const report = (r: { error?: string }, ok: string) => r.error ? toast({ title: "Could not save", description: r.error, variant: "destructive" }) : toast({ title: ok });
  const toggleIn = <T extends string>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const invalid = !d.impacts.length || !d.currencies.length || !d.categories.length;
  const count = activeFilterCount(filters);
  const viewValue = d.range.mode === "custom" ? "custom" : d.range.preset ?? "this_week";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("h-9 gap-1.5", count > 0 && "border-primary/40 text-primary")}>
          <SlidersHorizontal className="h-3.5 w-3.5" />Filters
          {count > 0 && <span className="ml-0.5 rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground">{count}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" collisionPadding={12} className={cn(popCls, "w-[min(94vw,640px)]")}>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <div className="space-y-3">
              <Section title="Expected Impact" empty={!d.impacts.length} onAll={() => setD({ ...d, impacts: [...ALL_IMPACTS] })} onNone={() => setD({ ...d, impacts: [] })}>
                <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                  {FILTER_IMPACTS.map((i) => <CheckRow key={i.id} on={d.impacts.includes(i.id)} label={i.label} swatch={IMPACT_SWATCH[i.id]} onToggle={() => setD({ ...d, impacts: toggleIn(d.impacts, i.id) })} />)}
                </div>
              </Section>
              <Section title="Event Types" empty={!d.categories.length} onAll={() => setD({ ...d, categories: [...ALL_TYPES] })} onNone={() => setD({ ...d, categories: [] })}>
                <div className="grid grid-cols-2 gap-0.5">
                  {ALL_TYPES.map((t) => <CheckRow key={t} on={d.categories.includes(t)} label={t === "Misc" ? "Miscellaneous" : t} onToggle={() => setD({ ...d, categories: toggleIn(d.categories, t) })} />)}
                </div>
              </Section>
            </div>
            <Section title="Currencies" empty={!d.currencies.length} onAll={() => setD({ ...d, currencies: [...PANEL_CURRENCIES] })} onNone={() => setD({ ...d, currencies: [] })}>
              <div className="grid grid-cols-3 gap-0.5 sm:grid-cols-1">
                {PANEL_CURRENCIES.map((c) => <CheckRow key={c} on={d.currencies.includes(c)} label={c} onToggle={() => setD({ ...d, currencies: toggleIn(d.currencies, c) })} />)}
              </div>
            </Section>
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-3">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="econ-default-view" className={sectionLabel}>Default View</label>
              <select id="econ-default-view" value={viewValue}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "custom") setD({ ...d, range: { mode: "custom", from: toKey(cur.from), to: toKey(cur.to) } });
                  else { const p = PRESETS.find((x) => x.id === v)!; setD({ ...d, range: { mode: p.mode, preset: p.id } }); }
                }}
                className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground focus:border-primary focus:outline-none">
                {VIEW_OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
              <span className="text-[11px] text-muted-foreground">Times in {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            </div>
            {d.range.mode === "custom" && (
              <div className="mt-3 animate-fade-in overflow-x-auto">
                <Calendar mode="range" selected={{ from: cur.from, to: cur.to }} defaultMonth={cur.from}
                  onSelect={(r) => r?.from && setD({ ...d, range: { mode: "custom", from: toKey(r.from), to: toKey(r.to ?? r.from) } })}
                  numberOfMonths={typeof window !== "undefined" && window.innerWidth < 640 ? 1 : 2} className="pointer-events-auto p-0" />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card/60 p-3">
            <p className={cn(sectionLabel, "mb-2 px-1")}>Saved presets</p>
            <div className="space-y-1">
              {presets.length ? presets.map((p) => (
                <div key={p.id} className="group flex items-center gap-1 rounded-lg px-1 hover:bg-secondary/50">
                  {renaming?.id === p.id ? (
                    <Input autoFocus className="h-7 text-xs" value={renaming.name} onChange={(e) => setRenaming({ id: p.id, name: e.target.value })}
                      onKeyDown={async (e) => { if (e.key === "Enter" && renaming.name.trim()) { report(await onUpdatePreset(p.id, { name: renaming.name.trim() }), "Preset renamed"); setRenaming(null); } if (e.key === "Escape") setRenaming(null); }} />
                  ) : (
                    <button type="button" onClick={() => setD(toDraft({ ...p.filters, search: d.search }))} className="flex-1 truncate py-1.5 text-left text-sm text-foreground">{p.name}</button>
                  )}
                  <button type="button" title="Update with current selections" disabled={invalid} onClick={async () => report(await onUpdatePreset(p.id, { filters: fromDraft(d) }), `“${p.name}” updated`)} className="rounded p-1 text-[10px] font-semibold text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100">Edit</button>
                  <button type="button" aria-label="Rename" onClick={() => setRenaming({ id: p.id, name: p.name })} className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"><Pencil className="h-3 w-3" /></button>
                  <button type="button" aria-label="Delete" onClick={async () => report(await onDeletePreset(p.id), "Preset deleted")} className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"><Trash2 className="h-3 w-3" /></button>
                </div>
              )) : <p className="px-1 text-xs text-muted-foreground">No presets yet.</p>}
              {naming === null ? (
                <button type="button" onClick={() => setNaming("")} className="px-1 pt-1 text-xs font-semibold text-primary hover:underline">+ New Preset</button>
              ) : (
                <div className="flex gap-2 pt-1">
                  <Input autoFocus className="h-8 text-xs" placeholder="Preset name, e.g. My Trading News" value={naming} onChange={(e) => setNaming(e.target.value)}
                    onKeyDown={async (e) => { if (e.key === "Enter" && naming.trim() && !invalid) { report(await onCreatePreset(naming.trim(), fromDraft(d)), "Preset saved"); setNaming(null); } }} />
                  <Button size="sm" className="h-8" disabled={!naming.trim() || invalid} onClick={async () => { report(await onCreatePreset(naming.trim(), fromDraft(d)), "Preset saved"); setNaming(null); }}>Save</Button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
          <Button size="sm" variant="ghost" className="h-8" onClick={() => setD(toDraft({ ...DEFAULT_FILTERS, search: d.search }))}>Reset Filters</Button>
          <Button size="sm" variant="outline" className="h-8" disabled={invalid} onClick={async () => report(await onSaveDefault(fromDraft(d)), "Saved as your default")}>Save as Default</Button>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" className="h-8" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" className="h-8" disabled={invalid} onClick={() => { onApply(fromDraft(d)); setOpen(false); }}>Apply Filters</Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Bar ───────────────────────────────────────────────────────────────────────
interface Props {
  filters: EventFilters;
  onChange: (patch: Partial<EventFilters>) => void;
  countries: string[];
  currencies: string[];
  presets: FilterPreset[];
  onSaveDefault: (f: EventFilters) => Promise<{ error?: string }>;
  onCreatePreset: (n: string, f: EventFilters) => Promise<{ error?: string }>;
  onUpdatePreset: (id: string, p: { name?: string; filters?: EventFilters }) => Promise<{ error?: string }>;
  onDeletePreset: (id: string) => Promise<{ error?: string }>;
}

export function FiltersBar(props: Props) {
  const { filters, onChange, countries, currencies } = props;
  const impactIds = IMPACTS.map((i) => i.id);
  const step = stepLabel(filters.range.mode);

  const chips: { key: string; label: string; remove: () => void }[] = [];
  const isDefaultRange = filters.range.preset === "this_week";
  if (!isDefaultRange) chips.push({ key: "range", label: rangeLabel(filters.range), remove: () => onChange({ range: DEFAULT_FILTERS.range }) });
  filters.currencies.forEach((c) => chips.push({ key: `c-${c}`, label: c, remove: () => onChange({ currencies: filters.currencies.filter((x) => x !== c) }) }));
  filters.impacts.forEach((i) => chips.push({ key: `i-${i}`, label: impactLabel(i), remove: () => onChange({ impacts: filters.impacts.filter((x) => x !== i) }) }));
  filters.categories.forEach((c) => chips.push({ key: `k-${c}`, label: c, remove: () => onChange({ categories: filters.categories.filter((x) => x !== c) }) }));
  filters.countries.forEach((c) => chips.push({ key: `n-${c}`, label: c, remove: () => onChange({ countries: filters.countries.filter((x) => x !== c) }) }));
  if (filters.search.trim()) chips.push({ key: "q", label: `“${filters.search.trim()}”`, remove: () => onChange({ search: "" }) });

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/60 p-3 backdrop-blur">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Previous ${step}`} title={`Previous ${step}`} onClick={() => onChange({ range: shiftRange(filters.range, -1) })}><ChevronLeft className="h-4 w-4" /></Button>
          <RangePicker range={filters.range} onChange={(range) => onChange({ range })} />
          <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={`Next ${step}`} title={`Next ${step}`} onClick={() => onChange({ range: shiftRange(filters.range, 1) })}><ChevronRight className="h-4 w-4" /></Button>
        </div>

        <MultiDropdown title="Currencies" label={summary(filters.currencies, currencies, "All Currencies", "Currencies")} options={currencies} value={filters.currencies} onChange={(v) => onChange({ currencies: v })} />
        <MultiDropdown title="Impact" width="w-48" label={summary(filters.impacts, impactIds, "All Impact", "Impacts", impactLabel)} options={impactIds} value={filters.impacts} onChange={(v) => onChange({ impacts: v as FilterImpact[] })} labelOf={impactLabel} />
        <MultiDropdown title="Category" label={summary(filters.categories, CATEGORIES, "All Categories", "Categories")} options={CATEGORIES} value={filters.categories} onChange={(v) => onChange({ categories: v })} />
        <FiltersPanel filters={filters} onApply={(f) => onChange(f)} presets={props.presets}
          onSaveDefault={props.onSaveDefault} onCreatePreset={props.onCreatePreset} onUpdatePreset={props.onUpdatePreset} onDeletePreset={props.onDeletePreset} />

        <div className="relative ml-auto min-w-[200px] flex-1 sm:flex-none">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={filters.search} onChange={(e) => onChange({ search: e.target.value })} placeholder="Search events…" className="h-9 pl-8" />
        </div>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 animate-fade-in">
          {chips.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-0.5 text-[11px] text-foreground">
              {c.label}
              <button type="button" onClick={c.remove} aria-label={`Remove ${c.label}`} className="text-muted-foreground transition-colors hover:text-primary"><X className="h-3 w-3" /></button>
            </span>
          ))}
          <button type="button" onClick={() => onChange({ ...DEFAULT_FILTERS })} className="ml-1 text-[11px] font-semibold text-muted-foreground hover:text-primary">Reset</button>
        </div>
      )}
    </div>
  );
}

export { fromKey };
