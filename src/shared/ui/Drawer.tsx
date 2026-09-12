import { useRef, type MouseEvent, type ReactNode } from 'react';
import { useEscape } from './useEscape';
import { useFocusTrap } from './useFocusTrap';

export function Drawer({
  title,
  onClose,
  dirty = false,
  children,
}: {
  title: ReactNode;
  onClose: () => void;
  /** Идёт редактирование: клик по фону и Escape не закрывают, чтобы не потерять правки. */
  dirty?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEscape(dirty ? () => undefined : onClose);
  useFocusTrap(ref);
  const onBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !dirty) onClose();
  };
  return (
    <div className="backdrop backdrop-end" onMouseDown={onBackdrop}>
      <aside ref={ref} className="drawer" role="dialog" aria-modal="true">
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
