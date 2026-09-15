import { useState } from 'react';
import type { Client, Profile } from '../../shared/api/types';
import {
  EMPTY_FILTERS,
  UNASSIGNED,
  isFilterActive,
  type TaskFilters,
} from '../../shared/lib/filters';
import { PRIORITIES, PRIORITY_LABEL, type Priority } from '../../shared/lib/labels';
import { plural } from '../../shared/lib/text';
import { BoardViews } from './BoardViews';

export function BoardFilters({
  filters,
  profiles,
  clients,
  labels,
  hiddenDone,
  viewQuery,
  onChange,
  onApplyView,
}: {
  filters: TaskFilters;
  profiles: Profile[];
  clients: Client[];
  /** Метки, встречающиеся в задачах, — варианты фильтра. */
  labels: string[];
  /** Сколько давно закрытых задач скрыто с доски. */
  hiddenDone: number;
  onChange: (f: TaskFilters) => void;
  /** Текущие фильтры строкой запроса — для сохранённых видов. */
  viewQuery: string;
  onApplyView: (query: string) => void;
}) {
  // На телефоне селекты свёрнуты за кнопкой «Фильтры»: иначе они съедали полэкрана над доской.
  const [open, setOpen] = useState(false);
  // Метка из ссылки могла уже исчезнуть из задач — оставляем её в списке, чтобы фильтр было видно.
  const labelOptions =
    filters.label && !labels.includes(filters.label) ? [filters.label, ...labels] : labels;
  const activeCount = [filters.assignee, filters.client, filters.priority, filters.label].filter(
    Boolean,
  ).length;

  return (
    <div className="toolbar" role="search">
      <input
        className="input toolbar-search"
        data-hotkey="search"
        aria-label="Поиск по задачам"
        placeholder="Поиск: название, описание, клиент"
        value={filters.q}
        onChange={(e) => onChange({ ...filters, q: e.target.value })}
      />
      <BoardViews current={viewQuery} canSave={isFilterActive(filters)} onApply={onApplyView} />
      <button
        type="button"
        className="btn btn-secondary btn-sm toolbar-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Фильтры{activeCount > 0 ? ` · ${activeCount}` : ''}
      </button>
      <div className={open ? 'toolbar-filters is-open' : 'toolbar-filters'}>
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
        {labelOptions.length > 0 ? (
          <select
            className="select"
            aria-label="Метка"
            value={filters.label ?? ''}
            onChange={(e) => onChange({ ...filters, label: e.target.value || null })}
          >
            <option value="">Все метки</option>
            {labelOptions.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        ) : null}
        {isFilterActive(filters) ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onChange({ ...EMPTY_FILTERS, allDone: filters.allDone })}
          >
            Сбросить
          </button>
        ) : null}
      </div>
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
