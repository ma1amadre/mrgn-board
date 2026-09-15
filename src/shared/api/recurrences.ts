import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { ClientRef, Inserts, ProfileRef, Tables, Updates } from './types';

export type Recurrence = Tables<'task_recurrences'>;
export type RecurrenceWithRefs = Recurrence & {
  client: ClientRef | null;
  assignee: ProfileRef | null;
};

/** Два FK на profiles (assignee_id, created_by) — хинт обязателен, как у задач. */
const SELECT =
  '*, client:clients(id,name), assignee:profiles!task_recurrences_assignee_id_fkey(id,name,color)';

export async function fetchRecurrences(): Promise<RecurrenceWithRefs[]> {
  const { data, error } = await supabase.from('task_recurrences').select(SELECT).order('next_run');
  if (error) throw error;
  return data as RecurrenceWithRefs[];
}

export function useRecurrences() {
  return useQuery({ queryKey: keys.recurrences, queryFn: fetchRecurrences });
}

export async function createRecurrence(input: Inserts<'task_recurrences'>): Promise<void> {
  const { error } = await supabase.from('task_recurrences').insert(input);
  if (error) throw error;
}

export async function updateRecurrence(
  id: string,
  patch: Updates<'task_recurrences'>,
): Promise<void> {
  const { data, error } = await supabase
    .from('task_recurrences')
    .update(patch)
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertAffected(data);
}

export async function deleteRecurrence(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('task_recurrences')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertAffected(data);
}

export function useRecurrenceMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.recurrences });
  return {
    create: useMutation({ mutationFn: createRecurrence, onSettled: invalidate }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Updates<'task_recurrences'> }) =>
        updateRecurrence(id, patch),
      onSettled: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteRecurrence, onSettled: invalidate }),
  };
}
