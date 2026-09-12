import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GO_TARGETS, SINGLE_KEYS, letterFromCode, resolveHotkey } from '../shared/lib/hotkeys';
import { Modal } from '../shared/ui/Modal';

const PREFIX_TTL_MS = 1200;

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/** Поле поиска на текущей странице; после перехода на доску оно появляется не сразу. */
function focusSearch(attempt = 0) {
  const el = document.querySelector<HTMLInputElement>('input[data-hotkey="search"]');
  if (el) {
    el.focus();
    el.select();
  } else if (attempt < 20) {
    requestAnimationFrame(() => focusSearch(attempt + 1));
  }
}

/** Глобальные горячие клавиши: n, /, ?, g+буква. В полях ввода и с модификаторами не работают. */
export function Hotkeys() {
  const navigate = useNavigate();
  const location = useLocation();
  const [help, setHelp] = useState(false);
  const prefix = useRef<string | null>(null);
  const prefixTimer = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      if (isTyping(e.target)) return;
      // Открытый слой (карточка, окно) сам обрабатывает клавиши; глобальные там только мешают.
      if (document.querySelector('[role="dialog"], [role="alertdialog"]')) return;

      const { action, prefix: next } = resolveHotkey(prefix.current, letterFromCode(e.code, e.key));
      window.clearTimeout(prefixTimer.current);
      prefix.current = next;
      if (next)
        prefixTimer.current = window.setTimeout(() => (prefix.current = null), PREFIX_TTL_MS);
      if (!action) return;

      e.preventDefault();
      switch (action.type) {
        case 'go':
          navigate(action.to);
          break;
        case 'new': {
          const sp = new URLSearchParams(location.pathname === '/board' ? location.search : '');
          sp.set('new', '1');
          navigate(`/board?${sp.toString()}`);
          break;
        }
        case 'search':
          if (!document.querySelector('input[data-hotkey="search"]')) navigate('/board');
          focusSearch();
          break;
        case 'help':
          setHelp(true);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(prefixTimer.current);
    };
  }, [navigate, location.pathname, location.search]);

  if (!help) return null;
  return (
    <Modal title="Горячие клавиши" onClose={() => setHelp(false)}>
      <div className="stack">
        <table className="table hotkeys">
          <tbody>
            {SINGLE_KEYS.map((k) => (
              <tr key={k.key}>
                <td>
                  <kbd>{k.key}</kbd>
                </td>
                <td>{k.label}</td>
              </tr>
            ))}
            {GO_TARGETS.map((t) => (
              <tr key={t.key}>
                <td>
                  <kbd>g</kbd> <kbd>{t.key}</kbd>
                </td>
                <td>{t.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted small">Работают и в русской раскладке: важна клавиша, а не буква.</p>
      </div>
    </Modal>
  );
}
