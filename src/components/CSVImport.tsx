import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Upload, FileText, CheckCircle2, XCircle, AlertTriangle,
  Download, Trash2, RefreshCw, ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ParsedRow {
  index: number;
  raw: Record<string, string>;
  mapped: Record<string, any> | null;
  errors: string[];
  valid: boolean;
}

interface ImportResult {
  total: number;
  imported: number;
  failed: number;
  errors: { row: number; reason: string }[];
}

// ─── CSV column aliases — map common column names to DB fields ────────────────
const COLUMN_MAP: Record<string, string> = {
  // pair / symbol
  pair: 'pair', symbol: 'pair', instrument: 'pair', ticker: 'pair', market: 'pair',
  // side / direction
  side: 'side', direction: 'side', type: 'side', trade_type: 'side',
  // result / pnl
  result: 'result', pnl: 'result', profit: 'result', 'profit/loss': 'result',
  pl: 'result', net: 'result', gain: 'result',
  // date
  trade_date: 'trade_date', date: 'trade_date', 'close date': 'trade_date',
  'entry date': 'trade_date', 'open date': 'trade_date',
  // prices
  entry_price: 'entry_price', entry: 'entry_price', 'entry price': 'entry_price', open: 'entry_price',
  exit_price: 'exit_price', exit: 'exit_price', 'exit price': 'exit_price', close: 'exit_price',
  stop_loss: 'stop_loss', sl: 'stop_loss', 'stop loss': 'stop_loss', stop: 'stop_loss',
  take_profit: 'take_profit', tp: 'take_profit', 'take profit': 'take_profit', target: 'take_profit',
  // other
  setup: 'setup', strategy: 'setup', pattern: 'setup',
  notes: 'notes', note: 'notes', comment: 'notes', comments: 'notes',
  quantity: 'quantity', qty: 'quantity', size: 'quantity', lots: 'quantity',
  rr: 'rr', 'r:r': 'rr', 'risk reward': 'rr', 'risk/reward': 'rr',
  session: 'session',
  outcome: 'outcome',
};

const REQUIRED_FIELDS = ['pair', 'result', 'trade_date'];

// ─── Normalize side value ─────────────────────────────────────────────────────
function normalizeSide(val: string): string | null {
  const v = val.toLowerCase().trim();
  if (['long', 'buy', 'b', 'l'].includes(v)) return 'long';
  if (['short', 'sell', 's', 'sh'].includes(v)) return 'short';
  return null;
}

// ─── Normalize date ───────────────────────────────────────────────────────────
function normalizeDate(val: string): string | null {
  if (!val || val.trim() === '') return null;
  // Try ISO
  const iso = new Date(val);
  if (!isNaN(iso.getTime())) {
    return iso.toISOString().split('T')[0];
  }
  // Try DD/MM/YYYY
  const dmy = val.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmy) {
    const [_, d, m, y] = dmy;
    const year = y.length === 2 ? `20${y}` : y;
    const date = new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
  }
  return null;
}

// ─── Parse CSV text → rows ────────────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let cur = '', inQuote = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQuote = !inQuote; }
      else if (ch === ',' && !inQuote) { result.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseRow(lines[0]).map(h => h.toLowerCase().replace(/['"]/g, '').trim());
  const rows = lines.slice(1).map(line => {
    const vals = parseRow(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (vals[i] ?? '').replace(/^"|"$/g, '').trim(); });
    return row;
  });

  return { headers, rows };
}

// ─── Map + validate a single row ─────────────────────────────────────────────
function mapAndValidateRow(raw: Record<string, string>, index: number): ParsedRow {
  const errors: string[] = [];
  const mapped: Record<string, any> = {};

  // Map columns
  Object.entries(raw).forEach(([key, val]) => {
    const dbField = COLUMN_MAP[key.toLowerCase()];
    if (dbField && val !== '') mapped[dbField] = val;
  });

  // Validate required fields
  if (!mapped.pair || String(mapped.pair).trim() === '') {
    errors.push('Missing pair/instrument');
  } else {
    mapped.pair = String(mapped.pair).trim().toUpperCase();
  }

  if (mapped.result === undefined || mapped.result === '') {
    errors.push('Missing P&L result');
  } else {
    const num = Number(String(mapped.result).replace(/[,$\s]/g, ''));
    if (isNaN(num)) errors.push(`Invalid result: "${mapped.result}" is not a number`);
    else mapped.result = num;
  }

  if (!mapped.trade_date) {
    errors.push('Missing trade date');
  } else {
    const d = normalizeDate(String(mapped.trade_date));
    if (!d) errors.push(`Invalid date: "${mapped.trade_date}"`);
    else {
      if (new Date(d) > new Date()) errors.push('Trade date is in the future');
      else mapped.trade_date = d;
    }
  }

  // Optional: normalize side
  if (mapped.side) {
    const s = normalizeSide(String(mapped.side));
    if (!s) errors.push(`Invalid side: "${mapped.side}" (use long/short/buy/sell)`);
    else mapped.side = s;
  }

  // Optional: numeric fields
  ['entry_price', 'exit_price', 'stop_loss', 'take_profit', 'quantity', 'rr'].forEach(f => {
    if (mapped[f] !== undefined) {
      const num = Number(String(mapped[f]).replace(/[,$\s]/g, ''));
      if (isNaN(num)) errors.push(`Invalid ${f}: "${mapped[f]}"`);
      else if (num < 0 && f !== 'result') errors.push(`${f} cannot be negative`);
      else mapped[f] = num;
    }
  });

  return {
    index,
    raw,
    mapped: errors.length === 0 ? mapped : null,
    errors,
    valid: errors.length === 0,
  };
}

// ─── Template download ────────────────────────────────────────────────────────
function downloadTemplate() {
  const headers = 'pair,side,result,trade_date,setup,entry_price,exit_price,stop_loss,take_profit,quantity,rr,notes,session';
  const example = 'EURUSD,long,150.00,2024-03-15,Pullback,1.0850,1.0920,1.0800,1.0950,1,2.5,Good entry on retest,new_york';
  const blob = new Blob([`${headers}\n${example}\n`], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'tradenova_import_template.csv';
  a.click(); URL.revokeObjectURL(url);
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function CSVImport({ onImportComplete }: { onImportComplete?: () => void }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [showInvalid, setShowInvalid] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const validRows = parsedRows.filter(r => r.valid);
  const invalidRows = parsedRows.filter(r => !r.valid);

  // ── Handle file ──
  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({ title: 'Invalid file', description: 'Please upload a .csv file.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max file size is 5MB.', variant: 'destructive' });
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { rows } = parseCSV(text);
      if (rows.length === 0) {
        toast({ title: 'Empty file', description: 'No data rows found in the CSV.', variant: 'destructive' });
        return;
      }
      const parsed = rows.map((row, i) => mapAndValidateRow(row, i + 2)); // +2 for header + 1-index
      setParsedRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file);
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  // ── Import to Supabase ──
  const handleImport = async () => {
    if (!user || validRows.length === 0) return;
    setStep('importing');
    setProgress(0);

    // Create import batch record
    const { data: batch, error: batchErr } = await supabase
      .from('import_batches')
      .insert({
        user_id: user.id,
        file_name: fileName,
        status: 'processing',
        total_rows: parsedRows.length,
        imported_rows: 0,
        failed_rows: invalidRows.length,
      })
      .select()
      .single();

    if (batchErr) {
      toast({ title: 'Import failed', description: 'Could not create import batch.', variant: 'destructive' });
      setStep('preview');
      return;
    }

    // Insert in chunks of 50
    const CHUNK = 50;
    let imported = 0;
    const errors: { row: number; reason: string }[] = [];

    for (let i = 0; i < validRows.length; i += CHUNK) {
      const chunk = validRows.slice(i, i + CHUNK);
      const records = chunk.map(r => ({ ...r.mapped, user_id: user.id }));

      const { error: insertErr } = await supabase.from('trades').insert(records);

      if (insertErr) {
        chunk.forEach(r => errors.push({ row: r.index, reason: insertErr.message }));
      } else {
        imported += chunk.length;
      }

      setProgress(Math.round(((i + CHUNK) / validRows.length) * 100));
    }

    // Update batch status
    await supabase
      .from('import_batches')
      .update({
        status: errors.length === 0 ? 'completed' : 'failed',
        imported_rows: imported,
        failed_rows: invalidRows.length + errors.length,
        error_log: errors,
        updated_at: new Date().toISOString(),
      })
      .eq('id', batch.id);

    setResult({ total: parsedRows.length, imported, failed: invalidRows.length + errors.length, errors });
    setStep('done');

    if (imported > 0) {
      toast({ title: `${imported} trades imported`, description: errors.length > 0 ? `${errors.length} rows failed.` : 'All done!' });
      if (onImportComplete) onImportComplete();
    }
  };

  // ── Reset ──
  const reset = () => {
    setStep('upload'); setFileName(''); setParsedRows([]);
    setProgress(0); setResult(null); setShowInvalid(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-heading text-foreground">CSV Import</h2>
          <p className="text-muted-foreground text-sm">Import your trades from any broker or platform</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="rounded-xl gap-2">
          <Download className="h-4 w-4" /> Template
        </Button>
      </div>

      {/* ── Step: Upload ── */}
      {step === 'upload' && (
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all
                ${dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50 hover:bg-muted/30'}
              `}
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground mb-1">Drop your CSV file here</p>
              <p className="text-sm text-muted-foreground">or click to browse · max 5MB</p>
              <input ref={fileInputRef} type="file" accept=".csv" onChange={onFileChange} className="hidden" />
            </div>

            {/* Supported columns info */}
            <div className="mt-4 p-4 rounded-xl bg-muted/30 space-y-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Info className="h-3.5 w-3.5" /> Supported column names
              </div>
              <div className="flex flex-wrap gap-1.5">
                {['pair / symbol / instrument', 'side / direction', 'result / pnl / profit', 'date / trade_date', 'entry_price', 'exit_price', 'stop_loss', 'take_profit', 'rr', 'setup / strategy', 'notes', 'session'].map(c => (
                  <Badge key={c} variant="outline" className="text-[11px] font-normal rounded-full">{c}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step: Preview ── */}
      {step === 'preview' && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Rows</p>
                <p className="text-2xl font-bold font-heading text-foreground">{parsedRows.length}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Ready to Import</p>
                <p className="text-2xl font-bold font-heading text-emerald-500">{validRows.length}</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm">
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Errors</p>
                <p className="text-2xl font-bold font-heading text-red-500">{invalidRows.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Valid rows preview */}
          {validRows.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="font-heading text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Valid rows preview (first 5)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        {['Row', 'Pair', 'Side', 'Result', 'Date', 'Setup'].map(h => (
                          <th key={h} className="text-left py-2 px-3 text-muted-foreground font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validRows.slice(0, 5).map(row => (
                        <tr key={row.index} className="border-b border-border/50 last:border-0">
                          <td className="py-2 px-3 text-muted-foreground">#{row.index}</td>
                          <td className="py-2 px-3 font-medium text-foreground">{row.mapped?.pair}</td>
                          <td className="py-2 px-3">
                            {row.mapped?.side
                              ? <Badge variant="outline" className="text-[10px] rounded-full capitalize">{row.mapped.side}</Badge>
                              : <span className="text-muted-foreground">—</span>
                            }
                          </td>
                          <td className={`py-2 px-3 font-semibold ${(row.mapped?.result ?? 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                            {(row.mapped?.result ?? 0) >= 0 ? '+' : ''}${row.mapped?.result}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground">{row.mapped?.trade_date}</td>
                          <td className="py-2 px-3 text-muted-foreground">{row.mapped?.setup ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {validRows.length > 5 && (
                    <p className="text-xs text-muted-foreground mt-2 px-3">+ {validRows.length - 5} more rows</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invalid rows */}
          {invalidRows.length > 0 && (
            <Card className="border-0 shadow-sm border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <button
                  onClick={() => setShowInvalid(v => !v)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <CardTitle className="font-heading text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {invalidRows.length} rows will be skipped
                  </CardTitle>
                  {showInvalid ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>
              </CardHeader>
              <AnimatePresence>
                {showInvalid && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
                    <CardContent className="pt-0 space-y-2">
                      {invalidRows.map(row => (
                        <div key={row.index} className="text-xs rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                          <span className="font-medium text-foreground">Row #{row.index}:</span>
                          <span className="text-muted-foreground ml-1">{row.errors.join(' · ')}</span>
                        </div>
                      ))}
                    </CardContent>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={handleImport}
              disabled={validRows.length === 0}
              className="rounded-xl flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import {validRows.length} trades
            </Button>
            <Button variant="outline" onClick={reset} className="rounded-xl">
              <Trash2 className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ── Step: Importing ── */}
      {step === 'importing' && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Upload className="h-7 w-7 text-primary animate-pulse" />
            </div>
            <div>
              <p className="font-heading font-semibold text-foreground">Importing trades...</p>
              <p className="text-sm text-muted-foreground mt-1">Please don't close this window</p>
            </div>
            <div className="max-w-xs mx-auto space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground">{progress}%</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step: Done ── */}
      {step === 'done' && result && (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-10 text-center space-y-4">
            {result.imported > 0
              ? <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
              : <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            }
            <div>
              <p className="font-heading font-bold text-foreground text-xl">
                {result.imported > 0 ? 'Import Complete!' : 'Import Failed'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {result.imported} imported · {result.failed} skipped · {result.total} total
              </p>
            </div>

            {result.errors.length > 0 && (
              <div className="text-left max-w-sm mx-auto space-y-1">
                {result.errors.slice(0, 3).map((e, i) => (
                  <p key={i} className="text-xs text-red-500">Row #{e.row}: {e.reason}</p>
                ))}
              </div>
            )}

            <div className="flex gap-3 justify-center">
              <Button onClick={reset} variant="outline" className="rounded-xl gap-2">
                <RefreshCw className="h-4 w-4" /> Import Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </motion.div>
  );
}
