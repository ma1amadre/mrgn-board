import { describe, expect, it } from 'vitest';
import { bucketOf, countByDay, groupByDue, startOfWeek, weekDays, weekdayShort } from './agenda';

// 16.09.2026 — среда; неделя 14–20.
const TODAY = '2026-09-16';

describe('неделя', () => {
  it('понедельник недели и семь дней с него', () => {
    expect(startOfWeek(TODAY)).toBe('2026-09-14');
    expect(startOfWeek('2026-09-20')).toBe('2026-09-14');
    expect(startOfWeek('2026-09-14')).toBe('2026-09-14');
    expect(weekDays(TODAY)).toEqual([
      '2026-09-14',
      '2026-09-15',
      '2026-09-16',
      '2026-09-17',
      '2026-09-18',
      '2026-09-19',
      '2026-09-20',
    ]);
  });
  it('короткие имена дней', () => {
    expect(weekDays(TODAY).map(weekdayShort)).toEqual(['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']);
  });
});

describe('bucketOf', () => {
  it('раскладывает по корзинам относительно сегодня', () => {
    expect(bucketOf(null, TODAY)).toBe('none');
    expect(bucketOf('2026-09-15', TODAY)).toBe('overdue');
    expect(bucketOf('2026-09-16', TODAY)).toBe('today');
    expect(bucketOf('2026-09-17', TODAY)).toBe('tomorrow');
    expect(bucketOf('2026-09-20', TODAY)).toBe('week');
    expect(bucketOf('2026-09-21', TODAY)).toBe('later');
  });
  it('в воскресенье «завтра» важнее конца недели', () => {
    expect(bucketOf('2026-09-21', '2026-09-20')).toBe('tomorrow');
  });
});

describe('groupByDue / countByDay', () => {
  const tasks = [
    { id: '1', title: 'Б', due_date: '2026-09-16' },
    { id: '2', title: 'А', due_date: '2026-09-16' },
    { id: '3', title: 'В', due_date: null },
    { id: '4', title: 'Г', due_date: '2026-09-01' },
  ];
  it('внутри корзины — по сроку, потом по названию', () => {
    const g = groupByDue(tasks, TODAY);
    expect(g.get('today')?.map((t) => t.id)).toEqual(['2', '1']);
    expect(g.get('overdue')?.map((t) => t.id)).toEqual(['4']);
    expect(g.get('none')?.map((t) => t.id)).toEqual(['3']);
    expect(g.get('later')).toEqual([]);
  });
  it('счёт по дням недели, чужие даты не считаются', () => {
    const c = countByDay(tasks, weekDays(TODAY));
    expect(c.get('2026-09-16')).toBe(2);
    expect(c.get('2026-09-14')).toBe(0);
    expect(c.has('2026-09-01')).toBe(false);
  });
});
