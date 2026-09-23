# mrgn-board

Дэшборд команды MRGN: задачи по стадиям, клиенты/проекты, идеи, команда. SPA на Vite + React,
данные в Supabase (Postgres + Auth + RLS + Realtime). Общие привычки — в `D:\work\code\CLAUDE.md`.

## Стек и команды

- TypeScript 6 (strict, noUncheckedIndexedAccess), React 19, Vite 8, node 24. Пакеты — npm.
- `npm run dev` — 127.0.0.1:5173. `npm run build` = `tsc -b && vite build`: типы гейтят сборку.
- `npm test` — Vitest, только чистая логика (`src/shared/lib/*.test.ts`), без DOM.
- `npm run lint` — oxlint (`.oxlintrc.json`). `npm run format` — prettier.
- Git: одна ветка `main`, коммит на каждый milestone, push только по команде пользователя.

## Данные

- Миграции — `supabase/migrations/NNN_name.sql`, применяются строго по порядку. Локально —
  `npx supabase start` (нужен Docker Desktop), в облаке — SQL editor или `npx supabase db push`.
  Каждая миграция пишет строку в `app_migrations` — по ней приложение видит, что применено.
- Типы БД — `src/shared/supabase/database.types.ts`, генерируются командой
  `npx supabase gen types typescript --local > src/shared/supabase/database.types.ts`. Руками не править.
- Граница доступа — RLS и триггеры в БД. UI прячет кнопки, но не защищает.
- В SECURITY DEFINER функциях пользователь берётся только из `auth.uid()`; параметров с uid нет.

## Стиль

- `src/styles/tokens.css` и `components.css` — копии из `D:\dev\design-kit`. Здесь не править,
  синхронизировать оттуда. В разметке — роли (`--surface`, `--text-muted`), не ступени палитры.
- Свои классы — в `app.css`, только на токенах. Тень — только у всплывающих слоёв.

## Грабли

- Vite слушает 127.0.0.1 (на Windows `localhost` может уйти на ::1).
- Vite может отдать старую версию файла после правки на месте (perl -i, Write): `touch` файла
  чинит; проверять через `curl http://127.0.0.1:5173/src/…` перед тем, как искать баг в коде.
- Исполнители задачи — таблица `task_assignees` (028), колонки `tasks.assignee_id` больше нет:
  в embed `assignees:task_assignees(profile:profiles(id,name,color))`, в кеше задача несёт
  `assignees` и `assignee_ids`. Назначение меняется только через `setAssignees` (диф вставок и
  удалений): уведомление и история вешаются на строки `task_assignees`, а не на задачу.
- `.env.local` не коммитится; в клиент попадает только anon-ключ. Service key — только в
  `scripts/` против локального стека.
- `.ps1` с кириллицей — UTF-8 с BOM (PowerShell 5.1).
- `idea_votes` — junction-таблица, поэтому у `ideas` два пути к `profiles`: в embed автора нужен
  хинт `profiles!ideas_author_id_fkey`, иначе PostgREST отвечает 300.
- Функции получают EXECUTE для PUBLIC по умолчанию: закрывать RPC от anon через
  `REVOKE ... FROM PUBLIC, anon`, одного `FROM anon` мало.
- Новый профиль создаётся с `is_active = false` — иначе саморегистрация через anon-ключ (если её
  забыли выключить в облаке) давала бы полный доступ. Первого админа включать SQL-ом.
- Owner-колонки (`created_by`, `author_id`, `idea_id`, `task_id`) и `done_at` защищены триггерами,
  а не RLS: WITH CHECK не видит старую строку.
- `task_activity` заполняет только триггер `tasks_log_activity` (SECURITY DEFINER): у таблицы нет
  INSERT-политик, значения в строке — подписи на момент изменения, а не id. Новый отслеживаемый
  столбец задачи = новая ветка в триггере, новый `kind` в CHECK и в `describeActivity`.
- Ключи Storage — только ASCII (латиница, цифры, `/`, `-`, `.`): файл лежит под `task_id/uuid.ext`,
  а имя — в `task_attachments`. Удалять вложение только через `deleteAttachment` (сначала файл,
  потом строка); каскад при удалении задачи файлы не трогает.

## gstack

Скиллы gstack вызывать через Skill, когда запрос подходит под шаблон:
- баг, «не работает», «почему сломалось» → `/investigate`
- протестировать сайт, найти баги, «проверь деплой» → `/qa` (только отчёт без правок — `/qa-only`)
- ревью кода, «посмотри мои изменения» → `/review`
- визуальный аудит живого сайта, «выглядит криво» → `/design-review`
- аудит developer experience, README/онбординг → `/devex-review`
- оформить задачу/тикет, «распиши спеку» → `/spec`
- «стоит ли это делать», обсуждение идеи → `/office-hours`
- стратегия и объём плана → `/plan-ceo-review`; архитектура плана → `/plan-eng-review`; дизайн плана → `/plan-design-review`
- выкатить, «отправляй», PR → `/ship`; пост-деплой мониторинг → `/canary`
- безопасность, «это безопасно?» → `/cso`
- сохранить/восстановить контекст → `/context-save` / `/context-restore`
