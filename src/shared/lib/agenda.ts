import { addDays } from './dates';

export type DueBucket = 'overdue' | 'today' | 'tomorrow' | 'week' | 'later' | 'none';

export const DUE_BUCKETS: DueBucket[] = ['overdue', 'today', 'tomorrow', 'week', 'later', 'none'];
export const DUE_BUCKET_LABEL: Record<DueBucket, string> = {
  overdue: 'Просрочено',
  today: 'Сегодня',
  tomorrow: 'Завтра',
  week: 'До конца недели',
  later: 'Позже',
  none: 'Без срока',
};

const WEEKDAY_SHORT = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

function dayIndex(iso: string): number {
  // Понедельник — 0: у Date воскресенье идёт нулём.
  return (new Date(`${iso}T00:00:00`).getDay() + 6) % 7;
}

export function weekdayShort(iso: string): string {
  return WEEKDAY_SHORT[dayIndex(iso)] ?? '';
}

/** Понедельник недели, в которую попадает today. */
export function startOfWeek(today: string): string {
  return addDays(today, -dayIndex(today));
}

/** Семь дней текущей недели, с понедельника. */
export function weekDays(today: string): string[] {
  const start = startOfWeek(today);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function bucketOf(due: string | null, today: string): DueBucket {
  if (due === null) return 'none';
  if (due < today) return 'overdue';
  if (due === today) return 'today';
  if (due === addDays(today, 1)) return 'tomorrow';
  if (due <= addDays(startOfWeek(today), 6)) return 'week';
  return 'later';
}

/** Задачи по корзинам срока, в каждой — по возрастанию срока, затем по названию. */
export function groupByDue<T extends { due_date: string | null; title: string }>(
  tasks: T[],
  today: string,
): Map<DueBucket, T[]> {
  const map = new Map<DueBucket, T[]>(DUE_BUCKETS.map((b) => [b, []]));
  for (const t of tasks) map.get(bucketOf(t.due_date, today))?.push(t);
  for (const [b, list] of map) {
    map.set(
      b,
      [...list].sort(
        (x, y) =>
          (x.due_date ?? '').localeCompare(y.due_date ?? '') ||
          x.title.localeCompare(y.title, 'ru'),
      ),
    );
  }
  return map;
}

export function countByDay<T extends { due_date: string | null }>(
  tasks: T[],
  days: readonly string[],
): Map<string, number> {
  const map = new Map<string, number>(days.map((d) => [d, 0]));
  for (const t of tasks) {
    if (t.due_date !== null && map.has(t.due_date)) {
      map.set(t.due_date, (map.get(t.due_date) ?? 0) + 1);
    }
  }
  return map;
}
