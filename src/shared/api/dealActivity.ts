import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { keys } from './keys';
import type { DealActivityWithActor } from './types';

const SELECT = '*, actor:profiles(id,name,color)';

/** Свежие сверху. Пишет только триггер deals_log_activity в БД. */
export async function fetchDealActivity(dealId: string): Promise<DealActivityWithActor[]> {
  const { data, error } = await supabase
    .from('deal_activity')
    .select(SELECT)
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as DealActivityWithActor[];
}

export function useDealActivity(dealId: string, enabled = true) {
  return useQuery({
    queryKey: keys.dealActivity.byDeal(dealId),
    queryFn: () => fetchDealActivity(dealId),
    enabled,
  });
}

/** Для ленты клиента: изменения по всем его сделкам разом, не больше limit записей. */
export async function fetchDealActivityForDeals(
  dealIds: string[],
  limit = 100,
): Promise<DealActivityWithActor[]> {
  if (dealIds.length === 0) return [];
  const { data, error } = await supabase
    .from('deal_activity')
    .select(SELECT)
    .in('deal_id', dealIds)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as DealActivityWithActor[];
}
