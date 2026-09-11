import type { TaskWithRefs } from '../../shared/api/types';
import { addDays } from '../../shared/lib/dates';
import { isOverdue } from '../../shared/lib/tasks';

/** Класс бейджа срока: просрочен — красный, сегодня/завтра — жёлтый, закрыт или далеко — нейтральный. */
export function dueBadgeClass(
  task: Pick<TaskWithRefs, 'due_date' | 'done_at'>,
  today: string,
): string {
  if (task.due_date === null || task.done_at !== null) return 'badge';
  if (isOverdue(task, today)) return 'badge badge-danger';
  if (task.due_date <= addDays(today, 1)) return 'badge badge-warning';
  return 'badge';
}
