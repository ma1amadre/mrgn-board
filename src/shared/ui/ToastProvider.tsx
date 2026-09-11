import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { errorMessage } from '../api/errors';
import { ToastContext, type ToastApi, type ToastKind } from './toastContext';

type ToastItem = { id: number; message: string; kind: ToastKind };

const TTL_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);
  const timers = useRef(new Set<number>());

  useEffect(() => {
    const pending = timers.current;
    return () => {
      for (const t of pending) window.clearTimeout(t);
      pending.clear();
    };
  }, []);

  const show = useCallback((message: string, kind: ToastKind = 'info') => {
    seq.current += 1;
    const id = seq.current;
    setItems((xs) => [...xs, { id, message, kind }]);
    const timer = window.setTimeout(() => {
      timers.current.delete(timer);
      setItems((xs) => xs.filter((x) => x.id !== id));
    }, TTL_MS);
    timers.current.add(timer);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ show, error: (e) => show(errorMessage(e), 'error') }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
