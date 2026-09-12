import { useRef, type MouseEvent, type ReactNode } from 'react';
import { useEscape } from './useEscape';
import { useFocusTrap } from './useFocusTrap';

export function Modal({
  title,
  onClose,
  dirty = false,
  children,
}: {
  title: string;
  onClose: () => void;
  /** Есть несохранённый ввод: клик по фону и Escape не закрывают, только явная кнопка. */
  dirty?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEscape(dirty ? () => undefined : onClose);
  useFocusTrap(ref);
  const onBackdrop = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !dirty) onClose();
  };
  return (
    <div className="backdrop backdrop-center" onMouseDown={onBackdrop}>
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
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
      </div>
    </div>
  );
}
