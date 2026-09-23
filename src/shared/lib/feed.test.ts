import { describe, expect, it } from 'vitest';
import { buildClientFeed, lastActivityByClient } from './feed';

const me = { name: 'Женя', color: '#000' };

describe('buildClientFeed', () => {
  it('склеивает задачи, комментарии и сделки, свежие сверху, длинный комментарий обрезан', () => {
    const feed = buildClientFeed(
      {
        activity: [
          {
            id: 'a1',
            task_id: 't1',
            kind: 'created',
            from_value: null,
            to_value: null,
            actor_id: 'u',
            actor: me,
            created_at: '2026-09-10T10:00:00Z',
          },
        ],
        comments: [
          {
            id: 'c1',
            task_id: 't1',
            body: 'x'.repeat(130),
            created_at: '2026-09-12T10:00:00Z',
            author: null,
          },
        ],
        dealActivity: [
          {
            id: 'd1',
            deal_id: 'deal',
            kind: 'stage',
            from_value: 'new',
            to_value: 'won',
            actor_id: 'u',
            actor: me,
            created_at: '2026-09-11T10:00:00Z',
          },
        ],
        tasks: [{ id: 't1', title: 'Подключить CDN' }],
        deals: [{ id: 'deal', title: 'CDN' }],
      },
      10,
    );
    expect(feed.map((e) => e.id)).toEqual(['c:c1', 'd:d1', 'a:a1']);
    expect(feed[0]?.text).toBe(`Комментарий: ${'x'.repeat(120)}…`);
    expect(feed[0]?.about).toBe('Подключить CDN');
    expect(feed[1]?.text).toBe('Стадия: Новая → Выиграна');
    expect(feed[1]?.to).toBe('/deals?deal=deal');
    expect(feed[2]?.text).toBe('Задача создана');
  });
  it('лимит режет старые', () => {
    const activity = Array.from({ length: 5 }, (_, i) => ({
      id: `a${i}`,
      task_id: 't',
      kind: 'created',
      from_value: null,
      to_value: null,
      actor_id: null,
      actor: null,
      created_at: `2026-09-1${i}T00:00:00Z`,
    }));
    const input = { activity, comments: [], dealActivity: [], tasks: [], deals: [] };
    const feed = buildClientFeed(input, 2);
    expect(feed.map((e) => e.id)).toEqual(['a:a4', 'a:a3']);
    expect(feed[0]?.about).toBe('Задача');
    expect(buildClientFeed(input)).toHaveLength(5);
  });
});

describe('lastActivityByClient', () => {
  it('берёт самое свежее из клиента, задач и сделок; задачи без клиента не считаются', () => {
    const map = lastActivityByClient(
      [{ id: 'c1', updated_at: '2026-09-01T00:00:00Z' }],
      [
        { client_id: 'c1', updated_at: '2026-09-05T00:00:00Z' },
        { client_id: null, updated_at: '2026-09-09T00:00:00Z' },
      ],
      [{ client_id: 'c1', updated_at: '2026-09-03T00:00:00Z' }],
    );
    expect(map.get('c1')).toBe('2026-09-05T00:00:00Z');
  });
});
