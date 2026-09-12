import type { Priority } from './labels';

/** Специальное значение фильтра по исполнителю: задачи без исполнителя. */
export const UNASSIGNED = 'none';

export type TaskFilters = {
  assignee: string | null;
  client: string | null;
  priority: Priority | null;
  /** Метка задачи как есть (регистр значим — так же хранит БД). */
  label: string | null;
  /** Строка поиска как есть, с пробелами: это значение контролируемого инпута. */
  q: string;
  /** Показывать все закрытые задачи, а не только свежие (см. hideStaleDone). */
  allDone: boolean;
};

export const EMPTY_FILTERS: TaskFilters = {
  assignee: null,
  client: null,
  priority: null,
  label: null,
  q: '',
  allDone: false,
};

const PRIORITY_VALUES: ReadonlySet<string> = new Set(['low', 'normal', 'high', 'urgent']);

type FilterableTask = {
  title: string;
  description: string | null;
  assignee_id: string | null;
  client_id: string | null;
  client: { name: string } | null;
  priority: string;
  labels: string[];
};

/** Фильтры живут в URL: ссылка на доску с фильтром шарится в чат и переживает F5. */
export function parseFilters(sp: URLSearchParams): TaskFilters {
  const priority = sp.get('priority');
  return {
    assignee: sp.get('assignee') || null,
    client: sp.get('client') || null,
    priority: priority && PRIORITY_VALUES.has(priority) ? (priority as Priority) : null,
    label: sp.get('label') || null,
    q: sp.get('q') ?? '',
    allDone: sp.get('done') === 'all',
  };
}

/** Пишет фильтры поверх существующих параметров (например, ?task=… остаётся). */
export function serializeFilters(f: TaskFilters, base?: URLSearchParams): URLSearchParams {
  const sp = new URLSearchParams(base);
  const entries: Array<[string, string | null]> = [
    ['assignee', f.assignee],
    ['client', f.client],
    ['priority', f.priority],
    ['label', f.label],
    ['q', f.q || null],
    ['done', f.allDone ? 'all' : null],
  ];
  for (const [key, value] of entries) {
    if (value) sp.set(key, value);
    else sp.delete(key);
  }
  return sp;
}

/** Активен ли отбор задач; режим показа закрытых — не отбор, «Сбросить» его не трогает. */
export function isFilterActive(f: TaskFilters): boolean {
  return Boolean(f.assignee || f.client || f.priority || f.label || f.q.trim());
}

/** Поиск смотрит в название, описание, имя клиента и метки. */
export function matchesQuery(t: FilterableTask, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [t.title, t.description ?? '', t.client?.name ?? '', ...t.labels].some((s) =>
    s.toLowerCase().includes(needle),
  );
}

export function applyTaskFilters<T extends FilterableTask>(tasks: T[], f: TaskFilters): T[] {
  return tasks.filter((t) => {
    if (f.assignee === UNASSIGNED) {
      if (t.assignee_id !== null) return false;
    } else if (f.assignee && t.assignee_id !== f.assignee) {
      return false;
    }
    if (f.client && t.client_id !== f.client) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.label && !t.labels.includes(f.label)) return false;
    return matchesQuery(t, f.q);
  });
}
