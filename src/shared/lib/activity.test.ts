import { describe, expect, it } from 'vitest';
import { describeActivity, groupActivity } from './activity';

const NOW = new Date('2026-09-12T12:00:00');

describe('describeActivity', () => {
  it('создание', () => {
    expect(describeActivity({ kind: 'created', from_value: null, to_value: null })).toBe(
      'Задача создана',
    );
  });
  it('стадия и исполнитель с пустыми концами', () => {
    expect(describeActivity({ kind: 'stage', from_value: 'Бэклог', to_value: 'В работе' })).toBe(
      'Стадия: Бэклог → В работе',
    );
    expect(describeActivity({ kind: 'assignee', from_value: null, to_value: 'Алик' })).toBe(
      'Исполнитель: не назначен → Алик',
    );
  });
  it('приоритет переводится в подпись, неизвестное значение остаётся как есть', () => {
    expect(describeActivity({ kind: 'priority', from_value: 'normal', to_value: 'urgent' })).toBe(
      'Приоритет: Обычный → Срочно',
    );
    expect(describeActivity({ kind: 'priority', from_value: 'x', to_value: null })).toBe(
      'Приоритет: x → —',
    );
  });
  it('срок форматируется как дата, год показывается только чужой', () => {
    expect(
      describeActivity({ kind: 'due_date', from_value: null, to_value: '2026-09-15' }, NOW),
    ).toBe('Срок: — → 15 сен');
    expect(
      describeActivity({ kind: 'due_date', from_value: '2025-12-31', to_value: null }, NOW),
    ).toBe('Срок: 31 дек 2025 → —');
  });
  it('название и описание', () => {
    expect(describeActivity({ kind: 'title', from_value: 'a', to_value: 'b' })).toBe(
      'Название: «a» → «b»',
    );
    expect(describeActivity({ kind: 'description', from_value: null, to_value: null })).toBe(
      'Описание изменено',
    );
  });
  it('метки: пустой набор показывается прочерком', () => {
    expect(describeActivity({ kind: 'labels', from_value: null, to_value: 'cdn, срочно' })).toBe(
      'Метки: — → cdn, срочно',
    );
  });
  it('неизвестный kind не роняет ленту', () => {
    expect(describeActivity({ kind: 'weird', from_value: null, to_value: null })).toBe(
      'Изменение: weird',
    );
  });
});

function row(id: string, actor: string | null, at: string, kind = 'title') {
  return { id, kind, from_value: null, to_value: null, actor_id: actor, created_at: at };
}

describe('groupActivity', () => {
  it('записи одного автора в пределах минуты — один блок', () => {
    const groups = groupActivity([
      row('1', 'u1', '2026-09-12T10:00:30Z'),
      row('2', 'u1', '2026-09-12T10:00:00Z'),
      row('3', 'u1', '2026-09-12T09:59:45Z'),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.items.map((i) => i.id)).toEqual(['1', '2', '3']);
    expect(groups[0]?.created_at).toBe('2026-09-12T10:00:30Z');
  });
  it('другой автор или большой разрыв начинают новый блок', () => {
    const groups = groupActivity([
      row('1', 'u1', '2026-09-12T10:00:00Z'),
      row('2', 'u2', '2026-09-12T10:00:00Z'),
      row('3', 'u2', '2026-09-12T09:58:00Z'),
    ]);
    expect(groups.map((g) => g.items.map((i) => i.id))).toEqual([['1'], ['2'], ['3']]);
  });
  it('окно считается от первой записи блока, а не от последней', () => {
    const groups = groupActivity(
      [
        row('1', 'u1', '2026-09-12T10:00:00Z'),
        row('2', 'u1', '2026-09-12T10:00:40Z'),
        row('3', 'u1', '2026-09-12T10:01:20Z'),
      ],
      60_000,
    );
    expect(groups.map((g) => g.items.length)).toEqual([2, 1]);
  });
  it('null-автор группируется сам с собой', () => {
    const groups = groupActivity([
      row('1', null, '2026-09-12T10:00:00Z'),
      row('2', null, '2026-09-12T10:00:01Z'),
    ]);
    expect(groups).toHaveLength(1);
  });
});
