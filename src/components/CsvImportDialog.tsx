import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

type ParsedRow = {
  pair: string;
  side: string;
  result: string;
  trade_date: string;
  notes: string;
  setup: string;
};

type ValidatedRow = ParsedRow & { valid: boolean; errors: string[] };

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values = line.split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

function validateRow(row: Record<string, string>): ValidatedRow {
  const errors: string[] = [];
  const pair = row.pair || '';
  const side = (row.side || '').toLowerCase();
  const result = row.result || '';
  const trade_date = row.trade_date || '';
  const notes = row.notes || '';
  const setup = row.setup || '';

  if (!pair) errors.push('Missing pair');
  if (!['long', 'short'].includes(side)) errors.push('Side must be long/short');
  if (!result || isNaN(Number(result))) errors.push('Result must be numeric');
  if (!trade_date || isNaN(Date.parse(trade_date))) errors.push('Invalid date');

  return { pair, side, result, trade_date, notes, setup, valid: errors.length === 0, errors };
}

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  onImportComplete: () => void;
}

export default function CsvImportDialog({ open, onOpenChange, userId, onImportComplete }: CsvImportDialogProps) {
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setRows([]); setFileName(''); };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = parseCSV(text);
      setRows(parsed.map(validateRow));
    };
    reader.readAsText(file);
    if (fileRef.current) fileRef.current.value = '';
  };

  const validRows = rows.filter(r => r.valid);
  const invalidRows = rows.filter(r => !r.valid);

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    const payload = validRows.map(r => ({
      pair: r.pair.trim(),
      side: r.side.toLowerCase(),
      result: parseFloat(r.result),
      trade_date: r.trade_date,
      notes: r.notes || null,
      setup: r.setup || null,
      user_id: userId,
    }));

    const { error } = await supabase.from('trades').insert(payload);
    setImporting(false);
    if (error) {
      toast.error('Failed to import trades');
      return;
    }
    toast.success(`Imported ${validRows.length} trade${validRows.length > 1 ? 's' : ''} successfully`);
    reset();
    onOpenChange(false);
    onImportComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Import Trades from CSV</DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="rounded-full bg-muted p-4">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-medium text-foreground">Upload a CSV file</p>
              <p className="text-xs text-muted-foreground">Required columns: pair, side, result, trade_date</p>
              <p className="text-xs text-muted-foreground">Optional: notes, setup</p>
            </div>
            <Button variant="outline" className="rounded-xl" onClick={() => fileRef.current?.click()}>
              <FileText className="h-4 w-4 mr-1" /> Select CSV File
            </Button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                File: <span className="font-medium text-foreground">{fileName}</span>
              </p>
              <div className="flex gap-2">
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> {validRows.length} valid
                </Badge>
                {invalidRows.length > 0 && (
                  <Badge variant="outline" className="text-red-500 border-red-500/30">
                    <AlertCircle className="h-3 w-3 mr-1" /> {invalidRows.length} invalid
                  </Badge>
                )}
              </div>
            </div>

            <div className="border rounded-lg overflow-auto max-h-[40vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">#</TableHead>
                    <TableHead>Pair</TableHead>
                    <TableHead>Side</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Setup</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={i} className={!row.valid ? 'bg-destructive/5' : ''}>
                      <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-sm font-medium">{row.pair || '—'}</TableCell>
                      <TableCell className="text-sm">{row.side || '—'}</TableCell>
                      <TableCell className="text-sm">{row.result || '—'}</TableCell>
                      <TableCell className="text-sm">{row.trade_date || '—'}</TableCell>
                      <TableCell className="text-sm">{row.setup || '—'}</TableCell>
                      <TableCell>
                        {row.valid ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : (
                          <span className="text-xs text-red-500">{row.errors.join(', ')}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" className="rounded-xl" onClick={reset}>Cancel</Button>
              <Button className="rounded-xl" onClick={handleImport} disabled={validRows.length === 0 || importing}>
                {importing ? 'Importing...' : `Import ${validRows.length} Trade${validRows.length > 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
