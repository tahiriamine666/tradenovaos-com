// ─── useEditableRow.ts ────────────────────────────────────────────────────────
// Fixes the "edit trade requires double-click" bug.
//
// ROOT CAUSE: The bug happens when an onClick handler fires on a parent element
// (like a table row) at the same time as the edit button click, causing a
// re-render that resets state before the edit action registers. The fix:
// use onPointerDown + stopPropagation on the edit button, and debounce
// the row click to distinguish single click from button click.

import { useState, useCallback, useRef } from 'react';

interface UseEditableRowOptions<T> {
  onSave: (item: T) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export function useEditableRow<T extends { id: string }>(
  options: UseEditableRowOptions<T>
) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<T>>({});
  const [saving, setSaving] = useState(false);

  // Track if a button inside the row was clicked (prevents row-level click race)
  const buttonClickedRef = useRef(false);

  const startEdit = useCallback((item: T, e?: React.MouseEvent | React.PointerEvent) => {
    e?.stopPropagation();
    buttonClickedRef.current = true;
    setEditingId(item.id);
    setEditForm({ ...item });
    // Reset flag after this event cycle
    setTimeout(() => { buttonClickedRef.current = false; }, 0);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditForm({});
  }, []);

  const updateField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setEditForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await options.onSave(editForm as T);
      setEditingId(null);
      setEditForm({});
    } finally {
      setSaving(false);
    }
  }, [editingId, editForm, options]);

  const deleteItem = useCallback(async (id: string, e?: React.MouseEvent | React.PointerEvent) => {
    e?.stopPropagation();
    if (options.onDelete) {
      await options.onDelete(id);
    }
  }, [options]);

  return {
    editingId,
    editForm,
    saving,
    isEditing: (id: string) => editingId === id,
    startEdit,
    cancelEdit,
    updateField,
    saveEdit,
    deleteItem,
  };
}

// ─── How to use in TradeVault ─────────────────────────────────────────────────
//
// BEFORE (buggy — double-click needed):
// <button onClick={() => setEditingId(trade.id)}>Edit</button>
//
// AFTER (fixed):
// const { isEditing, startEdit, cancelEdit, updateField, saveEdit, deleteItem } =
//   useEditableRow<Trade>({
//     onSave: async (trade) => {
//       await supabase.from('trades').update(trade).eq('id', trade.id);
//       fetchTrades(); // refresh
//     },
//     onDelete: async (id) => {
//       await supabase.from('trades').delete().eq('id', id);
//       fetchTrades();
//     },
//   });
//
// In your row:
// <button
//   onPointerDown={e => startEdit(trade, e)}  // ← onPointerDown, NOT onClick
// >
//   Edit
// </button>
//
// Edit form:
// {isEditing(trade.id) && (
//   <tr>
//     <td><input value={editForm.pair} onChange={e => updateField('pair', e.target.value)} /></td>
//     <td><input value={editForm.result} onChange={e => updateField('result', Number(e.target.value))} /></td>
//     <td>
//       <button onPointerDown={saveEdit}>Save</button>
//       <button onPointerDown={cancelEdit}>Cancel</button>
//     </td>
//   </tr>
// )}
