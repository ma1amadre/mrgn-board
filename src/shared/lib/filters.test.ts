import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  UNASSIGNED,
  applyTaskFilters,
  isFilterActive,
  parseFilters,
  serializeFilters,
} from './filters';

const tasks = [
  { id: '1', title: 'Поднять CDN', assignee_id: 'a', client_id: 'c1', priority: 'high' },
  { id: '2', title: 'Сверстать лендинг', assignee_id: 'b', client_id: 'c2', priority: 'normal' },
  { id: '3', title: 'Написать бота', assignee_id: null, client_id: 'c1', priority: 'urgent' },
];

describe('parseFilters', () => {
  it('пустой URL → пустые фильтры', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(EMPTY_FILTERS);
  });
  it('читает все параметры, строку поиска не трогает', () => {
    const f = parseFilters(new URLSearchParams('assignee=a&client=c1&priority=high&q=%20cdn%20'));
    expect(f).toEqual({ assignee: 'a', client: 'c1', priority: 'high', q: ' cdn ' });
  });
  it('неизвестный приоритет отбрасывается', () => {
    expect(parseFilters(new URLSearchParams('priority=asap')).priority).toBeNull();
  });
});

describe('serializeFilters', () => {
  it('сохраняет посторонние параметры и убирает пустые', () => {
    const base = new URLSearchParams('task=t1&assignee=a');
    const sp = serializeFilters({ ...EMPTY_FILTERS, client: 'c2' }, base);
    expect(sp.get('task')).toBe('t1');
    expect(sp.get('assignee')).toBeNull();
    expect(sp.get('client')).toBe('c2');
  });
  it('round-trip, включая пробел в конце набираемого запроса', () => {
    const f = { assignee: UNASSIGNED, client: 'c1', priority: 'low' as const, q: 'поднять ' };
    expect(parseFilters(serializeFilters(f))).toEqual(f);
  });
});

describe('applyTaskFilters', () => {
  it('без фильтров возвращает всё', () => {
    expect(applyTaskFilters(tasks, EMPTY_FILTERS)).toHaveLength(3);
    expect(isFilterActive(EMPTY_FILTERS)).toBe(false);
  });
  it('одни пробелы в поиске — фильтр не активен и ничего не режет', () => {
    expect(isFilterActive({ ...EMPTY_FILTERS, q: '   ' })).toBe(false);
    expect(applyTaskFilters(tasks, { ...EMPTY_FILTERS, q: '   ' })).toHaveLength(3);
  });
  it('по исполнителю', () => {
    expect(applyTaskFilters(tasks, { ...EMPTY_FILTERS, assignee: 'a' }).map((t) => t.id)).toEqual([
      '1',
    ]);
  });
  it('без исполнителя', () => {
    expect(
      applyTaskFilters(tasks, { ...EMPTY_FILTERS, assignee: UNASSIGNED }).map((t) => t.id),
    ).toEqual(['3']);
  });
  it('по клиенту и приоритету вместе', () => {
    const f = { ...EMPTY_FILTERS, client: 'c1', priority: 'urgent' as const };
    expect(applyTaskFilters(tasks, f).map((t) => t.id)).toEqual(['3']);
  });
  it('поиск по заголовку без учёта регистра и с пробелами по краям', () => {
    expect(applyTaskFilters(tasks, { ...EMPTY_FILTERS, q: ' ЛЕНДИНГ ' }).map((t) => t.id)).toEqual([
      '2',
    ]);
  });
});
