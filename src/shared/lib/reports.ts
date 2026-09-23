import { addDays } from './dates';
import { startOfWeek } from './agenda';
import { plural } from './text';

export type WeekBucket = { start: string; end: string; label: string };

/** Последние n недель включая текущую, от старой к новой; label — «14 сен» (понедельник). */
export function weekBuckets(today: string, n: number): WeekBucket[] {
  const thisMonday = startOfWeek(today);
  return Array.from({ length: n }, (_, i) => {
    const start = addDays(thisMonday, -7 * (n - 1 - i));
    return { start, end: addDays(start, 6), label: start.slice(5).split('-').reverse().join('.') };
  });
}

/** Сколько элементов попало в каждую неделю по дате (ISO-строка, берутся первые 10 символов). */
export function countByWeek<T>(
  items: readonly T[],
  dateOf: (t: T) => string | null,
  buckets: readonly WeekBucket[],
): number[] {
  const counts = buckets.map(() => 0);
  for (const item of items) {
    const d = dateOf(item)?.slice(0, 10);
    if (!d) continue;
    const i = buckets.findIndex((b) => d >= b.start && d <= b.end);
    if (i >= 0) counts[i] = (counts[i] ?? 0) + 1;
  }
  return counts;
}

/** Среднее число дней между парами дат; пустой список — null. Пара, где конец раньше начала
 *  (импорт, правка руками), считается нулём: отрицательный «средний срок» читателю ни о чём. */
export function avgDays(pairs: ReadonlyArray<{ from: string; to: string }>): number | null {
  if (pairs.length === 0) return null;
  const total = pairs.reduce(
    (s, p) => s + Math.max(0, new Date(p.to).getTime() - new Date(p.from).getTime()) / 86_400_000,
    0,
  );
  return Math.round((total / pairs.length) * 10) / 10;
}

/** Конверсия воронки: доля выигранных среди закрытых сделок; нет закрытых — null. */
export function dealConversion(deals: ReadonlyArray<{ stage: string }>): {
  won: number;
  lost: number;
  rate: number | null;
} {
  const won = deals.filter((d) => d.stage === 'won').length;
  const lost = deals.filter((d) => d.stage === 'lost').length;
  return { won, lost, rate: won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null };
}

/** Причины проигрыша по числу сделок; сравнение без регистра и пробелов, показывается первое написание. */
export function lostReasons(
  deals: ReadonlyArray<{ stage: string; lost_reason: string | null }>,
  none = 'не указана',
): Array<{ label: string; value: number }> {
  const map = new Map<string, { label: string; value: number }>();
  for (const d of deals) {
    if (d.stage !== 'lost') continue;
    const raw = d.lost_reason?.trim() || none;
    const key = raw.toLowerCase();
    const row = map.get(key) ?? { label: raw, value: 0 };
    row.value += 1;
    map.set(key, row);
  }
  return [...map.values()].sort(
    (a, b) => b.value - a.value || a.label.localeCompare(b.label, 'ru'),
  );
}

/** «3 дня», «1,5 дня» — для среднего срока; дробное число всегда «дня». */
export function formatDays(days: number | null): string {
  if (days === null) return '—';
  if (!Number.isInteger(days)) return `${String(days).replace('.', ',')} дня`;
  return `${days} ${plural(days, ['день', 'дня', 'дней'])}`;
}
