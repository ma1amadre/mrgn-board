/** Шаг между соседями при вставке в край колонки. */
export const GAP = 1024;

/** Ниже этого зазора float64 перестаёт надёжно различать соседей — колонку пора перенумеровать. */
export const MIN_GAP = 1e-6;

/** Позиция карточки между prev и next; undefined — край колонки. */
export function computePosition(prev: number | undefined, next: number | undefined): number {
  if (prev === undefined) return next === undefined ? GAP : next - GAP;
  if (next === undefined) return prev + GAP;
  return (prev + next) / 2;
}

/** Зазор между соседями исчерпан — перед вставкой нужен renumber_stage. */
export function needsRenumber(prev: number | undefined, next: number | undefined): boolean {
  if (prev === undefined || next === undefined) return false;
  return Math.abs(next - prev) < MIN_GAP;
}

export type Neighbors = { prev: number | undefined; next: number | undefined };

/**
 * Реальные соседи для вставки. На доске могут быть скрытые фильтром карточки, поэтому
 * видимые соседи (prevId/nextId) — только ориентир: карточка встаёт сразу после видимого
 * prev (или сразу перед видимым next), а второй сосед берётся из полного списка колонки.
 * `sorted` — все карточки колонки по position, без переносимой.
 */
export function neighborPositions<T extends { id: string; position: number }>(
  sorted: T[],
  prevId: string | undefined,
  nextId: string | undefined,
): Neighbors {
  if (prevId !== undefined) {
    const i = sorted.findIndex((t) => t.id === prevId);
    if (i >= 0) return { prev: sorted[i]?.position, next: sorted[i + 1]?.position };
  }
  if (nextId !== undefined) {
    const i = sorted.findIndex((t) => t.id === nextId);
    if (i >= 0) return { prev: sorted[i - 1]?.position, next: sorted[i]?.position };
  }
  // Видимых соседей нет: в конец колонки, за скрытыми карточками.
  return { prev: sorted[sorted.length - 1]?.position, next: undefined };
}
