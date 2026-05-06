import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AddTradeModal from '@/components/AddTradeModal';

export type TradeRecord = {
  id: string;
  pair: string;
  side: string | null;
  result: number | null;
  trade_date: string;
  notes: string | null;
  setup: string | null;
  outcome?: string | null;
  rr?: number | null;
  session?: string | null;
  playbook_id?: string | null;
};

type Ctx = {
  openNew: () => void;
  openEdit: (t: TradeRecord) => void;
};

const TradeDialogContext = createContext<Ctx | null>(null);

const TRADES_CHANGED = 'tradenova:trades-changed';
export function emitTradesChanged() {
  window.dispatchEvent(new CustomEvent(TRADES_CHANGED));
}
export function useTradesChanged(cb: () => void) {
  useEffect(() => {
    const handler = () => cb();
    window.addEventListener(TRADES_CHANGED, handler);
    return () => window.removeEventListener(TRADES_CHANGED, handler);
  }, [cb]);
}

const NAV_EVENT = 'tradenova:navigate';
export function emitNavigate(view: string) {
  window.dispatchEvent(new CustomEvent(NAV_EVENT, { detail: view }));
}
export function useNavigationEvent(cb: (view: string) => void) {
  useEffect(() => {
    const handler = (e: Event) => cb((e as CustomEvent<string>).detail);
    window.addEventListener(NAV_EVENT, handler);
    return () => window.removeEventListener(NAV_EVENT, handler);
  }, [cb]);
}

export function TradeDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [editTrade, setEditTrade] = useState<TradeRecord | null>(null);

  const openNew = useCallback(() => { setEditTrade(null); setOpen(true); }, []);
  const openEdit = useCallback((t: TradeRecord) => { setEditTrade(t); setOpen(true); }, []);

  return (
    <TradeDialogContext.Provider value={{ openNew, openEdit }}>
      {children}
      <AddTradeModal
        open={open}
        onClose={() => setOpen(false)}
        onSaved={() => emitTradesChanged()}
        onGoToPlaybooks={() => emitNavigate('playbooks')}
        editTrade={editTrade}
      />
    </TradeDialogContext.Provider>
  );
}

export function useTradeDialog() {
  const ctx = useContext(TradeDialogContext);
  if (!ctx) throw new Error('useTradeDialog must be used within TradeDialogProvider');
  return ctx;
}
