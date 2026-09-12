import { describe, expect, it } from 'vitest';
import { csvEscape, csvFilename, toCsv } from './csv';

describe('csvEscape', () => {
  it('простые значения как есть, пустые — пустая строка', () => {
    expect(csvEscape('текст')).toBe('текст');
    expect(csvEscape(42)).toBe('42');
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });
  it('разделитель, кавычки и переносы — в кавычках, кавычки удвоены', () => {
    expect(csvEscape('a;b')).toBe('"a;b"');
    expect(csvEscape('он сказал "да"')).toBe('"он сказал ""да"""');
    expect(csvEscape('две\nстроки')).toBe('"две\nстроки"');
    expect(csvEscape('a,b')).toBe('a,b');
    expect(csvEscape('a,b', ',')).toBe('"a,b"');
  });
});

describe('toCsv', () => {
  it('BOM, заголовок, CRLF, значения экранированы', () => {
    const csv = toCsv(
      ['Название', 'Сумма'],
      [
        ['CDN; защита', 150000],
        ['Сайт', null],
      ],
    );
    expect(csv).toBe('﻿Название;Сумма\r\n"CDN; защита";150000\r\nСайт;\r\n');
  });
});

describe('csvFilename', () => {
  it('база плюс дата', () => {
    expect(csvFilename('tasks', '2026-09-12')).toBe('tasks-2026-09-12.csv');
  });
});
