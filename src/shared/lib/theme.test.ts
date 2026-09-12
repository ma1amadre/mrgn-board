import { describe, expect, it } from 'vitest';
import { nextTheme, parseTheme } from '../../app/theme';

describe('тема', () => {
  it('переключение по кругу', () => {
    expect(nextTheme('system')).toBe('light');
    expect(nextTheme('light')).toBe('dark');
    expect(nextTheme('dark')).toBe('system');
  });
  it('из storage читаются только известные значения', () => {
    expect(parseTheme('dark')).toBe('dark');
    expect(parseTheme('light')).toBe('light');
    expect(parseTheme('blue')).toBe('system');
    expect(parseTheme(null)).toBe('system');
  });
});
