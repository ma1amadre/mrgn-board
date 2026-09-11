# MRGN board

Внутренний дэшборд команды: доска задач по стадиям (kanban), клиенты/проекты, банк идей с
голосованием, команда и роли. SPA на Vite + React, данные в Supabase (Postgres + Auth + RLS +
Realtime), хостинг — GitHub Pages.

## Запуск

```
npm install
cp .env.example .env.local   # VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY
npm run dev                  # http://127.0.0.1:5173
```

`npm run build` — сборка с проверкой типов, `npm test` — юнит-тесты логики, `npm run lint`.

## Локальная разработка (Docker)

Нужен запущенный Docker Desktop.

```
npx supabase start            # первый раз тянет образы; миграции применяются сами
npx supabase status -o env    # API_URL → VITE_SUPABASE_URL, ANON_KEY → VITE_SUPABASE_ANON_KEY
```

Стек живёт на портах 56321 (API), 56322 (Postgres), 56323 (Studio), 56324 (почта): диапазон
54xxx по умолчанию на этой машине зарезервирован Windows (`netsh interface ipv4 show
excludedportrange protocol=tcp`).

Тестовые пользователи (только локально, через service role):

```
set -a; . <(npx supabase status -o env); set +a; node scripts/local-users.mjs
docker exec -i supabase_db_mrgn-board psql -U postgres -d postgres \
  -c "update public.profiles set is_active = true;" \
  -c "update public.profiles set role = 'admin' where email = 'admin@local.test';"
```

| Email             | Пароль         | Роль   |
| ----------------- | -------------- | ------ |
| admin@local.test  | local-admin-1  | admin  |
| member@local.test | local-member-1 | member |
| third@local.test  | local-third-1  | member |

- `npx supabase db reset` — пересобрать локальную БД из миграций с нуля (данные и пользователи
  пропадут, скрипт выше запустить заново).
- Типы БД: `npx supabase gen types typescript --local > src/shared/supabase/database.types.ts`.

## База данных

Миграции — `supabase/migrations/`, применяются по порядку номеров; каждая пишет строку в
`public.app_migrations` (админ видит предупреждение в шапке, если база отстаёт от кода).
Права — только RLS и триггеры (`002_rls.sql`): участник видит всё, правит задачи/идеи/клиентов,
удаляет только своё; админ управляет стадиями, ролями и доступом, удаляет клиентов.
Новый аккаунт создаётся выключенным (`is_active = false`) и видит только экран «Доступ не
включён», пока админ не включит его в разделе «Команда».

## Облако: чек-лист первого запуска

1. Создать проект Supabase. SQL Editor → выполнить `001_schema.sql`, `002_rls.sql`,
   `003_seed_realtime.sql` по очереди (или `npx supabase login` → `link` → `db push`).
2. Authentication → Providers → Email: выключить «Allow new users to sign up».
3. Authentication → Users → Add user (email + пароль, auto-confirm) для каждого участника.
   Имя подхватится из metadata `name`, иначе из email — поправить в разделе «Команда».
4. Первый админ: SQL Editor →
   `update public.profiles set role = 'admin', is_active = true where email = '…';`
   Остальных админ включает в разделе «Команда» (новые аккаунты выключены по умолчанию).
5. Проверка: войти админом — в шапке нет предупреждения о неприменённых миграциях.

## Деплой (GitHub Pages)

Боевой адрес: https://ma1amadre.github.io/mrgn-board/. Workflow `.github/workflows/pages.yml`
на каждый push в `main` прогоняет тесты, собирает с `BASE_PATH=/mrgn-board/` и публикует `dist`;
`404.html` = `index.html`, поэтому прямые ссылки вида `/board?task=…` открываются.
Боевые `VITE_SUPABASE_*` лежат в `.env.production` (ключ публичный, права держит RLS).

Cloudflare Pages не подошёл: домен `pages.dev` на сети команды заблокирован (DNS подменяется,
прямое подключение режется по SNI, проверено 11.09.2026).
В Supabase: Authentication → URL Configuration → Site URL = адрес Pages.

Восстановление пароля в v1 — через администратора (Dashboard → Send password recovery).
