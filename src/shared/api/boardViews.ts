import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { Tables } from './types';

export type BoardView = Tables<'board_views'>;

/** Только свои — RLS. */
export async function fetchBoardViews(): Promise<BoardView[]> {
  const { data, error } = await supabase.from('board_views').select('*').order('created_at');
  if (error) throw error;
  return data;
}

export function useBoardViews() {
  return useQuery({ queryKey: keys.boardViews, queryFn: fetchBoardViews, staleTime: 5 * 60_000 });
}

export async function createBoardView(input: {
  profile_id: string;
  name: string;
  query: string;
}): Promise<void> {
  const { error } = await supabase.from('board_views').insert(input);
  if (error) throw error;
}

export async function deleteBoardView(id: string): Promise<void> {
  const { data, error } = await supabase.from('board_views').delete().eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export function useBoardViewMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.boardViews });
  return {
    create: useMutation({ mutationFn: createBoardView, onSettled: invalidate }),
    remove: useMutation({ mutationFn: deleteBoardView, onSettled: invalidate }),
  };
}
