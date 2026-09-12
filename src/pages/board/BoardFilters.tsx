import type { Client, Profile } from '../../shared/api/types';
import {
  EMPTY_FILTERS,
  UNASSIGNED,
  isFilterActive,
  type TaskFilters,
} from '../../shared/lib/filters';
import { PRIORITIES, PRIORITY_LABEL, type Priority } from '../../shared/lib/labels';
import { plural } from '../../shared/lib/text';

export function BoardFilters({
  filters,
  profiles,
  clients,
  hiddenDone,
  onChange,
}: {
  filters: TaskFilters;
  profiles: Profile[];
  clients: Client[];
  /** Сколько давно закрытых задач скрыто с доски. */
  hiddenDone: number;
  onChange: (f: TaskFilters) => void;
}) {
  return (
    <div className="toolbar" role="search">
      <input
        className="input toolbar-search"
        placeholder="Поиск: название, описание, клиент"
        value={filters.q}
        onChange={(e) => onChange({ ...filters, q: e.target.value })}
      />
      <select
        className="select"
        aria-label="Исполнитель"
        value={filters.assignee ?? ''}
        onChange={(e) => onChange({ ...filters, assignee: e.target.value || null })}
      >
        <option value="">Все исполнители</option>
        <option value={UNASSIGNED}>Без исполнителя</option>
        {profiles.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        className="select"
        aria-label="Клиент"
        value={filters.client ?? ''}
        onChange={(e) => onChange({ ...filters, client: e.target.value || null })}
      >
        <option value="">Все клиенты</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className="select"
        aria-label="Приоритет"
        value={filters.priority ?? ''}
        onChange={(e) =>
          onChange({ ...filters, priority: (e.target.value || null) as Priority | null })
        }
      >
        <option value="">Любой приоритет</option>
        {PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {PRIORITY_LABEL[p]}
          </option>
        ))}
      </select>
      {isFilterActive(filters) ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => onChange({ ...EMPTY_FILTERS, allDone: filters.allDone })}
        >
          Сбросить
        </button>
      ) : null}
      {hiddenDone > 0 || filters.allDone ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: 'auto' }}
          aria-pressed={filters.allDone}
          onClick={() => onChange({ ...filters, allDone: !filters.allDone })}
        >
          {filters.allDone
            ? 'Скрыть старые закрытые'
            : `Ещё ${hiddenDone} ${plural(hiddenDone, ['закрытая', 'закрытые', 'закрытых'])}`}
        </button>
      ) : null}
    </div>
  );
}
