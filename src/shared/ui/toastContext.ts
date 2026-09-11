import { createContext, useContext } from 'react';

export type ToastKind = 'info' | 'error' | 'success';

export type ToastApi = {
  show: (message: string, kind?: ToastKind) => void;
  /** Показать ошибку запроса, переведя код Postgres в текст. */
  error: (e: unknown) => void;
};

export const ToastContext = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast вызван вне ToastProvider');
  return ctx;
}
