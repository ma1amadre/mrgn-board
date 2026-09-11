import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { Inserts, Stage, Updates } from './types';

export async function fetchStages(): Promise<Stage[]> {
  const { data, error } = await supabase.from('stages').select('*').order('position');
  if (error) throw error;
  return data;
}

export function useStages() {
  return useQuery({ queryKey: keys.stages.all, queryFn: fetchStages, staleTime: 5 * 60_000 });
}

export async function createStage(input: Inserts<'stages'>): Promise<Stage> {
  const { data, error } = await supabase.from('stages').insert(input).select('*').single();
  if (error) throw error;
  return data;
}

export async function updateStage(id: string, patch: Updates<'stages'>): Promise<void> {
  const { data, error } = await supabase.from('stages').update(patch).eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export async function deleteStage(id: string): Promise<void> {
  const { data, error } = await supabase.from('stages').delete().eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export function useStageMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.stages.all });
  return {
    create: useMutation({ mutationFn: createStage, onSettled: invalidate }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Updates<'stages'> }) =>
        updateStage(id, patch),
      onSettled: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteStage, onSettled: invalidate }),
  };
}
