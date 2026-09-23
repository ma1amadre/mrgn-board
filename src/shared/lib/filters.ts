import { addDays, today as todayIso } from './dates';
import type { Priority } from './labels';

/** Специальное значение фильтра по исполнителю: задачи без исполнителя. */
export const UNASSIGNED = 'none';

export const DUE_FILTERS = ['overdue', 'today', 'week', 'none'] as const;
export type DueFilter = (typeof DUE_FILTERS)[number];
export const DUE_FILTER_LABEL: Record<DueFilter, string> = {
  overdue: 'Просроченные',
  today: 'На сегодня',
  week: 'На неделю',
  none: 'Без срока',
};

export type TaskFilters = {
  assignee: string | null;
  client: string | null;
  priority: Priority | null;
  /** Метка задачи как есть (регистр значим — так же хранит БД). */
  label: string | null;
  /** Срок относительно сегодняшнего дня; «просроченные» — только открытые. */
  due: DueFilter | null;
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
  due: null,
  q: '',
  allDone: false,
};

const PRIORITY_VALUES: ReadonlySet<string> = new Set(['low', 'normal', 'high', 'urgent']);
const DUE_VALUES: ReadonlySet<string> = new Set(DUE_FILTERS);

type FilterableTask = {
  title: string;
  description: string | null;
  assignee_ids: string[];
  client_id: string | null;
  client: { name: string } | null;
  priority: string;
  labels: string[];
  due_date: string | null;
  done_at: string | null;
};

/** Фильтры живут в URL: ссылка на доску с фильтром шарится в чат и переживает F5. */
export function parseFilters(sp: URLSearchParams): TaskFilters {
  const priority = sp.get('priority');
  const due = sp.get('due');
  return {
    assignee: sp.get('assignee') || null,
    client: sp.get('client') || null,
    priority: priority && PRIORITY_VALUES.has(priority) ? (priority as Priority) : null,
    label: sp.get('label') || null,
    due: due && DUE_VALUES.has(due) ? (due as DueFilter) : null,
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
    ['due', f.due],
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
  return Boolean(f.assignee || f.client || f.priority || f.label || f.due || f.q.trim());
}

/** Поиск смотрит в название, описание, имя клиента и метки. */
export function matchesQuery(t: FilterableTask, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [t.title, t.description ?? '', t.client?.name ?? '', ...t.labels].some((s) =>
    s.toLowerCase().includes(needle),
  );
}

function matchesDue(t: FilterableTask, due: DueFilter, today: string): boolean {
  if (due === 'none') return t.due_date === null;
  if (t.due_date === null) return false;
  if (due === 'overdue') return t.done_at === null && t.due_date < today;
  if (due === 'today') return t.due_date === today;
  return t.due_date >= today && t.due_date <= addDays(today, 6);
}

export function applyTaskFilters<T extends FilterableTask>(
  tasks: T[],
  f: TaskFilters,
  today: string = todayIso(),
): T[] {
  return tasks.filter((t) => {
    if (f.assignee === UNASSIGNED) {
      if (t.assignee_ids.length > 0) return false;
    } else if (f.assignee && !t.assignee_ids.includes(f.assignee)) {
      return false;
    }
    if (f.client && t.client_id !== f.client) return false;
    if (f.priority && t.priority !== f.priority) return false;
    if (f.label && !t.labels.includes(f.label)) return false;
    if (f.due && !matchesDue(t, f.due, today)) return false;
    return matchesQuery(t, f.q);
  });
}
