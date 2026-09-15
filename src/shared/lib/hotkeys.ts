export type HotkeyAction =
  { type: 'go'; to: string } | { type: 'new' } | { type: 'search' } | { type: 'help' };

/** Вторая клавиша после «g»: куда перейти. */
export const GO_TARGETS: ReadonlyArray<{ key: string; to: string; label: string }> = [
  { key: 'o', to: '/', label: 'Обзор' },
  { key: 'b', to: '/board', label: 'Доска' },
  { key: 'm', to: '/my', label: 'Мои задачи' },
  { key: 'c', to: '/clients', label: 'Клиенты' },
  { key: 'd', to: '/deals', label: 'Сделки' },
  { key: 'i', to: '/ideas', label: 'Идеи' },
  { key: 'r', to: '/reports', label: 'Отчёты' },
  { key: 't', to: '/team', label: 'Команда' },
];

export const SINGLE_KEYS: ReadonlyArray<{ key: string; label: string }> = [
  { key: 'Ctrl K', label: 'Поиск по задачам, клиентам, сделкам и идеям' },
  { key: 'n', label: 'Новая задача' },
  { key: '/', label: 'Поиск на доске' },
  { key: '?', label: 'Эта подсказка' },
  { key: 'Esc', label: 'Закрыть карточку или окно' },
];

/**
 * Разбор нажатия с учётом префикса «g»: возвращает действие (или null) и новый префикс.
 * Раскладка не важна: сравниваем e.code-подобные латинские буквы, которые передаёт вызывающий.
 */
export function resolveHotkey(
  prefix: string | null,
  key: string,
): { action: HotkeyAction | null; prefix: string | null } {
  if (prefix === 'g') {
    const target = GO_TARGETS.find((t) => t.key === key);
    return { action: target ? { type: 'go', to: target.to } : null, prefix: null };
  }
  switch (key) {
    case 'g':
      return { action: null, prefix: 'g' };
    case 'n':
      return { action: { type: 'new' }, prefix: null };
    case '/':
      return { action: { type: 'search' }, prefix: null };
    case '?':
      return { action: { type: 'help' }, prefix: null };
    default:
      return { action: null, prefix: null };
  }
}

/** Буква по физической клавише, чтобы «g b» работало и в русской раскладке (KeyG → g). */
export function letterFromCode(code: string, key: string): string {
  const m = /^Key([A-Z])$/.exec(code);
  if (m?.[1]) return m[1].toLowerCase();
  if (code === 'Slash') return key === '?' ? '?' : '/';
  return key;
}
