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
  {
    id: '1',
    title: 'Поднять CDN',
    description: 'Переключить DNS на NGENIX',
    assignee_ids: ['a'],
    client_id: 'c1',
    client: { name: 'Интернет-магазин «Сезон»' },
    priority: 'high',
    labels: ['cdn', 'срочно'],
    due_date: '2026-09-10',
    done_at: null,
  },
  {
    id: '2',
    title: 'Сверстать лендинг',
    description: null,
    assignee_ids: ['b', 'a'],
    client_id: 'c2',
    client: { name: 'Автосервис' },
    priority: 'normal',
    labels: [],
    due_date: '2026-09-16',
    done_at: null,
  },
  {
    id: '3',
    title: 'Написать бота',
    description: 'aiogram',
    assignee_ids: [],
    client_id: 'c1',
    client: { name: 'Интернет-магазин «Сезон»' },
    priority: 'urgent',
    labels: ['бот'],
    due_date: null,
    done_at: null,
  },
  {
    id: '4',
    title: 'Закрытая просроченная',
    description: null,
    assignee_ids: ['a'],
    client_id: null,
    client: null,
    priority: 'normal',
    labels: [],
    due_date: '2026-09-01',
    done_at: '2026-09-02T00:00:00Z',
  },
];
const TODAY = '2026-09-16';

describe('parseFilters', () => {
  it('пустой URL → пустые фильтры', () => {
    expect(parseFilters(new URLSearchParams())).toEqual(EMPTY_FILTERS);
  });
  it('читает все параметры, строку поиска не трогает', () => {
    const f = parseFilters(
      new URLSearchParams('assignee=a&client=c1&priority=high&q=%20cdn%20&done=all'),
    );
    expect(f).toEqual({
      assignee: 'a',
      client: 'c1',
      priority: 'high',
      label: null,
      due: null,
      q: ' cdn ',
      allDone: true,
    });
  });
  it('неизвестный приоритет, срок и чужое значение done отбрасываются', () => {
    const f = parseFilters(new URLSearchParams('priority=asap&done=yes&due=soon'));
    expect(f.priority).toBeNull();
    expect(f.due).toBeNull();
    expect(f.allDone).toBe(false);
    expect(parseFilters(new URLSearchParams('due=overdue')).due).toBe('overdue');
  });
});

describe('serializeFilters', () => {
  it('сохраняет посторонние параметры и убирает пустые', () => {
    const base = new URLSearchParams('task=t1&assignee=a&done=all');
    const sp = serializeFilters({ ...EMPTY_FILTERS, client: 'c2' }, base);
    expect(sp.get('task')).toBe('t1');
    expect(sp.get('assignee')).toBeNull();
    expect(sp.get('done')).toBeNull();
    expect(sp.get('client')).toBe('c2');
  });
  it('round-trip, включая пробел в конце набираемого запроса', () => {
    const f = {
      assignee: UNASSIGNED,
      client: 'c1',
      priority: 'low' as const,
      label: 'cdn',
      due: 'week' as const,
      q: 'поднять ',
      allDone: true,
    };
    expect(parseFilters(serializeFilters(f))).toEqual(f);
  });
});

describe('applyTaskFilters', () => {
  it('без фильтров возвращает всё', () => {
    expect(applyTaskFilters(tasks, EMPTY_FILTERS)).toHaveLength(4);
    expect(isFilterActive(EMPTY_FILTERS)).toBe(false);
  });
  it('по сроку: просроченные только открытые, неделя включает сегодня, без срока', () => {
    const ids = (due: 'overdue' | 'today' | 'week' | 'none') =>
      applyTaskFilters(tasks, { ...EMPTY_FILTERS, due }, TODAY).map((t) => t.id);
    expect(ids('overdue')).toEqual(['1']);
    expect(ids('today')).toEqual(['2']);
    expect(ids('week')).toEqual(['2']);
    expect(ids('none')).toEqual(['3']);
    expect(isFilterActive({ ...EMPTY_FILTERS, due: 'today' })).toBe(true);
  });
  it('режим «все закрытые» не считается фильтром', () => {
    expect(isFilterActive({ ...EMPTY_FILTERS, allDone: true })).toBe(false);
  });
  it('одни пробелы в поиске — фильтр не активен и ничего не режет', () => {
    expect(isFilterActive({ ...EMPTY_FILTERS, q: '   ' })).toBe(false);
    expect(applyTaskFilters(tasks, { ...EMPTY_FILTERS, q: '   ' })).toHaveLength(4);
  });
  it('по исполнителю: задача с несколькими исполнителями находится по каждому', () => {
    expect(applyTaskFilters(tasks, { ...EMPTY_FILTERS, assignee: 'a' }).map((t) => t.id)).toEqual([
      '1',
      '2',
      '4',
    ]);
    expect(applyTaskFilters(tasks, { ...EMPTY_FILTERS, assignee: 'b' }).map((t) => t.id)).toEqual([
      '2',
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
  it('поиск по описанию и имени клиента', () => {
    expect(applyTaskFilters(tasks, { ...EMPTY_FILTERS, q: 'ngenix' }).map((t) => t.id)).toEqual([
      '1',
    ]);
    expect(applyTaskFilters(tasks, { ...EMPTY_FILTERS, q: 'сезон' }).map((t) => t.id)).toEqual([
      '1',
      '3',
    ]);
  });
});

describe('метки', () => {
  it('фильтр по метке — точное совпадение, регистр значим', () => {
    expect(applyTaskFilters(tasks, { ...EMPTY_FILTERS, label: 'cdn' }).map((t) => t.id)).toEqual([
      '1',
    ]);
    expect(applyTaskFilters(tasks, { ...EMPTY_FILTERS, label: 'CDN' })).toHaveLength(0);
    expect(isFilterActive({ ...EMPTY_FILTERS, label: 'cdn' })).toBe(true);
  });
  it('поиск находит и по метке', () => {
    expect(applyTaskFilters(tasks, { ...EMPTY_FILTERS, q: 'срочно' }).map((t) => t.id)).toEqual([
      '1',
    ]);
  });
  it('метка ходит через URL', () => {
    expect(parseFilters(new URLSearchParams('label=%D0%B1%D0%BE%D1%82')).label).toBe('бот');
    expect(serializeFilters({ ...EMPTY_FILTERS, label: 'бот' }).get('label')).toBe('бот');
  });
});
