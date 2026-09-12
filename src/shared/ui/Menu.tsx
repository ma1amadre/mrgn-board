import { useEffect, useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';

export type MenuItem = { key: string; label: string; onSelect: () => void };

/** Не даём событиям уйти в карточку: там на них висят drag (dnd-kit) и открытие задачи. */
const stop = (e: SyntheticEvent) => e.stopPropagation();

/** Кнопка «⋯» с выпадающим списком действий; стрелки, Enter, Escape, клик мимо закрывает. */
export function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    itemRefs.current[0]?.focus();
    const onDocDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocDown);
    return () => document.removeEventListener('mousedown', onDocDown);
  }, [open]);

  const focusItem = (i: number) => {
    const n = items.length;
    itemRefs.current[((i % n) + n) % n]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Иначе Space/Enter на карточке начнут перетаскивание, а Escape закроет карточку задачи.
    e.stopPropagation();
    if (!open) return;
    const current = itemRefs.current.findIndex((el) => el === document.activeElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusItem(current + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusItem(current - 1);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  if (items.length === 0) return null;

  return (
    <div
      ref={rootRef}
      className={open ? 'menu is-open' : 'menu'}
      onKeyDown={onKeyDown}
      onMouseDown={stop}
      onTouchStart={stop}
      onPointerDown={stop}
      onClick={stop}
    >
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-icon menu-trigger"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        ⋯
      </button>
      {open ? (
        <div className="popover" role="menu" aria-label={label}>
          {items.map((item, i) => (
            <button
              key={item.key}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              className="popover-item"
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
