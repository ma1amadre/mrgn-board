import { createContext, useContext } from 'react';

export type ToastKind = 'info' | 'error' | 'success';

export type ToastOptions = {
  /** Кнопка в тосте, например «Отменить». После клика тост закрывается. */
  action?: { label: string; onClick: () => void };
  ttlMs?: number;
};

export type ToastApi = {
  show: (message: string, kind?: ToastKind, options?: ToastOptions) => number;
  dismiss: (id: number) => void;
  /** Показать ошибку запроса, переведя код Postgres в текст. */
  error: (e: unknown) => void;
};

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast вызван вне ToastProvider');
  return ctx;
}
