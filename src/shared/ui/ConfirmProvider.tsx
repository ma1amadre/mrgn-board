import { useCallback, useRef, useState, type ReactNode } from 'react';
import { ConfirmContext, type ConfirmFn, type ConfirmOptions } from './confirmContext';
import { useEscape } from './useEscape';
import { useFocusTrap } from './useFocusTrap';

type Pending = { options: ConfirmOptions; resolve: (ok: boolean) => void };

function ConfirmDialog({ pending, onDone }: { pending: Pending; onDone: (ok: boolean) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEscape(() => onDone(false));
  useFocusTrap(ref);
  const { title, text, confirmLabel = 'Удалить', danger = true } = pending.options;
  return (
    <div className="backdrop backdrop-center">
      <div
        ref={ref}
        className="modal"
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        style={{ maxWidth: 420 }}
      >
        <h3>{title}</h3>
        {text ? <p className="muted">{text}</p> : null}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => onDone(false)}>
            Отмена
          </button>
          <button
            type="button"
            className={danger ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={() => onDone(true)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    // Второй запрос поверх открытого — отвечаем «нет» первому, чтобы промис не завис.
    pendingRef.current?.resolve(false);
    return new Promise<boolean>((resolve) => {
      const next = { options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const done = (ok: boolean) => {
    pendingRef.current?.resolve(ok);
    pendingRef.current = null;
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending ? <ConfirmDialog pending={pending} onDone={done} /> : null}
    </ConfirmContext.Provider>
  );
}
