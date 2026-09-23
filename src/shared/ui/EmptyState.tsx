import type { ReactNode } from 'react';

/** Пустое состояние: короткая фраза и, если есть, кнопка следующего шага.
 *  inline — внутри секции карточки (без большого отступа и центрирования). */
export function EmptyState({
  children,
  action,
  inline = false,
}: {
  children: ReactNode;
  action?: ReactNode;
  inline?: boolean;
}) {
  return (
    <div className={inline ? 'empty empty-inline' : 'empty'}>
      <div>{children}</div>
      {action ? <div className="empty-action">{action}</div> : null}
    </div>
  );
}
