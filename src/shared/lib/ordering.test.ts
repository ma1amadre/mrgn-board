import { describe, expect, it } from 'vitest';
import { GAP, computePosition, needsRenumber, neighborPositions } from './ordering';

describe('computePosition', () => {
  it('пустая колонка → GAP', () => {
    expect(computePosition(undefined, undefined)).toBe(GAP);
  });
  it('в начало → next − GAP', () => {
    expect(computePosition(undefined, 3000)).toBe(3000 - GAP);
  });
  it('в конец → prev + GAP', () => {
    expect(computePosition(2000, undefined)).toBe(2000 + GAP);
  });
  it('между соседями → середина', () => {
    expect(computePosition(1000, 2000)).toBe(1500);
  });
});

describe('needsRenumber', () => {
  it('на краю колонки не нужен', () => {
    expect(needsRenumber(undefined, 5)).toBe(false);
    expect(needsRenumber(5, undefined)).toBe(false);
  });
  it('обычный зазор', () => {
    expect(needsRenumber(1000, 1001)).toBe(false);
  });
  it('исчерпанный зазор', () => {
    expect(needsRenumber(1000, 1000 + 1e-7)).toBe(true);
  });
  it('серия вставок в одну щель рано или поздно требует перенумерации', () => {
    const prev = 1000;
    let next = 2000;
    let steps = 0;
    while (!needsRenumber(prev, next) && steps < 100) {
      next = computePosition(prev, next);
      steps += 1;
    }
    expect(steps).toBeGreaterThan(10);
    expect(steps).toBeLessThan(100);
  });
});

describe('neighborPositions', () => {
  // Полная колонка: A(1000) H(1500, скрыта фильтром) B(2000) C(3000)
  const column = [
    { id: 'A', position: 1000 },
    { id: 'H', position: 1500 },
    { id: 'B', position: 2000 },
    { id: 'C', position: 3000 },
  ];
  it('после видимого prev — перед следующей по списку, даже скрытой', () => {
    expect(neighborPositions(column, 'A', 'B')).toEqual({ prev: 1000, next: 1500 });
  });
  it('в начало — перед первой реальной карточкой', () => {
    expect(neighborPositions(column, undefined, 'A')).toEqual({ prev: undefined, next: 1000 });
  });
  it('перед видимым next без видимого prev — сразу перед ним', () => {
    expect(neighborPositions(column, undefined, 'B')).toEqual({ prev: 1500, next: 2000 });
  });
  it('в конец видимого списка — после последней реальной', () => {
    expect(neighborPositions(column, 'C', undefined)).toEqual({ prev: 3000, next: undefined });
  });
  it('видимых соседей нет — в конец колонки за скрытыми', () => {
    expect(neighborPositions(column, undefined, undefined)).toEqual({
      prev: 3000,
      next: undefined,
    });
    expect(neighborPositions([], undefined, undefined)).toEqual({
      prev: undefined,
      next: undefined,
    });
  });
  it('исчезнувший сосед (удалён другим пользователем) не ломает расчёт', () => {
    expect(neighborPositions(column, 'ghost', 'B')).toEqual({ prev: 1500, next: 2000 });
  });
});
