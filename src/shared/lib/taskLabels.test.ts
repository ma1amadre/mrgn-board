import { describe, expect, it } from 'vitest';
import { MAX_LABELS, collectLabels, normalizeLabels } from './taskLabels';

describe('normalizeLabels', () => {
  it('обрезает пробелы, убирает пустые и дубли, сортирует', () => {
    expect(normalizeLabels([' cdn', 'бот', 'cdn', '', '  ', 'app'])).toEqual(['app', 'cdn', 'бот']);
  });
  it('регистр значим — «CDN» и «cdn» разные метки', () => {
    expect(normalizeLabels(['CDN', 'cdn'])).toEqual(['cdn', 'CDN']);
  });
  it('не больше MAX_LABELS', () => {
    const many = Array.from({ length: MAX_LABELS + 3 }, (_, i) => `l${String(i).padStart(2, '0')}`);
    expect(normalizeLabels(many)).toHaveLength(MAX_LABELS);
  });
});

describe('collectLabels', () => {
  it('собирает уникальные метки со всех задач без потолка', () => {
    const tasks = Array.from({ length: 6 }, (_, i) => ({ labels: [`a${i}`, `b${i}`, 'общая'] }));
    const all = collectLabels(tasks);
    expect(all).toHaveLength(13);
    expect(all.filter((l) => l === 'общая')).toHaveLength(1);
  });
});
