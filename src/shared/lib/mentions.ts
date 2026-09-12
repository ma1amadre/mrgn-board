export type MentionQuery = { start: number; query: string };

/** Сколько символов после «@» ещё считаем набираемым именем. */
const MAX_QUERY = 40;

/**
 * Незакрытое упоминание перед кареткой: «@» в начале текста или после пробела, дальше до каретки —
 * набранная часть имени (пробелы допустимы: имена из двух слов). Перенос строки закрывает набор.
 */
export function findMentionQuery(text: string, caret: number): MentionQuery | null {
  const before = text.slice(0, caret);
  const at = before.lastIndexOf('@');
  if (at < 0) return null;
  if (at > 0 && !/\s/.test(before.charAt(at - 1))) return null;
  const query = before.slice(at + 1);
  if (query.length > MAX_QUERY || query.includes('\n')) return null;
  return { start: at, query };
}

/** Сначала имена, начинающиеся с набранного, потом содержащие его. Без учёта регистра. */
export function matchProfiles<T extends { name: string }>(
  profiles: readonly T[],
  query: string,
  limit = 6,
): T[] {
  const q = query.trim().toLowerCase();
  const starts: T[] = [];
  const contains: T[] = [];
  for (const p of profiles) {
    const name = p.name.toLowerCase();
    if (name.startsWith(q)) starts.push(p);
    else if (name.includes(q)) contains.push(p);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** Заменяет набранное «@зап» на «@Имя » и возвращает новую позицию каретки. */
export function applyMention(
  text: string,
  m: MentionQuery,
  caret: number,
  name: string,
): { text: string; caret: number } {
  const insert = `@${name} `;
  return {
    text: text.slice(0, m.start) + insert + text.slice(caret),
    caret: m.start + insert.length,
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Регэксп упоминаний известных имён с одной захватывающей группой (для String.split).
 * Длинные имена раньше, чтобы «@Алик Г.» не обрезалось до «@Алик»; после имени не может идти
 * буква или цифра — иначе «@Алик» нашёлся бы внутри «@Аликс».
 */
export function mentionPattern(names: readonly string[]): RegExp | null {
  const escaped = [...new Set(names)]
    .filter((n) => n.trim() !== '')
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  if (escaped.length === 0) return null;
  return new RegExp(`(@(?:${escaped.join('|')}))(?![\\p{L}\\p{N}_])`, 'u');
}

/** Какие из известных имён упомянуты в тексте (каждое один раз, в порядке появления). */
export function extractMentions(text: string, names: readonly string[]): string[] {
  const re = mentionPattern(names);
  if (!re) return [];
  const found: string[] = [];
  for (const part of text.split(re)) {
    if (part.startsWith('@') && names.includes(part.slice(1)) && !found.includes(part.slice(1))) {
      found.push(part.slice(1));
    }
  }
  return found;
}
