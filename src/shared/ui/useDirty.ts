import { useEffect } from 'react';

/** Сообщает наверх, отличаются ли значения формы от исходных — слой не закроется по клику мимо. */
export function useDirty<T>(
  values: T,
  initial: T,
  onDirtyChange: ((dirty: boolean) => void) | undefined,
): void {
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  useEffect(() => {
    onDirtyChange?.(dirty);
    return () => onDirtyChange?.(false);
  }, [dirty, onDirtyChange]);
}
