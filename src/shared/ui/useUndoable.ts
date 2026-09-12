import { useCallback, useEffect, useRef } from 'react';
import { useToast } from './toastContext';

type Pending = { timer: number; commit: () => void };

const UNDO_MS = 5000;

/**
 * Отложенное необратимое действие с тостом «Отменить»: элемент прячется сразу,
 * а запрос на удаление уходит через 5 секунд, если не нажали отмену.
 * При размонтировании страницы отложенные действия выполняются сразу — иначе они бы потерялись.
 */
export function useUndoable() {
  const toast = useToast();
  const pending = useRef(new Set<Pending>());

  useEffect(() => {
    const set = pending.current;
    return () => {
      for (const p of set) {
        window.clearTimeout(p.timer);
        p.commit();
      }
      set.clear();
    };
  }, []);

  return useCallback(
    (message: string, actions: { commit: () => void; undo: () => void }) => {
      const entry: Pending = {
        commit: actions.commit,
        timer: window.setTimeout(() => {
          pending.current.delete(entry);
          actions.commit();
        }, UNDO_MS),
      };
      pending.current.add(entry);
      toast.show(message, 'info', {
        ttlMs: UNDO_MS,
        action: {
          label: 'Отменить',
          onClick: () => {
            window.clearTimeout(entry.timer);
            pending.current.delete(entry);
            actions.undo();
          },
        },
      });
    },
    [toast],
  );
}
