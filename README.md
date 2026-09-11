# MRGN board

Внутренний дэшборд команды: доска задач по стадиям, клиенты/проекты, идеи, команда.

## Запуск

```
npm install
cp .env.example .env.local   # заполнить VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
npm run dev                  # http://127.0.0.1:5173
```

## База данных

Миграции лежат в `supabase/migrations/` и применяются по порядку номеров.

- Локально: `npx supabase start` (нужен Docker Desktop). Ключи — `npx supabase status`.
- В облаке: Supabase Dashboard → SQL Editor → выполнить файлы 001, 002, 003 по очереди,
  либо `npx supabase link` + `npx supabase db push`.

После миграций: Authentication → Providers → Email → выключить «Allow new users to sign up»;
Authentication → Users → Add user для каждого участника; первому админу —
`update public.profiles set role = 'admin' where email = '…'`.

## Деплой

Cloudflare Pages из GitHub-репозитория: build `npm run build`, output `dist`,
переменные `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `NODE_VERSION=24`.
В Supabase: Authentication → URL Configuration → Site URL = адрес Pages.
