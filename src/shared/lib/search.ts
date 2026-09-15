export type SearchHit = {
  kind: 'task' | 'client' | 'deal' | 'idea';
  id: string;
  title: string;
  /** Вторая строка: клиент у задачи, стадия у сделки и т. п. */
  hint: string;
  to: string;
  /** Чем меньше, тем выше: 0 — совпало начало, 1 — вхождение в название, 2 — во второй строке. */
  rank: number;
};

export type SearchSources = {
  tasks: ReadonlyArray<{
    id: string;
    title: string;
    client: { name: string } | null;
    done_at: string | null;
  }>;
  clients: ReadonlyArray<{ id: string; name: string; status: string }>;
  deals: ReadonlyArray<{
    id: string;
    title: string;
    client: { name: string } | null;
    stage: string;
  }>;
  ideas: ReadonlyArray<{ id: string; title: string; status: string }>;
};

export const SEARCH_KIND_LABEL: Record<SearchHit['kind'], string> = {
  task: 'Задачи',
  client: 'Клиенты',
  deal: 'Сделки',
  idea: 'Идеи',
};

function rankOf(needle: string, title: string, hint: string): number | null {
  const t = title.toLowerCase();
  if (t.startsWith(needle)) return 0;
  if (t.includes(needle)) return 1;
  if (hint.toLowerCase().includes(needle)) return 2;
  return null;
}

/**
 * Поиск по всему, что уже лежит в кеше: без запросов к базе. Закрытые задачи идут после открытых
 * при равном ранге. Пустой запрос — пусто: палитра не должна вываливать всё подряд.
 */
export function searchAll(
  query: string,
  src: SearchSources,
  labels: {
    clientStatus: (s: string) => string;
    dealStage: (s: string) => string;
    ideaStatus: (s: string) => string;
  },
  limitPerKind = 5,
): SearchHit[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  const hits: SearchHit[] = [];

  for (const t of src.tasks) {
    const hint = t.client?.name ?? '';
    const rank = rankOf(needle, t.title, hint);
    if (rank !== null) {
      hits.push({
        kind: 'task',
        id: t.id,
        title: t.title,
        hint: [hint, t.done_at ? 'закрыта' : ''].filter(Boolean).join(' · '),
        to: `/board?task=${t.id}`,
        rank: rank + (t.done_at ? 0.5 : 0),
      });
    }
  }
  for (const c of src.clients) {
    const hint = labels.clientStatus(c.status);
    const rank = rankOf(needle, c.name, '');
    if (rank !== null) {
      hits.push({ kind: 'client', id: c.id, title: c.name, hint, to: `/clients/${c.id}`, rank });
    }
  }
  for (const d of src.deals) {
    const hint = [d.client?.name ?? '', labels.dealStage(d.stage)].filter(Boolean).join(' · ');
    const rank = rankOf(needle, d.title, d.client?.name ?? '');
    if (rank !== null) {
      hits.push({ kind: 'deal', id: d.id, title: d.title, hint, to: `/deals?deal=${d.id}`, rank });
    }
  }
  for (const i of src.ideas) {
    const rank = rankOf(needle, i.title, '');
    if (rank !== null) {
      hits.push({
        kind: 'idea',
        id: i.id,
        title: i.title,
        hint: labels.ideaStatus(i.status),
        to: `/ideas?idea=${i.id}`,
        rank,
      });
    }
  }

  const perKind = new Map<SearchHit['kind'], number>();
  return hits
    .sort((a, b) => a.rank - b.rank || a.title.localeCompare(b.title, 'ru'))
    .filter((h) => {
      const n = perKind.get(h.kind) ?? 0;
      if (n >= limitPerKind) return false;
      perKind.set(h.kind, n + 1);
      return true;
    });
}
