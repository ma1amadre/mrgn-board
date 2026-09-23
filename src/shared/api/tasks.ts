import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { Inserts, ProfileRef, Stage, TaskWithRefs, Updates } from './types';

/** Исполнители — через task_assignees (028); профиль внутри может быть null, если его удалили. */
const TASK_SELECT =
  '*, assignees:task_assignees(profile:profiles(id,name,color)), client:clients(id,name), checklist:task_checklist_items(*), attachments:task_attachments(*)';

type TaskRow = Omit<TaskWithRefs, 'assignees' | 'assignee_ids'> & {
  assignees: { profile: ProfileRef | null }[];
};

function normalize(row: TaskRow): TaskWithRefs {
  const assignees = row.assignees.map((a) => a.profile).filter((p): p is ProfileRef => p !== null);
  return { ...row, assignees, assignee_ids: assignees.map((p) => p.id) };
}

/** Архивные на доску не попадают — у них свой запрос. */
export async function fetchTasks(): Promise<TaskWithRefs[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .is('archived_at', null)
    .order('created_at');
  if (error) throw error;
  return (data as unknown as TaskRow[]).map(normalize);
}

export async function fetchArchivedTasks(): Promise<TaskWithRefs[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });
  if (error) throw error;
  return (data as unknown as TaskRow[]).map(normalize);
}

/** Исполнители задачи как множество: добавляем новых, снимаем выбывших; порядок не важен. */
export async function setAssignees(
  taskId: string,
  next: string[],
  current: string[],
): Promise<void> {
  const add = next.filter((id) => !current.includes(id));
  const remove = current.filter((id) => !next.includes(id));
  if (add.length > 0) {
    // «Взять себе» из меню идёт без текущего списка, а повтор до обновления кеша или из второй
    // вкладки не должен падать на первичном ключе — дубли молча пропускаем.
    const { error } = await supabase.from('task_assignees').upsert(
      add.map((profile_id) => ({ task_id: taskId, profile_id })),
      { onConflict: 'task_id,profile_id', ignoreDuplicates: true },
    );
    if (error) throw error;
  }
  if (remove.length > 0) {
    const { error } = await supabase
      .from('task_assignees')
      .delete()
      .eq('task_id', taskId)
      .in('profile_id', remove);
    if (error) throw error;
  }
}

/** enabled=false — не грузить, пока не понадобится (карточка задачи ищет в архиве только после промаха). */
export function useArchivedTasks(enabled = true) {
  return useQuery({ queryKey: keys.tasks.archived, queryFn: fetchArchivedTasks, enabled });
}

/** Один кеш на доску, обзор и карточку клиента; фильтры считаются на клиенте. */
export function useTasks() {
  return useQuery({ queryKey: keys.tasks.all, queryFn: fetchTasks });
}

export async function createTask(
  input: Inserts<'tasks'>,
  assigneeIds: string[] = [],
): Promise<TaskWithRefs> {
  const { data, error } = await supabase.from('tasks').insert(input).select(TASK_SELECT).single();
  if (error) throw error;
  const task = normalize(data as unknown as TaskRow);
  if (assigneeIds.length === 0) return task;
  try {
    await setAssignees(task.id, assigneeIds, []);
  } catch (e) {
    // Задача уже в базе, а исполнители — нет. Убираем её, чтобы повтор из открытой формы
    // не оставил дубль без исполнителей; если и откат не прошёл, наружу уходит исходная ошибка.
    await supabase.from('tasks').delete().eq('id', task.id);
    throw e;
  }
  return task;
}

export async function updateTask(id: string, patch: Updates<'tasks'>): Promise<void> {
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export async function deleteTask(id: string, attachmentPaths: string[] = []): Promise<void> {
  // Файлы в бакете не удаляются каскадом со строками — снимаем их до удаления задачи;
  // если хранилище не ответило, задача остаётся, чтобы не плодить сирот.
  if (attachmentPaths.length > 0) {
    const { error } = await supabase.storage.from('attachments').remove(attachmentPaths);
    if (error) throw error;
  }
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
    create: useMutation({
      mutationFn: ({ input, assigneeIds }: { input: Inserts<'tasks'>; assigneeIds?: string[] }) =>
        createTask(input, assigneeIds),
      onSettled: invalidate,
    }),
    update: useMutation({
      mutationFn: async ({
        id,
        patch,
        assignees,
      }: {
        id: string;
        patch: Updates<'tasks'>;
        /** Новый и текущий наборы исполнителей; без поля исполнители не трогаются. */
        assignees?: { next: string[]; current: string[] };
      }) => {
        if (Object.keys(patch).length > 0) await updateTask(id, patch);
        if (assignees) await setAssignees(id, assignees.next, assignees.current);
      },
      onSettled: invalidate,
    }),
    assign: useMutation({
      mutationFn: ({ id, profileId }: { id: string; profileId: string }) =>
        setAssignees(id, [profileId], []),
      onSettled: invalidate,
    }),
    unassign: useMutation({
      mutationFn: ({ id, profileId }: { id: string; profileId: string }) =>
        setAssignees(id, [], [profileId]),
      onSettled: invalidate,
    }),
    remove: useMutation({
      mutationFn: ({ id, attachmentPaths }: { id: string; attachmentPaths?: string[] }) =>
        deleteTask(id, attachmentPaths),
      onSettled: invalidate,
    }),
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
