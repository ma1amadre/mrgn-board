import { useRef, useState, type KeyboardEvent, type SyntheticEvent } from 'react';
import type { ProfileRef } from '../api/types';
import { applyMention, findMentionQuery, matchProfiles } from '../lib/mentions';
import { Avatar } from './Avatar';

/** Textarea с подсказкой участников после «@»: стрелки и Enter/Tab выбирают, Escape прячет. */
export function MentionTextarea({
  value,
  onChange,
  profiles,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  profiles: readonly ProfileRef[];
  placeholder?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [caret, setCaret] = useState(0);
  const [active, setActive] = useState(0);
  // Escape прячет список для текущего «@»; следующий символ открывает его снова.
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);

  const query = findMentionQuery(value, caret);
  const options = query && dismissedAt !== query.start ? matchProfiles(profiles, query.query) : [];
  const current = Math.min(active, Math.max(options.length - 1, 0));

  const syncCaret = (e: SyntheticEvent<HTMLTextAreaElement>) => {
    setCaret(e.currentTarget.selectionStart ?? 0);
  };

  const pick = (name: string) => {
    if (!query) return;
    const next = applyMention(value, query, caret, name);
    onChange(next.text);
    setCaret(next.caret);
    setActive(0);
    // После выбора «@Имя » всё ещё похоже на набор имени — прячем список до следующего ввода.
    setDismissedAt(query.start);
    // Каретку можно поставить только после того, как React отрисует новое значение.
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(next.caret, next.caret);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (options.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((current + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((current - 1 + options.length) % options.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const chosen = options[current];
      if (chosen) pick(chosen.name);
    } else if (e.key === 'Escape') {
      // Иначе Escape уйдёт дальше и закроет карточку задачи целиком.
      e.preventDefault();
      e.stopPropagation();
      setDismissedAt(query?.start ?? null);
    }
  };

  return (
    <div className="mention-wrap">
      <textarea
        ref={ref}
        className="textarea"
        placeholder={placeholder}
        value={value}
        aria-autocomplete="list"
        aria-expanded={options.length > 0}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart ?? 0);
          setActive(0);
          setDismissedAt(null);
        }}
        onKeyDown={onKeyDown}
        onKeyUp={syncCaret}
        onClick={syncCaret}
      />
      {options.length > 0 ? (
        <ul className="mention-menu" role="listbox" aria-label="Кого упомянуть">
          {options.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === current}
              className={i === current ? 'mention-option is-active' : 'mention-option'}
              onMouseDown={(e) => {
                // mousedown, а не click: иначе textarea потеряет фокус раньше выбора.
                e.preventDefault();
                pick(p.name);
              }}
            >
              <Avatar name={p.name} color={p.color} />
              <span>{p.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
