import { createContext, useContext } from 'react';

export type ConfirmOptions = {
  title: string;
  text?: string;
  confirmLabel?: string;
  /** Красная кнопка для необратимых действий. */
  danger?: boolean;
};

export type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Диалог подтверждения вместо window.confirm: в стиле приложения и с фокусом на «Отмена». */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm вызван вне ConfirmProvider');
  return ctx;
}
