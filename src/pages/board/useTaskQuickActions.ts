import { useProfile } from '../../app/auth/authContext';
import { useMoveTask, useTaskMutations } from '../../shared/api/tasks';
import type { Stage, TaskWithRefs } from '../../shared/api/types';
import { quickActions } from '../../shared/lib/quickActions';
import type { MenuItem } from '../../shared/ui/Menu';
import { useToast } from '../../shared/ui/toastContext';

/** Пункты меню «⋯» для карточки: перенос стадии идёт через useMoveTask (оптимистично), остальное — patch. */
export function useTaskQuickActions(
  stages: Stage[],
  allTasks: TaskWithRefs[],
  today: string,
): (task: TaskWithRefs) => MenuItem[] {
  const me = useProfile();
  const toast = useToast();
  const move = useMoveTask();
  const { update, assign, unassign } = useTaskMutations();

  return (task) =>
    quickActions(task, { stages, tasks: allTasks, meId: me.id, today }).map((a) => ({
      key: a.key,
      label: a.label,
      onSelect: () => {
        const onError = (err: unknown) => toast.error(err);
        if (a.patch.stage_id !== undefined) {
          move.mutate(
            {
              id: task.id,
              stage_id: a.patch.stage_id,
              position: a.patch.position ?? task.position,
            },
            { onError },
          );
        } else if (a.patch.assign !== undefined) {
          assign.mutate({ id: task.id, profileId: a.patch.assign }, { onError });
        } else if (a.patch.unassign !== undefined) {
          unassign.mutate({ id: task.id, profileId: a.patch.unassign }, { onError });
        } else {
          update.mutate({ id: task.id, patch: { due_date: a.patch.due_date } }, { onError });
        }
      },
    }));
}
