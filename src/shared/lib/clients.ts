export type ContactLike = {
  name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  telegram: string | null;
  is_primary: boolean;
  created_at: string;
};

/** Основной контакт: помеченный is_primary, иначе самый ранний. */
export function primaryContact<T extends ContactLike>(contacts: readonly T[]): T | undefined {
  return (
    contacts.find((c) => c.is_primary) ??
    [...contacts].sort((a, b) => a.created_at.localeCompare(b.created_at))[0]
  );
}

/** «+7 900 000-00-00 · @irina» — только способы связи, для отдельной колонки CSV. */
export function contactWays(c: ContactLike | undefined): string {
  if (!c) return '';
  return [c.phone, c.email, c.telegram ? `@${c.telegram}` : null]
    .filter((s): s is string => Boolean(s))
    .join(' · ');
}

/** «Ирина · +7 900 000-00-00 · @irina» — для таблицы; пустые части не показываем. */
export function contactLine(c: ContactLike | undefined): string {
  if (!c) return '';
  return [c.name, c.phone, c.email, c.telegram ? `@${c.telegram}` : null]
    .filter((s): s is string => Boolean(s))
    .join(' · ');
}

/** Список для селекта: текущий клиент задачи или сделки мог уйти в архив и выпасть из общего списка —
 *  оставляем его отдельным пунктом, иначе форма молча отвяжет клиента. */
export function withCurrentClient<T extends { id: string; name: string }>(
  clients: readonly T[],
  current: { id: string; name: string } | null,
): Array<T | { id: string; name: string }> {
  if (!current || clients.some((c) => c.id === current.id)) return [...clients];
  // Имени может не быть: фильтр из ссылки на клиента, у которого все задачи тоже в архиве.
  return [
    ...clients,
    { id: current.id, name: current.name ? `${current.name} (в архиве)` : 'Клиент из архива' },
  ];
}
