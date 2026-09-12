import { useCallback, useSyncExternalStore } from 'react';

export type Theme = 'system' | 'light' | 'dark';

/** Тот же ключ читает инлайн-скрипт в index.html, чтобы тема применилась до первой отрисовки. */
export const THEME_KEY = 'mrgn-theme';

export const THEME_LABEL: Record<Theme, string> = {
  system: 'как в системе',
  light: 'светлая',
  dark: 'тёмная',
};

export function parseTheme(value: string | null | undefined): Theme {
  return value === 'light' || value === 'dark' ? value : 'system';
}

/** Порядок переключения одной кнопкой: система → светлая → тёмная → система. */
export function nextTheme(current: Theme): Theme {
  return current === 'system' ? 'light' : current === 'light' ? 'dark' : 'system';
}

/** tokens.css: data-theme="dark"/"light" перекрывает системную схему, без атрибута — как в ОС. */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
}

function readStored(): Theme {
  try {
    return parseTheme(localStorage.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, readStored, () => 'system' as Theme);
  const set = useCallback((next: Theme) => {
    try {
      if (next === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      // Приватный режим без storage: тема применится только до перезагрузки.
    }
    applyTheme(next);
    for (const fn of listeners) fn();
  }, []);
  return [theme, set];
}
