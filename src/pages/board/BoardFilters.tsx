import { useState } from 'react';
import type { ClientRef, Profile } from '../../shared/api/types';
import {
  DUE_FILTERS,
  DUE_FILTER_LABEL,
  EMPTY_FILTERS,
  UNASSIGNED,
  isFilterActive,
  type DueFilter,
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
  clients: ClientRef[];
  /** Метки, встречающиеся в задачах, — варианты фильтра. */
  labels: string[];
  /** Сколько давно закрытых задач скрыто с доски. */
  hiddenDone: number;
  onChange: (f: TaskFilters) => void;
  /** Текущие фильтры строкой запроса — для сохранённых видов. */
  viewQuery: string;
  onApplyView: (query: string) => void;
}) {
  // Исполнитель и клиент нужны каждый день и стоят на виду; приоритет, срок и метки — за кнопкой
  // «Фильтры» на любом экране: семь контролов в ряд не помещались даже на 1440.
  const secondaryCount = [filters.priority, filters.label, filters.due].filter(Boolean).length;
  const [open, setOpen] = useState(secondaryCount > 0);
  // Метка из ссылки могла уже исчезнуть из задач — оставляем её в списке, чтобы фильтр было видно.
  const labelOptions =
    filters.label && !labels.includes(filters.label) ? [filters.label, ...labels] : labels;

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
      <button
        type="button"
        className="btn btn-secondary btn-sm toolbar-toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Фильтры{secondaryCount > 0 ? ` · ${secondaryCount}` : ''}
      </button>
      <div className={open ? 'toolbar-filters is-open' : 'toolbar-filters'}>
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
        <select
          className="select"
          aria-label="Срок"
          value={filters.due ?? ''}
          onChange={(e) =>
            onChange({ ...filters, due: (e.target.value || null) as DueFilter | null })
          }
        >
          <option value="">Любой срок</option>
          {DUE_FILTERS.map((d) => (
            <option key={d} value={d}>
              {DUE_FILTER_LABEL[d]}
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
