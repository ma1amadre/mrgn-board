import { describe, expect, it } from 'vitest';
import { searchAll } from './search';

const labels = {
  clientStatus: (s: string) => `status:${s}`,
  dealStage: (s: string) => `stage:${s}`,
  ideaStatus: (s: string) => `idea:${s}`,
};

const src = {
  tasks: [
    { id: 't1', title: 'Подключить CDN', client: { name: 'Сезон' }, done_at: null },
    { id: 't2', title: 'Отчёт по CDN', client: null, done_at: '2026-09-01' },
    { id: 't3', title: 'Лендинг', client: { name: 'CDN-провайдер' }, done_at: null },
  ],
  clients: [{ id: 'c1', name: 'CDN Партнёр', status: 'active' }],
  deals: [{ id: 'd1', title: 'Сделка', client: { name: 'Сезон' }, stage: 'won' }],
  ideas: [{ id: 'i1', title: 'Идея про cdn', status: 'new' }],
};

describe('searchAll', () => {
  it('пустой запрос — ничего', () => {
    expect(searchAll('', src, labels)).toEqual([]);
    expect(searchAll('   ', src, labels)).toEqual([]);
  });
  it('начало названия выше вхождения, вхождение выше подсказки, закрытые ниже открытых', () => {
    const ids = searchAll('cdn', src, labels).map((h) => `${h.kind}:${h.id}`);
    expect(ids).toEqual(['client:c1', 'idea:i1', 'task:t1', 'task:t2', 'task:t3']);
  });
  it('результаты одного вида идут подряд, группы — по лучшему совпадению', () => {
    const mixed = {
      ...src,
      deals: [{ id: 'd2', title: 'cdn для всех', client: null, stage: 'new' }],
      clients: [{ id: 'c2', name: 'Партнёр по cdn', status: 'active' }],
    };
    const kinds = searchAll('cdn', mixed, labels).map((h) => h.kind);
    expect(kinds).toEqual(['deal', 'idea', 'client', 'task', 'task', 'task']);
  });
  it('сделка находится по клиенту, ссылки ведут в нужный раздел', () => {
    const hits = searchAll('сезон', src, labels);
    expect(hits.map((h) => h.to)).toEqual(['/board?task=t1', '/deals?deal=d1']);
    expect(hits[1]?.hint).toBe('Сезон · stage:won');
  });
  it('клиент находится по контакту: имя, телефон по цифрам, telegram без @', () => {
    const withContacts = {
      ...src,
      clients: [
        {
          id: 'c1',
          name: 'Сезон',
          status: 'active',
          contacts: [
            {
              name: 'Ирина',
              role: 'директор',
              phone: '+7 900 000-00-01',
              email: null,
              telegram: 'irina_s',
            },
          ],
        },
      ],
    };
    const byName = searchAll('ирина', withContacts, labels);
    expect(byName.map((h) => `${h.kind}:${h.id}`)).toEqual(['client:c1']);
    expect(byName[0]?.hint).toBe('контакт: Ирина, директор');
    expect(searchAll('900 000', withContacts, labels)).toHaveLength(1);
    expect(searchAll('@irina', withContacts, labels)).toHaveLength(1);
    expect(searchAll('олег', withContacts, labels)).toHaveLength(0);
  });
  it('лимит на вид', () => {
    const many = {
      ...src,
      tasks: Array.from({ length: 8 }, (_, i) => ({
        id: `x${i}`,
        title: `cdn ${i}`,
        client: null,
        done_at: null,
      })),
    };
    expect(searchAll('cdn', many, labels, 3).filter((h) => h.kind === 'task')).toHaveLength(3);
  });
});
