/** Потолок совпадает с CHECK на tasks.labels (007_labels). */
export const MAX_LABELS = 10;

/**
 * Как БД нормализует метки перед записью: обрезка, без пустых и дублей, по алфавиту, не больше
 * limit. Порядок — как у glibc en_US в Postgres: латиница раньше кириллицы, строчные раньше
 * прописных. Клиент повторяет это, чтобы форма показывала ровно то, что сохранится.
 */
export function normalizeLabels(labels: readonly string[], limit = MAX_LABELS): string[] {
  const seen = new Set<string>();
  for (const raw of labels) {
    const label = raw.trim();
    if (label) seen.add(label);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, 'en')).slice(0, limit);
}

/** Все метки, которые уже встречаются в задачах, — подсказки в форме и список в фильтре. */
export function collectLabels(tasks: ReadonlyArray<{ labels: string[] }>): string[] {
  return normalizeLabels(
    tasks.flatMap((t) => t.labels),
    Infinity,
  );
}
