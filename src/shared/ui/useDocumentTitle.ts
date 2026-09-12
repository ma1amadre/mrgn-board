import { useEffect } from 'react';

const APP = 'MRGN board';

/** Заголовок вкладки: «Раздел · MRGN board», чтобы вкладки и история различались. */
export function useDocumentTitle(title: string | null | undefined): void {
  useEffect(() => {
    // Вложенные слои (шторка задачи поверх доски) возвращают заголовок родителя, а не пустой.
    const previous = document.title;
    document.title = title ? `${title} · ${APP}` : APP;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
