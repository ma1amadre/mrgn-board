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
  const { update } = useTaskMutations();

  return (task) =>
    quickActions(task, { stages, tasks: allTasks, meId: me.id, today }).map((a) => ({
      key: a.key,
      label: a.label,
      onSelect: () => {
        if (a.patch.stage_id !== undefined) {
          move.mutate(
            {
              id: task.id,
              stage_id: a.patch.stage_id,
              position: a.patch.position ?? task.position,
            },
            { onError: (err) => toast.error(err) },
          );
        } else {
          update.mutate({ id: task.id, patch: a.patch }, { onError: (err) => toast.error(err) });
        }
      },
    }));
}
