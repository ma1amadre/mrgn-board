import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { Inserts, Tables } from './types';

export type TaskTemplate = Tables<'task_templates'>;

export async function fetchTemplates(): Promise<TaskTemplate[]> {
  const { data, error } = await supabase.from('task_templates').select('*').order('name');
  if (error) throw error;
  return data;
}

export function useTemplates() {
  return useQuery({ queryKey: keys.templates, queryFn: fetchTemplates, staleTime: 60_000 });
}

export async function createTemplate(input: Inserts<'task_templates'>): Promise<void> {
  const { error } = await supabase.from('task_templates').insert(input);
  if (error) throw error;
}

export async function deleteTemplate(id: string): Promise<void> {
  const { data, error } = await supabase.from('task_templates').delete().eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export function useTemplateMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.templates });
  return {
    create: useMutation({ mutationFn: createTemplate, onSettled: invalidate }),
    remove: useMutation({ mutationFn: deleteTemplate, onSettled: invalidate }),
  };
}
