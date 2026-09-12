import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { DealWithRefs, Inserts, Updates } from './types';

/** Два FK на profiles (owner_id, created_by) — хинт обязателен, как у задач. */
const DEAL_SELECT = '*, client:clients(id,name), owner:profiles!deals_owner_id_fkey(id,name,color)';

export async function fetchDeals(): Promise<DealWithRefs[]> {
  const { data, error } = await supabase.from('deals').select(DEAL_SELECT).order('created_at');
  if (error) throw error;
  return data as DealWithRefs[];
}

export function useDeals() {
  return useQuery({ queryKey: keys.deals.all, queryFn: fetchDeals });
}

export async function createDeal(input: Inserts<'deals'>): Promise<DealWithRefs> {
  const { data, error } = await supabase.from('deals').insert(input).select(DEAL_SELECT).single();
  if (error) throw error;
  return data as DealWithRefs;
}

export async function updateDeal(id: string, patch: Updates<'deals'>): Promise<void> {
  const { data, error } = await supabase.from('deals').update(patch).eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export async function deleteDeal(id: string): Promise<void> {
  const { data, error } = await supabase.from('deals').delete().eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export function useDealMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.deals.all });
  return {
    create: useMutation({ mutationFn: createDeal, onSettled: invalidate }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Updates<'deals'> }) => updateDeal(id, patch),
      onSettled: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteDeal, onSettled: invalidate }),
  };
}
