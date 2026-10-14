import type { Tables, TablesInsert, Json } from '@/integrations/supabase/types';

export type TradeRow = Tables<'trades'>;
export type TradeInput = TablesInsert<'trades'>;
export type TradeFields = Partial<TradeRow>;
export type ProfileRow = Tables<'profiles'>;
export type JsonObject = { [key: string]: Json | undefined };

/** Preserve provider error messages without assuming every thrown value is an Error. */
export function errorMessage(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return undefined;
}
