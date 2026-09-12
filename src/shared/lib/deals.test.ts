import { describe, expect, it } from 'vitest';
import {
  dealQuickActions,
  formatMoney,
  funnel,
  isDealOverdue,
  nextDealStage,
  parseAmount,
  sortDeals,
} from './deals';
import type { DealStage } from './labels';

function deal(over: Partial<Parameters<typeof sortDeals>[0][number]> & { id: string }) {
  return {
    stage: 'new' as DealStage,
    amount: null,
    owner_id: null,
    expected_close: null,
    created_at: '2026-09-01T00:00:00Z',
    ...over,
  };
}

describe('formatMoney', () => {
  it('разряды и копейки', () => {
    expect(formatMoney(1200000)).toBe('1 200 000 ₽');
    expect(formatMoney(999)).toBe('999 ₽');
    expect(formatMoney(1500.5)).toBe('1 500,50 ₽');
    expect(formatMoney(0)).toBe('0 ₽');
  });
});

describe('sortDeals', () => {
  it('ближайшая дата первой, без даты — в конец, потом по созданию', () => {
    const sorted = sortDeals([
      deal({ id: 'a', created_at: '2026-09-02T00:00:00Z' }),
      deal({ id: 'b', expected_close: '2026-10-01' }),
      deal({ id: 'c', expected_close: '2026-09-15' }),
      deal({ id: 'd', created_at: '2026-09-01T00:00:00Z' }),
    ]);
    expect(sorted.map((d) => d.id)).toEqual(['c', 'b', 'd', 'a']);
  });
});

describe('funnel и просрочка', () => {
  it('считает штуки и суммы по стадиям, NULL-сумма как ноль', () => {
    const f = funnel([
      deal({ id: '1', amount: 100 }),
      deal({ id: '2', amount: null }),
      deal({ id: '3', stage: 'won', amount: 50 }),
    ]);
    expect(f.new).toEqual({ count: 2, amount: 100 });
    expect(f.won).toEqual({ count: 1, amount: 50 });
    expect(f.lost).toEqual({ count: 0, amount: 0 });
  });
  it('просрочена только открытая с прошедшей датой', () => {
    expect(isDealOverdue({ stage: 'contact', expected_close: '2026-09-01' }, '2026-09-12')).toBe(
      true,
    );
    expect(isDealOverdue({ stage: 'won', expected_close: '2026-09-01' }, '2026-09-12')).toBe(false);
    expect(isDealOverdue({ stage: 'new', expected_close: null }, '2026-09-12')).toBe(false);
  });
});

describe('стадии и быстрые действия', () => {
  const label = (s: DealStage) => s.toUpperCase();
  it('следующая стадия, после переговоров — won, у закрытых нет', () => {
    expect(nextDealStage('new')).toBe('contact');
    expect(nextDealStage('negotiation')).toBe('won');
    expect(nextDealStage('lost')).toBeUndefined();
  });
  it('открытая: взять себе, дальше, выиграна, проиграна', () => {
    const keys = dealQuickActions({ stage: 'proposal', owner_id: null }, 'me', label).map(
      (a) => a.key,
    );
    expect(keys).toEqual(['assign_me', 'next', 'won', 'lost']);
  });
  it('переговоры: «дальше» уже ведёт в won — отдельного won нет; закрытая — вернуть', () => {
    expect(
      dealQuickActions({ stage: 'negotiation', owner_id: 'me' }, 'me', label).map((a) => a.key),
    ).toEqual(['unassign', 'next', 'lost']);
    expect(
      dealQuickActions({ stage: 'lost', owner_id: null }, 'me', label).map((a) => a.key),
    ).toEqual(['assign_me', 'reopen']);
  });
});

describe('parseAmount', () => {
  it('пробелы и запятая допустимы, пусто — null, мусор — NaN', () => {
    expect(parseAmount('1 200 000,50')).toBe(1200000.5);
    expect(parseAmount('  ')).toBeNull();
    expect(parseAmount('12abc')).toBeNaN();
  });
});
