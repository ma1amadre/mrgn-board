import { addDays } from './dates';

export type RecurrencePeriod = 'week' | 'month';

export const WEEKDAY_LABEL = [
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
  'воскресенье',
];

/** Понедельник — 1, воскресенье — 7 (как isodow в Postgres). */
function isoWeekday(iso: string): number {
  const d = new Date(`${iso}T00:00:00`).getDay();
  return d === 0 ? 7 : d;
}

/**
 * Следующая дата строго после from — та же логика, что recurrence_next() в БД: клиент считает
 * первый запуск при создании правила, дальше даты двигает база.
 */
export function nextRun(period: RecurrencePeriod, runDay: number, from: string): string {
  if (period === 'week') {
    // Тот же день недели — через неделю, не сегодня: сдвиг 1..7.
    return addDays(from, ((runDay - isoWeekday(from) + 6) % 7) + 1);
  }
  const [y, m, d] = from.split('-').map(Number) as [number, number, number];
  const day = String(runDay).padStart(2, '0');
  if (d < runDay) return `${y}-${String(m).padStart(2, '0')}-${day}`;
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, '0')}-${day}`;
}

/** «каждый понедельник», «5-го числа каждого месяца» — для списка правил. */
export function describeRecurrence(period: RecurrencePeriod, runDay: number): string {
  if (period === 'week') return `каждый ${WEEKDAY_LABEL[runDay - 1] ?? '?'}`;
  return `${runDay}-го числа каждого месяца`;
}
