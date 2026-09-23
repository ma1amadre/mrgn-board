import { describe, expect, it } from 'vitest';
import { endPosition, nextStage, quickActions, terminalStage } from './quickActions';

const stages = [
  { id: 'done', name: 'Готово', position: 4000, is_terminal: true, created_at: '2026-01-01' },
  { id: 'backlog', name: 'Бэклог', position: 1000, is_terminal: false, created_at: '2026-01-01' },
  { id: 'work', name: 'В работе', position: 2000, is_terminal: false, created_at: '2026-01-01' },
  {
    id: 'review',
    name: 'На проверке',
    position: 3000,
    is_terminal: false,
    created_at: '2026-01-01',
  },
];
const tasks = [
  { stage_id: 'work', position: 1024 },
  { stage_id: 'work', position: 5000 },
  { stage_id: 'done', position: 1024 },
];
const ctx = { stages, tasks, meId: 'me', today: '2026-09-12' };

describe('стадии', () => {
  it('следующая — по position, а не по порядку в массиве; у последней нет', () => {
    expect(nextStage(stages, 'backlog')?.id).toBe('work');
    expect(nextStage(stages, 'done')).toBeUndefined();
    expect(terminalStage(stages)?.id).toBe('done');
  });
  it('позиция в конец колонки — за максимумом с шагом', () => {
    expect(endPosition(tasks, 'work')).toBe(6024);
    expect(endPosition(tasks, 'backlog')).toBe(1024);
  });
});

describe('quickActions', () => {
  const base = { id: 't', stage_id: 'work', assignee_ids: [] as string[], due_date: null };
  it('открытая задача без исполнителя и срока', () => {
    const actions = quickActions(base, ctx);
    expect(actions.map((a) => a.key)).toEqual([
      'assign_me',
      'next_stage',
      'close',
      'due_tomorrow',
      'due_week',
    ]);
    expect(actions[0]?.patch).toEqual({ assign: 'me' });
  });
  it('я среди исполнителей — «снять с себя»; срок есть — «убрать срок»; завтра уже стоит — не предлагать', () => {
    const actions = quickActions(
      { ...base, assignee_ids: ['other', 'me'], due_date: '2026-09-13' },
      ctx,
    );
    const keys = actions.map((a) => a.key);
    expect(keys).toContain('unassign');
    expect(actions.find((a) => a.key === 'unassign')?.patch).toEqual({ unassign: 'me' });
    expect(keys).toContain('due_clear');
    expect(keys).not.toContain('due_tomorrow');
    expect(actions.find((a) => a.key === 'due_week')?.patch).toEqual({ due_date: '2026-09-19' });
  });
  it('предпоследняя стадия: «дальше» и есть «Готово», отдельного «закрыть» нет', () => {
    const keys = quickActions({ ...base, stage_id: 'review' }, ctx).map((a) => a.key);
    expect(keys).toContain('next_stage');
    expect(keys).not.toContain('close');
  });
  it('закрытая задача — вернуть в первую открытую, в конец её колонки', () => {
    const actions = quickActions({ ...base, stage_id: 'done' }, ctx);
    const reopen = actions.find((a) => a.key === 'reopen');
    expect(reopen?.patch).toEqual({ stage_id: 'backlog', position: 1024 });
    expect(actions.map((a) => a.key)).not.toContain('next_stage');
  });
});
