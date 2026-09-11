import { describe, expect, it } from 'vitest';
import { GAP, computePosition, needsRenumber } from './ordering';

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
