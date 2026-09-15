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

/** «Ирина · +7 900 000-00-00 · @irina» — для таблицы и CSV; пустые части не показываем. */
export function contactLine(c: ContactLike | undefined): string {
  if (!c) return '';
  return [c.name, c.phone, c.email, c.telegram ? `@${c.telegram}` : null]
    .filter((s): s is string => Boolean(s))
    .join(' · ');
}
