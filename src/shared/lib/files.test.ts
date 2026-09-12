import { describe, expect, it } from 'vitest';
import { attachmentPath, formatBytes, isImage } from './files';

describe('formatBytes', () => {
  it('байты, килобайты с одним знаком, мегабайты целыми', () => {
    expect(formatBytes(812)).toBe('812 Б');
    expect(formatBytes(3_480)).toBe('3,4 КБ');
    expect(formatBytes(2_048)).toBe('2 КБ');
    expect(formatBytes(12 * 1024 * 1024)).toBe('12 МБ');
    expect(formatBytes(1_500_000)).toBe('1,4 МБ');
  });
});

describe('attachmentPath', () => {
  it('ASCII-ключ с расширением в нижнем регистре; без расширения — только id', () => {
    expect(attachmentPath('t1', 'a1', 'Договор №5.PDF')).toBe('t1/a1.pdf');
    expect(attachmentPath('t1', 'a1', 'README')).toBe('t1/a1');
    expect(attachmentPath('t1', 'a1', 'архив.tar.gz')).toBe('t1/a1.gz');
  });
  it('странное «расширение» не попадает в ключ', () => {
    expect(attachmentPath('t1', 'a1', 'файл.очень-длинное')).toBe('t1/a1');
  });
});

describe('isImage', () => {
  it('по mime', () => {
    expect(isImage('image/png')).toBe(true);
    expect(isImage('application/pdf')).toBe(false);
    expect(isImage(null)).toBe(false);
  });
});
