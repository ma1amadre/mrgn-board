import type { ReactNode } from 'react';

/** Подпись + контрол + подсказка/ошибка. Контрол — единственный дочерний элемент. */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error ? (
        <span className="error">{error}</span>
      ) : hint ? (
        <span className="hint">{hint}</span>
      ) : null}
    </label>
  );
}
