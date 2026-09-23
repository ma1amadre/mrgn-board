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

const RECENT_KEY = 'mrgn-palette-recent';
const RECENT_MAX = 6;

/** Последние открытые из палитры — в localStorage: пустой запрос показывает их вместо пустоты. */
function readRecent(): SearchHit[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? (list as SearchHit[]).slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function pushRecent(hit: SearchHit): void {
  try {
    const next = [hit, ...readRecent().filter((h) => h.to !== hit.to)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Приватный режим без storage: недавние просто не запомнятся.
  }
}

const LABELS = {
  clientStatus: (s: string) => CLIENT_STATUS_LABEL[s as ClientStatus] ?? s,
  dealStage: (s: string) => DEAL_STAGE_LABEL[s as DealStage] ?? s,
  ideaStatus: (s: string) => IDEA_STATUS_LABEL[s as IdeaStatus] ?? s,
};

/** Поиск по всему из любого места: Ctrl+K или кнопка в шапке. Ищет по кешу, без запросов. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('open-palette', onOpen);
    return () => window.removeEventListener('open-palette', onOpen);
  }, []);

  // Хуки данных живут в открытой палитре: закрытая не должна тянуть задачи и сделки на каждой странице.
  return open ? <PaletteDialog onClose={() => setOpen(false)} /> : null;
}

function PaletteDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [recent] = useState(readRecent);
  const inputRef = useRef<HTMLInputElement>(null);
  const tasks = useTasks();
  const clients = useClients();
  const deals = useDeals();
  const ideas = useIdeas();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const searching = query.trim() !== '';
  const hits = useMemo(
    () =>
      searching
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
        : recent,
    [searching, query, recent, tasks.data, clients.data, deals.data, ideas.data],
  );
  const current = Math.min(active, Math.max(hits.length - 1, 0));
  // На страницах без задач и сделок кеш холодный: первые секунды пустой список — это загрузка.
  const loading = tasks.isPending || clients.isPending || deals.isPending || ideas.isPending;

  const go = (hit: SearchHit) => {
    pushRecent(hit);
    onClose();
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
      onClose();
    }
  };

  return (
    <div className="backdrop backdrop-center palette-backdrop" onMouseDown={onClose}>
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
          {searching && hits.length === 0 ? (
            <p className="muted small palette-empty">
              {loading ? 'Загрузка…' : 'Ничего не нашлось.'}
            </p>
          ) : null}
          {!searching && hits.length === 0 ? (
            <p className="muted small palette-empty">
              Название задачи, клиента, сделки или идеи. Клиент находится и по имени, телефону или
              Telegram контакта.
            </p>
          ) : null}
          {!searching && hits.length > 0 ? <div className="palette-group">Недавние</div> : null}
          {hits.map((hit, i) => {
            const header =
              searching && hits[i - 1]?.kind !== hit.kind ? SEARCH_KIND_LABEL[hit.kind] : null;
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
