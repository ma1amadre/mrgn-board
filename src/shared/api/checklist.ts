import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { Inserts, TaskWithRefs } from './types';

/** Пункты лежат внутри задачи в кеше ['tasks'] (embed в TASK_SELECT) — отдельного запроса нет. */
export async function addChecklistItem(input: Inserts<'task_checklist_items'>): Promise<void> {
  const { error } = await supabase.from('task_checklist_items').insert(input);
  if (error) throw error;
}

export async function setChecklistItemDone(id: string, isDone: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .update({ is_done: isDone })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertAffected(data);
}

export async function deleteChecklistItem(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('task_checklist_items')
    .delete()
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertAffected(data);
}

export function useChecklistMutations(taskId: string) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.tasks.all });

  // Галочка должна откликаться сразу: меняем кеш задач, при ошибке возвращаем как было.
  const toggle = useMutation({
    mutationFn: ({ id, isDone }: { id: string; isDone: boolean }) =>
      setChecklistItemDone(id, isDone),
    onMutate: async ({ id, isDone }) => {
      await qc.cancelQueries({ queryKey: keys.tasks.all });
      const previous = qc.getQueryData<TaskWithRefs[]>(keys.tasks.all);
      qc.setQueryData<TaskWithRefs[]>(keys.tasks.all, (tasks) =>
        tasks?.map((t) =>
          t.id === taskId
            ? {
                ...t,
                checklist: t.checklist.map((i) => (i.id === id ? { ...i, is_done: isDone } : i)),
              }
            : t,
        ),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) qc.setQueryData(keys.tasks.all, context.previous);
    },
    onSettled: invalidate,
  });

  return {
    add: useMutation({ mutationFn: addChecklistItem, onSettled: invalidate }),
    toggle,
    remove: useMutation({ mutationFn: deleteChecklistItem, onSettled: invalidate }),
  };
}
