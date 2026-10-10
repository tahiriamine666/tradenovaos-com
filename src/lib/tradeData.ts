import { supabase } from '@/integrations/supabase/client';
import { collectPages } from './pagination';

export function loadTrades(userId: string, options: { accountId?: string | null; from?: string; to?: string; ascending?: boolean } = {}) {
  return collectPages((offset, size) => {
    let query = supabase.from('trades').select('*').eq('user_id', userId);
    if (options.accountId) query = query.eq('trading_account_id', options.accountId);
    if (options.from) query = query.gte('trade_date', options.from);
    if (options.to) query = query.lte('trade_date', options.to);
    return query.order('trade_date', { ascending: options.ascending ?? false }).order('id').range(offset, offset + size - 1);
  });
}
