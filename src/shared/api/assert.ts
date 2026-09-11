/** RLS молча отфильтровывает недоступные строки: UPDATE/DELETE без ошибки, но с нулём строк.
 *  Просим `.select('id')` и проверяем, что что-то изменилось. */
export function assertAffected(
  rows: unknown[] | null,
  what = 'Недостаточно прав для этого действия',
): void {
  if (!rows || rows.length === 0) throw new Error(what);
}
