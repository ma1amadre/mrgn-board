import { describe, expect, it } from 'vitest';
import { letterFromCode, resolveHotkey } from './hotkeys';

describe('resolveHotkey', () => {
  it('одиночные клавиши', () => {
    expect(resolveHotkey(null, 'n')).toEqual({ action: { type: 'new' }, prefix: null });
    expect(resolveHotkey(null, '/')).toEqual({ action: { type: 'search' }, prefix: null });
    expect(resolveHotkey(null, '?')).toEqual({ action: { type: 'help' }, prefix: null });
    expect(resolveHotkey(null, 'x')).toEqual({ action: null, prefix: null });
  });
  it('«g» ждёт вторую клавишу, потом переход; неизвестная сбрасывает префикс', () => {
    expect(resolveHotkey(null, 'g')).toEqual({ action: null, prefix: 'g' });
    expect(resolveHotkey('g', 'b')).toEqual({ action: { type: 'go', to: '/board' }, prefix: null });
    expect(resolveHotkey('g', 'z')).toEqual({ action: null, prefix: null });
    // «g n» — не «новая задача»: после префикса одиночные клавиши не срабатывают.
    expect(resolveHotkey('g', 'n')).toEqual({ action: null, prefix: null });
  });
});

describe('letterFromCode', () => {
  it('физическая клавиша важнее раскладки', () => {
    expect(letterFromCode('KeyG', 'п')).toBe('g');
    expect(letterFromCode('Slash', '?')).toBe('?');
    expect(letterFromCode('Slash', '.')).toBe('/');
    expect(letterFromCode('Digit1', '1')).toBe('1');
  });
});
