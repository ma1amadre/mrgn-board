# MRGN board

Внутренний дэшборд команды: доска задач по стадиям (kanban), клиенты/проекты, воронка сделок,
банк идей с голосованием, история изменений, чек-листы, вложения и @упоминания в задачах,
команда и роли. SPA на Vite + React, данные в Supabase (Postgres + Auth + RLS + Realtime),
хостинг — GitHub Pages.

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
История изменений задачи (`task_activity`) пишется триггером при любом UPDATE задачи — клиент её
только читает, поэтому переносы через SQL или RPC тоже попадают в ленту.
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

## Уведомления в Telegram

База сама шлёт сообщения через Bot API (`pg_net`): назначение задачи, комментарий к вашей
задаче или с упоминанием `@Имя`, утренняя сводка по срокам (`pg_cron`, будни 09:00 МСК).
Настройка один раз, админом:

1. @BotFather → `/newbot`, получить токен.
2. SQL Editor: `select vault.create_secret('<токен>', 'telegram_bot_token');` — токен живёт
   в Vault, приложение его не читает.
3. В приложении: Настройки → Уведомления → юзернейм бота и адрес сайта.
4. Каждый участник: Start у бота, свой ID у @userinfobot, вписать в профиль («Команда»),
   нажать «Проверить».

Пока токена нет, отправки молча пропускаются. Состояние и последний ответ Telegram видны
на странице настроек (RPC `notify_status`).

## Горячие клавиши

`n` — новая задача, `/` — поиск на доске, `?` — подсказка, `g` и буква — переход: `o` обзор,
`b` доска, `m` мои задачи, `c` клиенты, `d` сделки, `i` идеи, `t` команда. Смотрят на физическую
клавишу, поэтому работают и в русской раскладке; в полях ввода и при открытом окне выключены.

## Мои задачи

Раздел «Мои задачи» (`/my`): открытые задачи текущего участника по корзинам срока (просрочено,
сегодня, завтра, до конца недели, позже, без срока) и полоса недели со счётом по дням; клик по дню
оставляет только его задачи, переключатель «Вся команда» показывает всех. Меню «⋯» на карточке —
то же, что на доске.

## Сделки

Воронка в разделе «Сделки»: стадии фиксированы (новая → контакт → КП → переговоры → выиграна/
проиграна), сделка привязана к клиенту, у неё сумма в рублях, ответственный и ожидаемая дата
закрытия. Колонки показывают счёт и сумму, меню «⋯» двигает по стадиям. `closed_at` ставит
триггер по стадии, как `done_at` у задач.

## Вложения

Файлы к задачам лежат в приватном бакете Storage `attachments` (создаётся миграцией
`009_attachments`, лимит 25 МБ на файл), скачиваются по подписанным ссылкам. Ключ объекта —
`task_id/uuid.ext`, исходное имя хранится в `task_attachments`. При удалении задачи строки уходят
каскадом, а файлы в бакете остаются — чистить вручную в Storage, если станет жалко места.

## Деплой (GitHub Pages)

Боевой адрес: https://ma1amadre.github.io/mrgn-board/. Workflow `.github/workflows/pages.yml`
на каждый push в `main` прогоняет тесты, собирает с `BASE_PATH=/mrgn-board/` и публикует `dist`;
`404.html` = `index.html`, поэтому прямые ссылки вида `/board?task=…` открываются.
Боевые `VITE_SUPABASE_*` лежат в `.env.production` (ключ публичный, права держит RLS).

Cloudflare Pages не подошёл: домен `pages.dev` на сети команды заблокирован (DNS подменяется,
прямое подключение режется по SNI, проверено 11.09.2026).
В Supabase: Authentication → URL Configuration → Site URL = адрес Pages.

Восстановление пароля в v1 — через администратора (Dashboard → Send password recovery).
