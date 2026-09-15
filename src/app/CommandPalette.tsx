import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClients } from '../shared/api/clients';
import { useDeals } from '../shared/api/deals';
import { useIdeas } from '../shared/api/ideas';
import { useTasks } from '../shared/api/tasks';
import {
  CLIENT_STATUS_LABEL,
  DEAL_STAGE_LABEL,
  IDEA_STATUS_LABEL,
  type ClientStatus,
  type DealStage,
  type IdeaStatus,
} from '../shared/lib/labels';
import { SEARCH_KIND_LABEL, searchAll, type SearchHit } from '../shared/lib/search';

const LABELS = {
  clientStatus: (s: string) => CLIENT_STATUS_LABEL[s as ClientStatus] ?? s,
  dealStage: (s: string) => DEAL_STAGE_LABEL[s as DealStage] ?? s,
  ideaStatus: (s: string) => IDEA_STATUS_LABEL[s as IdeaStatus] ?? s,
};

/** Поиск по всему из любого места: Ctrl+K или кнопка в шапке. Ищет по кешу, без запросов. */
export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  // Данные подтягиваются только когда палитра открыта — обычно они уже в кеше.
  const tasks = useTasks();
  const clients = useClients();
  const deals = useDeals();
  const ideas = useIdeas();

  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setQuery('');
      setActive(0);
    };
    window.addEventListener('open-palette', onOpen);
    return () => window.removeEventListener('open-palette', onOpen);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const hits = useMemo(
    () =>
      open
        ? searchAll(
            query,
            {
              tasks: tasks.data ?? [],
              clients: clients.data ?? [],
              deals: deals.data ?? [],
              ideas: ideas.data ?? [],
            },
            LABELS,
          )
        : [],
    [open, query, tasks.data, clients.data, deals.data, ideas.data],
  );
  const current = Math.min(active, Math.max(hits.length - 1, 0));

  const go = (hit: SearchHit) => {
    setOpen(false);
    navigate(hit.to);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive(hits.length > 0 ? (current + 1) % hits.length : 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(hits.length > 0 ? (current - 1 + hits.length) % hits.length : 0);
    } else if (e.key === 'Enter') {
      const hit = hits[current];
      if (hit) go(hit);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div className="backdrop backdrop-center palette-backdrop" onMouseDown={() => setOpen(false)}>
      <div
        className="palette"
        role="dialog"
        aria-modal="true"
        aria-label="Поиск по всему"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="input palette-input"
          placeholder="Задача, клиент, сделка, идея…"
          aria-label="Поиск по всему"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        <div className="palette-list" role="listbox">
          {query.trim() !== '' && hits.length === 0 ? (
            <p className="muted small palette-empty">Ничего не нашлось.</p>
          ) : null}
          {hits.map((hit, i) => {
            const header = hits[i - 1]?.kind !== hit.kind ? SEARCH_KIND_LABEL[hit.kind] : null;
            return (
              <div key={`${hit.kind}:${hit.id}`}>
                {header ? <div className="palette-group">{header}</div> : null}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === current}
                  className={i === current ? 'palette-item is-active' : 'palette-item'}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(hit)}
                >
                  <span className="palette-title">{hit.title}</span>
                  {hit.hint ? <span className="muted small">{hit.hint}</span> : null}
                </button>
              </div>
            );
          })}
        </div>
        <div className="palette-foot muted small">
          <kbd>↑</kbd> <kbd>↓</kbd> — выбрать, <kbd>Enter</kbd> — открыть, <kbd>Esc</kbd> — закрыть
        </div>
      </div>
    </div>
  );
}
