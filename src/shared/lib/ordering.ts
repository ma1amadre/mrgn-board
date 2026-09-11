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
