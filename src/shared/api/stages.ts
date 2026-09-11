import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { Inserts, Stage, Updates } from './types';

export async function fetchStages(): Promise<Stage[]> {
  const { data, error } = await supabase
    .from('stages')
    .select('*')
    .order('position')
    .order('created_at');
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

/** Обмен position двух стадий одним запросом — см. swap_stage_positions в 001_schema.sql. */
export async function swapStages(a: string, b: string): Promise<void> {
  const { error } = await supabase.rpc('swap_stage_positions', { p_a: a, p_b: b });
  if (error) throw error;
}

export function useStageMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: keys.stages.all });
    // Смена is_terminal пересчитывает done_at у задач (триггер в БД).
    void qc.invalidateQueries({ queryKey: keys.tasks.all });
  };
  return {
    create: useMutation({ mutationFn: createStage, onSettled: invalidate }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Updates<'stages'> }) =>
        updateStage(id, patch),
      onSettled: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteStage, onSettled: invalidate }),
    swap: useMutation({
      mutationFn: ({ a, b }: { a: string; b: string }) => swapStages(a, b),
      onSettled: invalidate,
    }),
  };
}
