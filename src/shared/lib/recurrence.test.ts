import { describe, expect, it } from 'vitest';
import { describeRecurrence, nextRun } from './recurrence';

// 16.09.2026 — среда.
describe('nextRun', () => {
  it('неделя: ближайший день недели строго после from', () => {
    expect(nextRun('week', 3, '2026-09-16')).toBe('2026-09-23'); // та же среда → через неделю
    expect(nextRun('week', 5, '2026-09-16')).toBe('2026-09-18'); // пятница на этой неделе
    expect(nextRun('week', 1, '2026-09-16')).toBe('2026-09-21'); // понедельник следующей
    expect(nextRun('week', 7, '2026-09-20')).toBe('2026-09-27'); // с воскресенья на воскресенье
  });
  it('месяц: это число в текущем месяце, если ещё впереди, иначе в следующем', () => {
    expect(nextRun('month', 20, '2026-09-16')).toBe('2026-09-20');
    expect(nextRun('month', 16, '2026-09-16')).toBe('2026-10-16');
    expect(nextRun('month', 5, '2026-12-31')).toBe('2027-01-05');
    expect(nextRun('month', 28, '2026-02-10')).toBe('2026-02-28');
  });
});

describe('describeRecurrence', () => {
  it('человеческие подписи', () => {
    expect(describeRecurrence('week', 1)).toBe('каждый понедельник');
    expect(describeRecurrence('month', 5)).toBe('5-го числа каждого месяца');
  });
});
