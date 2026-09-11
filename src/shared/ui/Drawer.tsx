import type { MouseEvent, ReactNode } from 'react';
import { useEscape } from './useEscape';

export function Drawer({
  title,
  onClose,
  children,
}: {
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  useEscape(onClose);
  const onBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };
  return (
    <div className="backdrop backdrop-end" onMouseDown={onBackdrop}>
      <aside className="drawer" role="dialog" aria-modal="true">
        <div className="drawer-head">
          <div className="grow">{title}</div>
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
}
