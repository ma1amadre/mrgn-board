export type CsvCell = string | number | null | undefined;

/** Разделитель «;» — так русский Excel открывает файл сразу в колонки, без мастера импорта. */
export const CSV_SEPARATOR = ';';

/** RFC 4180: поле в кавычках, если внутри разделитель, кавычка или перенос; кавычки удваиваются. */
export function csvEscape(value: CsvCell, sep: string = CSV_SEPARATOR): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  return /["\r\n]/.test(s) || s.includes(sep) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Текст CSV с BOM: без него Excel читает UTF-8 как кракозябры. Строки через CRLF. */
export function toCsv(header: string[], rows: CsvCell[][], sep: string = CSV_SEPARATOR): string {
  const lines = [header, ...rows].map((row) => row.map((c) => csvEscape(c, sep)).join(sep));
  return `﻿${lines.join('\r\n')}\r\n`;
}

/** Имя файла: латиница, дата, без пробелов — чтобы не зависеть от кодировки заголовков. */
export function csvFilename(base: string, dateIso: string): string {
  return `${base}-${dateIso}.csv`;
}
