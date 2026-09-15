import { describe, expect, it } from 'vitest';
import {
  avgDays,
  countByWeek,
  dealConversion,
  formatDays,
  lostReasons,
  weekBuckets,
} from './reports';

// 16.09.2026 — среда; неделя 14–20.
describe('weekBuckets', () => {
  it('последние недели с понедельника, текущая последней', () => {
    const b = weekBuckets('2026-09-16', 3);
    expect(b.map((x) => x.start)).toEqual(['2026-08-31', '2026-09-07', '2026-09-14']);
    expect(b[2]).toEqual({ start: '2026-09-14', end: '2026-09-20', label: '14.09' });
  });
});

describe('countByWeek', () => {
  it('считает по неделям, чужие даты и null не считает', () => {
    const b = weekBuckets('2026-09-16', 2);
    const items = [
      { d: '2026-09-08T10:00:00Z' },
      { d: '2026-09-15' },
      { d: '2026-09-20' },
      { d: '2026-01-01' },
      { d: null },
    ];
    expect(countByWeek(items, (i) => i.d, b)).toEqual([1, 2]);
  });
});

describe('lostReasons', () => {
  it('считает только проигранные, склеивает регистр, пустую причину подписывает', () => {
    const rows = lostReasons([
      { stage: 'lost', lost_reason: 'Дорого' },
      { stage: 'lost', lost_reason: 'дорого ' },
      { stage: 'lost', lost_reason: null },
      { stage: 'won', lost_reason: 'Дорого' },
    ]);
    expect(rows).toEqual([
      { label: 'Дорого', value: 2 },
      { label: 'не указана', value: 1 },
    ]);
  });
});

describe('avgDays / dealConversion / formatDays', () => {
  it('среднее в днях с одним знаком', () => {
    expect(
      avgDays([
        { from: '2026-09-01T00:00:00Z', to: '2026-09-03T00:00:00Z' },
        { from: '2026-09-01T00:00:00Z', to: '2026-09-02T12:00:00Z' },
      ]),
    ).toBe(1.8);
    expect(avgDays([])).toBeNull();
  });
  it('конверсия только по закрытым', () => {
    expect(dealConversion([{ stage: 'won' }, { stage: 'lost' }, { stage: 'new' }])).toEqual({
      won: 1,
      lost: 1,
      rate: 50,
    });
    expect(dealConversion([{ stage: 'new' }]).rate).toBeNull();
  });
  it('склонение дней', () => {
    expect(formatDays(1)).toBe('1 день');
    expect(formatDays(3)).toBe('3 дня');
    expect(formatDays(12)).toBe('12 дней');
    expect(formatDays(1.5)).toBe('1,5 дня');
    expect(formatDays(null)).toBe('—');
  });
});
