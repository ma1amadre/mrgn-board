import type { TaskWithRefs } from '../../shared/api/types';
import { addDays } from '../../shared/lib/dates';
import { isOverdue } from '../../shared/lib/tasks';

/** Срок «горит»: просрочен — danger, сегодня или завтра — warning, иначе null (спокойный). */
export function dueTone(
  task: Pick<TaskWithRefs, 'due_date' | 'done_at'>,
  today: string,
): 'danger' | 'warning' | null {
  if (task.due_date === null || task.done_at !== null) return null;
  if (isOverdue(task, today)) return 'danger';
  if (task.due_date <= addDays(today, 1)) return 'warning';
  return null;
}

/** Класс бейджа срока: просрочен — красный, сегодня/завтра — жёлтый, закрыт или далеко — нейтральный. */
export function dueBadgeClass(
  task: Pick<TaskWithRefs, 'due_date' | 'done_at'>,
  today: string,
): string {
  const tone = dueTone(task, today);
  return tone ? `badge badge-${tone}` : 'badge';
}
