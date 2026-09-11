import { addDays } from './dates';

export type TaskLike = {
  id: string;
  stage_id: string;
  assignee_id: string | null;
  due_date: string | null;
  done_at: string | null;
  position: number;
  created_at: string;
};

export function isOpen(t: Pick<TaskLike, 'done_at'>): boolean {
  return t.done_at === null;
}

/** Просрочена: срок раньше сегодняшней локальной даты и задача не закрыта. */
export function isOverdue(t: Pick<TaskLike, 'due_date' | 'done_at'>, today: string): boolean {
  return t.done_at === null && t.due_date !== null && t.due_date < today;
}

/** Порядок внутри колонки: по position, при равенстве — по времени создания. */
export function sortByPosition<T extends Pick<TaskLike, 'position' | 'created_at'>>(
  tasks: T[],
): T[] {
  return [...tasks].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  );
}

/** Задачи по стадиям, каждая колонка отсортирована. Стадии без задач получают пустой массив. */
export function groupByStage<T extends TaskLike>(tasks: T[], stageIds: string[]): Map<string, T[]> {
  const map = new Map<string, T[]>(stageIds.map((id) => [id, []]));
  for (const t of tasks) {
    const bucket = map.get(t.stage_id);
    if (bucket) bucket.push(t);
  }
  for (const [id, bucket] of map) map.set(id, sortByPosition(bucket));
  return map;
}

export type Workload = { profileId: string | null; open: number; overdue: number };

/**
 * Нагрузка по исполнителям: открытые и просроченные. profileId null — без исполнителя.
 * `profileIds` — кого показывать всегда (даже с нулём); исполнители вне списка (например,
 * деактивированные) появляются, только если у них есть открытые задачи.
 */
export function workloadByAssignee<T extends TaskLike>(
  tasks: T[],
  profileIds: string[],
  today: string,
): Workload[] {
  const rows = new Map<string | null, Workload>();
  for (const id of profileIds) rows.set(id, { profileId: id, open: 0, overdue: 0 });
  rows.set(null, { profileId: null, open: 0, overdue: 0 });
  for (const t of tasks) {
    if (!isOpen(t)) continue;
    let row = rows.get(t.assignee_id);
    if (!row) {
      row = { profileId: t.assignee_id, open: 0, overdue: 0 };
      rows.set(t.assignee_id, row);
    }
    row.open += 1;
    if (isOverdue(t, today)) row.overdue += 1;
  }
  return [...rows.values()].filter((r) => r.profileId !== null || r.open > 0);
}

/** Открытые задачи со сроком до today+days включительно (просроченные тоже), ближайшие первыми. */
export function upcomingDeadlines<T extends TaskLike>(tasks: T[], today: string, days = 7): T[] {
  const limit = addDays(today, days);
  return tasks
    .filter((t) => isOpen(t) && t.due_date !== null && t.due_date <= limit)
    .sort((a, b) => (a.due_date as string).localeCompare(b.due_date as string));
}

export function countByStage<T extends Pick<TaskLike, 'stage_id'>>(
  tasks: T[],
): Map<string, number> {
  const map = new Map<string, number>();
  for (const t of tasks) map.set(t.stage_id, (map.get(t.stage_id) ?? 0) + 1);
  return map;
}
