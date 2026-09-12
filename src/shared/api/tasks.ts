import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { Inserts, Stage, TaskWithRefs, Updates } from './types';

/** Два FK на profiles (assignee_id, created_by) — без хинта PostgREST не знает, какой брать. */
const TASK_SELECT =
  '*, assignee:profiles!tasks_assignee_id_fkey(id,name,color), client:clients(id,name), checklist:task_checklist_items(*), attachments:task_attachments(*)';

export async function fetchTasks(): Promise<TaskWithRefs[]> {
  const { data, error } = await supabase.from('tasks').select(TASK_SELECT).order('created_at');
  if (error) throw error;
  return data as TaskWithRefs[];
}

/** Один кеш на доску, обзор и карточку клиента; фильтры считаются на клиенте. */
export function useTasks() {
  return useQuery({ queryKey: keys.tasks.all, queryFn: fetchTasks });
}

export async function createTask(input: Inserts<'tasks'>): Promise<TaskWithRefs> {
  const { data, error } = await supabase.from('tasks').insert(input).select(TASK_SELECT).single();
  if (error) throw error;
  return data as TaskWithRefs;
}

export async function updateTask(id: string, patch: Updates<'tasks'>): Promise<void> {
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export async function deleteTask(id: string): Promise<void> {
  const { data, error } = await supabase.from('tasks').delete().eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export async function renumberStage(stageId: string): Promise<void> {
  const { error } = await supabase.rpc('renumber_stage', { p_stage_id: stageId });
  if (error) throw error;
}

export function useTaskMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.tasks.all });
  return {
    create: useMutation({ mutationFn: createTask, onSettled: invalidate }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Updates<'tasks'> }) => updateTask(id, patch),
      onSettled: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteTask, onSettled: invalidate }),
  };
}

export type MoveInput = { id: string; stage_id: string; position: number };

/** Перенос карточки: оптимистично двигаем в кеше, при ошибке откатываем.
 *  done_at выставляет триггер в БД; здесь дублируем по is_terminal, чтобы обзор не мигал. */
export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MoveInput) => {
      await updateTask(input.id, { stage_id: input.stage_id, position: input.position });
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: keys.tasks.all });
      const previous = qc.getQueryData<TaskWithRefs[]>(keys.tasks.all);
      const stages = qc.getQueryData<Stage[]>(keys.stages.all) ?? [];
      const terminal = stages.find((s) => s.id === input.stage_id)?.is_terminal ?? false;
      qc.setQueryData<TaskWithRefs[]>(keys.tasks.all, (tasks) =>
        tasks?.map((t) =>
          t.id === input.id
            ? {
                ...t,
                stage_id: input.stage_id,
                position: input.position,
                done_at: terminal ? (t.done_at ?? new Date().toISOString()) : null,
              }
            : t,
        ),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) qc.setQueryData(keys.tasks.all, context.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.tasks.all }),
  });
}
