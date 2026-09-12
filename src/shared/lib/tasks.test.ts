import { describe, expect, it } from 'vitest';
import {
  countByStage,
  groupByStage,
  hideStaleDone,
  isOverdue,
  isStaleDone,
  upcomingDeadlines,
  workloadByAssignee,
} from './tasks';

const TODAY = '2026-09-11';

function task(over: Partial<Parameters<typeof groupByStage>[0][number]> & { id: string }) {
  return {
    stage_id: 's1',
    assignee_id: null,
    due_date: null,
    done_at: null,
    position: 0,
    created_at: '2026-09-01T00:00:00Z',
    ...over,
  };
}

describe('isOverdue', () => {
  it('срок вчера и не закрыта → просрочена', () => {
    expect(isOverdue({ due_date: '2026-09-10', done_at: null }, TODAY)).toBe(true);
  });
  it('срок сегодня → ещё нет', () => {
    expect(isOverdue({ due_date: TODAY, done_at: null }, TODAY)).toBe(false);
  });
  it('закрытая не просрочена', () => {
    expect(isOverdue({ due_date: '2026-01-01', done_at: '2026-01-02T00:00:00Z' }, TODAY)).toBe(
      false,
    );
  });
  it('без срока не просрочена', () => {
    expect(isOverdue({ due_date: null, done_at: null }, TODAY)).toBe(false);
  });
});

describe('groupByStage', () => {
  it('сортирует по position, при равенстве по created_at, пустые стадии сохраняет', () => {
    const tasks = [
      task({ id: 'b', position: 2048 }),
      task({ id: 'a', position: 1024 }),
      task({ id: 'd', position: 1024, created_at: '2026-09-02T00:00:00Z' }),
      task({ id: 'c', stage_id: 's2', position: 5 }),
    ];
    const map = groupByStage(tasks, ['s1', 's2', 's3']);
    expect(map.get('s1')?.map((t) => t.id)).toEqual(['a', 'd', 'b']);
    expect(map.get('s2')?.map((t) => t.id)).toEqual(['c']);
    expect(map.get('s3')).toEqual([]);
  });
  it('задачи неизвестной стадии не теряют остальные', () => {
    const map = groupByStage([task({ id: 'x', stage_id: 'ghost' })], ['s1']);
    expect(map.get('s1')).toEqual([]);
  });
});

describe('workloadByAssignee', () => {
  it('считает открытые и просроченные, закрытые пропускает', () => {
    const tasks = [
      task({ id: '1', assignee_id: 'p1', due_date: '2026-09-01' }),
      task({ id: '2', assignee_id: 'p1' }),
      task({ id: '3', assignee_id: 'p1', done_at: '2026-09-05T00:00:00Z' }),
      task({ id: '4', assignee_id: null, due_date: '2026-09-01' }),
    ];
    const rows = workloadByAssignee(tasks, ['p1', 'p2'], TODAY);
    expect(rows).toEqual([
      { profileId: 'p1', open: 2, overdue: 1 },
      { profileId: 'p2', open: 0, overdue: 0 },
      { profileId: null, open: 1, overdue: 1 },
    ]);
  });
  it('строку «без исполнителя» прячет, когда таких задач нет', () => {
    expect(workloadByAssignee([], ['p1'], TODAY)).toEqual([
      { profileId: 'p1', open: 0, overdue: 0 },
    ]);
  });
});

describe('upcomingDeadlines', () => {
  it('берёт просроченные и ближайшие 7 дней, сортирует по сроку', () => {
    const tasks = [
      task({ id: 'far', due_date: '2026-09-30' }),
      task({ id: 'soon', due_date: '2026-09-15' }),
      task({ id: 'edge', due_date: '2026-09-18' }),
      task({ id: 'over', due_date: '2026-09-01' }),
      task({ id: 'done', due_date: '2026-09-12', done_at: '2026-09-10T00:00:00Z' }),
      task({ id: 'nodate' }),
    ];
    expect(upcomingDeadlines(tasks, TODAY).map((t) => t.id)).toEqual(['over', 'soon', 'edge']);
  });
});

describe('countByStage', () => {
  it('считает по стадиям', () => {
    const map = countByStage([
      task({ id: '1' }),
      task({ id: '2' }),
      task({ id: '3', stage_id: 's2' }),
    ]);
    expect(map.get('s1')).toBe(2);
    expect(map.get('s2')).toBe(1);
  });
});

describe('hideStaleDone', () => {
  it('открытые и свежезакрытые остаются, закрытые старше 14 дней уходят', () => {
    const tasks = [
      task({ id: 'open' }),
      task({ id: 'fresh', done_at: '2026-09-05T10:00:00Z' }),
      task({ id: 'edge', done_at: '2026-08-28T23:59:00Z' }),
      task({ id: 'stale', done_at: '2026-08-27T10:00:00Z' }),
    ];
    expect(hideStaleDone(tasks, TODAY).map((t) => t.id)).toEqual(['open', 'fresh', 'edge']);
    expect(isStaleDone({ done_at: null }, TODAY)).toBe(false);
  });
});
