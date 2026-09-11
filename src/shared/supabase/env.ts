/** Переменные окружения клиента. Без них приложение показывает экран настройки, а не белую страницу. */
export const env = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? '',
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? '',
};

export const envError: string | null =
  env.supabaseUrl && env.supabaseAnonKey
    ? null
    : 'Не заданы VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY: скопируйте .env.example в .env.local и перезапустите dev-сервер.';
