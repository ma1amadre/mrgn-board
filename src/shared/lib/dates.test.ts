import { describe, expect, it } from 'vitest';
import { addDays, formatAgo, formatDate, formatRelative, toIsoDate } from './dates';

describe('даты', () => {
  it('addDays через границу месяца и года', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('formatDate без года в текущем году и с годом в чужом', () => {
    const now = new Date('2026-09-16T12:00:00');
    expect(formatDate('2026-09-12', now)).toBe('12 сен');
    expect(formatDate('2025-12-31', now)).toBe('31 дек 2025');
  });
  it('toIsoDate — локальная дата без сдвига через UTC', () => {
    expect(toIsoDate(new Date(2026, 8, 16, 23, 59))).toBe('2026-09-16');
  });
});

describe('formatAgo', () => {
  it('дни словами, недели округлением вниз, дальше дата', () => {
    expect(formatAgo('2026-09-16T09:00:00', '2026-09-16')).toBe('сегодня');
    expect(formatAgo('2026-09-15T23:00:00', '2026-09-16')).toBe('вчера');
    expect(formatAgo('2026-09-11T09:00:00', '2026-09-16')).toBe('5 дн. назад');
    expect(formatAgo('2026-08-30T09:00:00', '2026-09-16')).toBe('2 нед. назад');
    expect(formatAgo('2026-07-01T09:00:00', '2026-09-16')).toBe('1 июл');
    expect(formatAgo('2026-09-17T09:00:00', '2026-09-16')).toBe('сегодня');
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-09-16T12:00:00');
  it('минуты и часы словами, старше суток — дата', () => {
    expect(formatRelative('2026-09-16T11:59:40', now)).toBe('только что');
    expect(formatRelative('2026-09-16T11:55:00', now)).toBe('5 мин назад');
    expect(formatRelative('2026-09-16T09:00:00', now)).toBe('3 ч назад');
    expect(formatRelative('2026-09-14T09:00:00', now)).toBe('14 сен, 09:00');
  });
  it('время из будущего не даёт отрицательных минут', () => {
    expect(formatRelative('2026-09-16T12:05:00', now)).toBe('только что');
  });
});
