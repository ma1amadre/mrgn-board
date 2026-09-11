type ErrorLike = { code?: string; message?: string };

/** Коды Postgres/PostgREST, которые мы ожидаем и переводим в понятный текст. */
const BY_CODE: Record<string, string> = {
  '42501': 'Недостаточно прав для этого действия',
  '23505': 'Такая запись уже есть',
  '23503': 'Нельзя удалить: есть связанные записи',
  P0002: 'Запись не найдена',
  PGRST116: 'Запись не найдена',
};

const BY_MESSAGE: Record<string, string> = {
  'Invalid login credentials': 'Неверный email или пароль',
  'Failed to fetch': 'Нет связи с сервером',
  'Email not confirmed': 'Email не подтверждён — попросите админа подтвердить аккаунт',
};

export function errorMessage(e: unknown): string {
  if (!e) return 'Неизвестная ошибка';
  if (typeof e === 'string') return e;
  const err = e as ErrorLike;
  const byCode = err.code ? BY_CODE[err.code] : undefined;
  if (byCode) return byCode;
  const byMessage = err.message ? BY_MESSAGE[err.message] : undefined;
  if (byMessage) return byMessage;
  return err.message || 'Неизвестная ошибка';
}
