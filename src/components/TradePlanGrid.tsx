// Excel-like Trade Plan grid: editable rows (one per day), draggable/resizable/reorderable columns.
// Per-user column layout persisted in public.workspace_layouts (page='trade_plan_grid').
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Trash2, Save, RotateCcw, GripVertical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ── Column schema ────────────────────────────────────────────────────────────
type ColType = 'date' | 'text' | 'number' | 'select';
interface ColDef {
  key: string;
  label: string;
  type: ColType;
  width: number;
  options?: string[];
  align?: 'left' | 'right' | 'center';
}

const DEFAULT_COLUMNS: ColDef[] = [
  { key: 'plan_date',          label: 'Date',           type: 'date',   width: 130 },
  { key: 'market_bias',        label: 'Bias',           type: 'select', width: 110, options: ['bullish','bearish','neutral','ranging'] },
  { key: 'session',            label: 'Session',        type: 'select', width: 150, options: ['London','New York','Asia','London/NY Overlap','Pre-Market'] },
  { key: 'focus',              label: 'Focus',          type: 'text',   width: 280 },
  { key: 'main_setup',         label: 'Main Setup',     type: 'text',   width: 200 },
  { key: 'secondary_setup',    label: 'Secondary Setup',type: 'text',   width: 200 },
  { key: 'confidence',         label: 'Confidence %',   type: 'number', width: 110, align: 'right' },
  { key: 'volatility',         label: 'Volatility',     type: 'select', width: 110, options: ['low','normal','high'] },
  { key: 'max_daily_loss',     label: 'Max Daily Loss', type: 'number', width: 130, align: 'right' },
  { key: 'max_risk_per_trade', label: 'Risk/Trade %',   type: 'number', width: 120, align: 'right' },
  { key: 'daily_target',       label: 'Daily Target',   type: 'number', width: 120, align: 'right' },
  { key: 'max_trades',         label: 'Max Trades',     type: 'number', width: 100, align: 'right' },
  { key: 'emotion',            label: 'Emotion',        type: 'select', width: 120, options: ['focused','confident','anxious','tired','excited','uncertain','calm','frustrated'] },
  { key: 'notes',              label: 'Notes',          type: 'text',   width: 320 },
];

const LAYOUT_PAGE = 'trade_plan_grid';
const MIN_COL_WIDTH = 60;

interface Row {
  id?: string;
  plan_date: string;
  market_bias?: string;
  session?: string;
  focus?: string;
  main_setup?: string;       // virtual -> setups_to_trade[0]
  secondary_setup?: string;  // setups_to_trade[1] or column secondary_setup
  confidence?: number;
  volatility?: string;
  max_daily_loss?: number | null;
  max_risk_per_trade?: number | null;
  daily_target?: number | null;
  max_trades?: number | null;
  emotion?: string;
  notes?: string;
  _dirty?: boolean;
  _saving?: boolean;
  _tempKey?: string;
}

function todayStr() { return new Date().toISOString().split('T')[0]; }

function dbToRow(d: any): Row {
  const setups = (d.setups_to_trade as string[] | null) ?? [];
  return {
    id: d.id,
    plan_date: d.plan_date,
    market_bias: d.market_bias ?? '',
    session: d.session ?? '',
    focus: d.focus ?? '',
    main_setup: setups[0] ?? '',
    secondary_setup: setups[1] ?? d.secondary_setup ?? '',
    confidence: d.confidence ?? undefined,
    volatility: d.volatility ?? '',
    max_daily_loss: d.max_daily_loss,
    max_risk_per_trade: d.max_risk_per_trade,
    daily_target: d.daily_target,
    max_trades: d.max_trades,
    emotion: d.emotion ?? '',
    notes: d.notes ?? '',
  };
}

function rowToDb(r: Row, userId: string) {
  return {
    user_id: userId,
    plan_date: r.plan_date,
    market_bias: r.market_bias || null,
    session: r.session || null,
    focus: r.focus || null,
    setups_to_trade: [r.main_setup || '', r.secondary_setup || ''],
    secondary_setup: r.secondary_setup || null,
    confidence: r.confidence ?? null,
    volatility: r.volatility || null,
    max_daily_loss: r.max_daily_loss ?? null,
    max_risk_per_trade: r.max_risk_per_trade ?? null,
    daily_target: r.daily_target ?? null,
    max_trades: r.max_trades ?? null,
    emotion: r.emotion || null,
    notes: r.notes || null,
    name: r.market_bias || 'plan',
    updated_at: new Date().toISOString(),
  };
}

export default function TradePlanGrid() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [columns, setColumns] = useState<ColDef[]>(DEFAULT_COLUMNS);
  const [loading, setLoading] = useState(true);
  const layoutSaveTimer = useRef<any>(null);
  const rowSaveTimers = useRef<Record<string, any>>({});

  // ── Load data + layout ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [plansRes, layoutRes] = await Promise.all([
        supabase.from('trade_plans').select('*').eq('user_id', user.id).order('plan_date', { ascending: false }).limit(200),
        supabase.from('workspace_layouts').select('layout').eq('user_id', user.id).eq('page', LAYOUT_PAGE).maybeSingle(),
      ]);
      const data = plansRes.data ?? [];
      setRows(data.length ? data.map(dbToRow) : [{ plan_date: todayStr(), _tempKey: 'init' }]);

      const saved = (layoutRes.data?.layout as any)?.columns as ColDef[] | undefined;
      if (saved && Array.isArray(saved) && saved.length) {
        // Merge: keep order/width from saved, but ensure all default keys still present
        const byKey = new Map(saved.map(c => [c.key, c]));
        const merged: ColDef[] = [];
        for (const s of saved) {
          const def = DEFAULT_COLUMNS.find(d => d.key === s.key);
          if (def) merged.push({ ...def, width: Math.max(MIN_COL_WIDTH, s.width || def.width) });
        }
        for (const d of DEFAULT_COLUMNS) {
          if (!byKey.has(d.key)) merged.push(d);
        }
        setColumns(merged);
      }
      setLoading(false);
    })();
  }, [user]);

  // ── Persist layout (debounced) ──────────────────────────────────────────
  const persistLayout = useCallback((cols: ColDef[]) => {
    if (!user) return;
    clearTimeout(layoutSaveTimer.current);
    layoutSaveTimer.current = setTimeout(async () => {
      const payload = {
        user_id: user.id,
        page: LAYOUT_PAGE,
        layout: { columns: cols.map(c => ({ key: c.key, width: c.width })) },
        updated_at: new Date().toISOString(),
      };
      await supabase.from('workspace_layouts').upsert(payload, { onConflict: 'user_id,page' });
    }, 500);
  }, [user]);

  const updateColumns = (next: ColDef[]) => {
    setColumns(next);
    persistLayout(next);
  };

  // ── Column resize ────────────────────────────────────────────────────────
  const resizeRef = useRef<{ idx: number; startX: number; startW: number } | null>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const r = resizeRef.current; if (!r) return;
      const dx = e.clientX - r.startX;
      const w = Math.max(MIN_COL_WIDTH, r.startW + dx);
      setColumns(prev => {
        const next = [...prev];
        next[r.idx] = { ...next[r.idx], width: w };
        return next;
      });
    };
    const onUp = () => {
      if (resizeRef.current) {
        resizeRef.current = null;
        document.body.style.cursor = '';
        setColumns(curr => { persistLayout(curr); return curr; });
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [persistLayout]);

  const startResize = (idx: number, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    resizeRef.current = { idx, startX: e.clientX, startW: columns[idx].width };
    document.body.style.cursor = 'col-resize';
  };

  // ── Column reorder via HTML5 drag ───────────────────────────────────────
  const [dragCol, setDragCol] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<number | null>(null);
  const onColDragStart = (idx: number) => (e: React.DragEvent) => {
    setDragCol(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };
  const onColDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragOverCol !== idx) setDragOverCol(idx);
  };
  const onColDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (dragCol === null || dragCol === idx) { setDragCol(null); setDragOverCol(null); return; }
    const next = [...columns];
    const [moved] = next.splice(dragCol, 1);
    next.splice(idx, 0, moved);
    setDragCol(null); setDragOverCol(null);
    updateColumns(next);
  };

  const resetLayout = () => updateColumns(DEFAULT_COLUMNS);

  // ── Row editing & autosave ──────────────────────────────────────────────
  const scheduleSave = useCallback((rowKey: string) => {
    clearTimeout(rowSaveTimers.current[rowKey]);
    rowSaveTimers.current[rowKey] = setTimeout(() => saveRow(rowKey), 800);
  }, []);

  const saveRow = useCallback(async (rowKey: string) => {
    if (!user) return;
    setRows(curr => {
      const idx = curr.findIndex(r => (r.id ?? r._tempKey) === rowKey);
      if (idx < 0) return curr;
      const row = curr[idx];
      if (!row.plan_date) return curr;
      const payload = rowToDb(row, user.id);

      (async () => {
        if (row.id) {
          await supabase.from('trade_plans').update(payload).eq('id', row.id);
        } else {
          const { data, error } = await supabase
            .from('trade_plans')
            .upsert(payload, { onConflict: 'user_id,plan_date' })
            .select('id')
            .single();
          if (!error && data?.id) {
            setRows(rs => rs.map(r => (r._tempKey === row._tempKey ? { ...r, id: data.id, _dirty: false } : r)));
          }
        }
      })();

      const next = [...curr];
      next[idx] = { ...row, _dirty: false };
      return next;
    });
  }, [user]);

  const updateCell = (rowIdx: number, key: string, value: any) => {
    setRows(curr => {
      const next = [...curr];
      const r = { ...next[rowIdx], [key]: value, _dirty: true };
      next[rowIdx] = r;
      const rk = r.id ?? r._tempKey ?? `row-${rowIdx}`;
      if (!r._tempKey && !r.id) r._tempKey = rk;
      scheduleSave(rk);
      return next;
    });
  };

  const addRow = () => {
    const used = new Set(rows.map(r => r.plan_date));
    let d = new Date();
    let s = d.toISOString().split('T')[0];
    while (used.has(s)) { d.setDate(d.getDate() - 1); s = d.toISOString().split('T')[0]; }
    setRows(rs => [{ plan_date: s, _tempKey: crypto.randomUUID(), _dirty: true }, ...rs]);
  };

  const deleteRow = async (rowIdx: number) => {
    const r = rows[rowIdx];
    if (r.id) await supabase.from('trade_plans').delete().eq('id', r.id);
    setRows(rs => rs.filter((_, i) => i !== rowIdx));
    toast({ title: 'Plan deleted' });
  };

  // ── Render cell input ────────────────────────────────────────────────────
  const renderCell = (row: Row, rowIdx: number, col: ColDef) => {
    const val = (row as any)[col.key];
    const baseCls =
      `w-full h-full bg-transparent px-2 py-1.5 text-xs text-white/85 outline-none focus:bg-violet-500/10 focus:ring-1 focus:ring-violet-500/40 rounded-sm ${
        col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
      }`;
    if (col.type === 'select') {
      return (
        <select
          value={val ?? ''}
          onChange={e => updateCell(rowIdx, col.key, e.target.value)}
          className={`${baseCls} cursor-pointer appearance-none`}
        >
          <option value="" className="bg-neutral-900">—</option>
          {col.options?.map(o => <option key={o} value={o} className="bg-neutral-900">{o}</option>)}
        </select>
      );
    }
    if (col.type === 'number') {
      return (
        <input
          type="number"
          value={val ?? ''}
          onChange={e => updateCell(rowIdx, col.key, e.target.value === '' ? null : Number(e.target.value))}
          className={baseCls}
        />
      );
    }
    if (col.type === 'date') {
      return (
        <input
          type="date"
          value={val ?? ''}
          onChange={e => updateCell(rowIdx, col.key, e.target.value)}
          className={baseCls}
        />
      );
    }
    return (
      <input
        type="text"
        value={val ?? ''}
        onChange={e => updateCell(rowIdx, col.key, e.target.value)}
        className={baseCls}
      />
    );
  };

  const totalWidth = useMemo(() => columns.reduce((s, c) => s + c.width, 0) + 60, [columns]); // +60 for actions col

  if (loading) {
    return (
      <div className="space-y-2 p-6">
        {[1,2,3,4,5].map(i => <div key={i} className="h-9 rounded-md bg-white/[0.03] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-black text-white">Trade Plan</h2>
          <p className="text-xs text-white/40 mt-1">
            Drag column headers to reorder · drag edges to resize · click any cell to edit · autosaved
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetLayout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/10 text-white/60 hover:bg-white/5 text-xs font-semibold">
            <RotateCcw className="h-3.5 w-3.5" /> Reset layout
          </button>
          <button onClick={addRow}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-black shadow-lg shadow-violet-500/20">
            <Plus className="h-3.5 w-3.5" /> New plan
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-auto shadow-2xl shadow-black/30">
        <div style={{ width: totalWidth, minWidth: '100%' }} className="select-none">
          {/* Header */}
          <div className="flex sticky top-0 z-10 bg-neutral-950/95 backdrop-blur border-b border-white/10">
            {columns.map((col, idx) => (
              <div
                key={col.key}
                style={{ width: col.width }}
                draggable
                onDragStart={onColDragStart(idx)}
                onDragOver={onColDragOver(idx)}
                onDrop={onColDrop(idx)}
                onDragEnd={() => { setDragCol(null); setDragOverCol(null); }}
                className={`relative flex items-center gap-1.5 px-2 py-2.5 text-[10px] font-black uppercase tracking-wider text-white/60 cursor-grab active:cursor-grabbing border-r border-white/[0.06] ${
                  dragOverCol === idx ? 'bg-violet-500/10' : ''
                }`}
              >
                <GripVertical className="h-3 w-3 text-white/20 flex-shrink-0" />
                <span className="truncate">{col.label}</span>
                {/* Resize handle */}
                <div
                  onMouseDown={(e) => startResize(idx, e)}
                  onClick={(e) => e.stopPropagation()}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize hover:bg-violet-500/60"
                />
              </div>
            ))}
            <div style={{ width: 60 }} className="px-2 py-2.5 text-[10px] font-black uppercase tracking-wider text-white/40 text-center">
              —
            </div>
          </div>

          {/* Rows */}
          {rows.map((row, rowIdx) => (
            <div
              key={row.id ?? row._tempKey ?? rowIdx}
              className="flex border-b border-white/[0.04] hover:bg-white/[0.015] group"
            >
              {columns.map(col => (
                <div
                  key={col.key}
                  style={{ width: col.width }}
                  className="border-r border-white/[0.04] flex items-stretch"
                >
                  {renderCell(row, rowIdx, col)}
                </div>
              ))}
              <div style={{ width: 60 }} className="flex items-center justify-center gap-1">
                {row._dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Saving..." />}
                <button
                  onClick={() => deleteRow(rowIdx)}
                  className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition"
                  title="Delete plan"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}

          {rows.length === 0 && (
            <div className="px-6 py-10 text-center text-xs text-white/40">
              No plans yet. Click <span className="text-violet-400 font-bold">New plan</span> to add one.
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-white/30 flex items-center gap-1.5">
        <Save className="h-3 w-3" /> Layout and edits are saved automatically to your account.
      </p>
    </div>
  );
}
