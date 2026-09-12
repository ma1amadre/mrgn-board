-- 004_notifications: Telegram-уведомления из базы (pg_net), настройки приложения, chat_id в профиле.
-- Токен бота лежит в Vault под именем telegram_bot_token — его кладёт админ руками:
--   select vault.create_secret('<токен от BotFather>', 'telegram_bot_token');
-- Пока токена нет, все отправки молча пропускаются.

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.profiles ADD COLUMN telegram_chat_id BIGINT;
COMMENT ON COLUMN public.profiles.telegram_chat_id IS 'Куда бот шлёт уведомления; участник вписывает сам после /start боту.';

-- ─── Настройки приложения ───
CREATE TABLE public.app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.app_settings IS 'Пары ключ-значение: site_url (для ссылок в уведомлениях), telegram_bot (юзернейм бота).';
CREATE TRIGGER trg_app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_settings: select" ON public.app_settings
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "app_settings: insert" ON public.app_settings
  FOR INSERT WITH CHECK ((select public.is_admin()));
CREATE POLICY "app_settings: update" ON public.app_settings
  FOR UPDATE USING ((select public.is_admin()));

INSERT INTO public.app_settings (key, value) VALUES
  ('site_url', 'https://ma1amadre.github.io/mrgn-board'),
  ('telegram_bot', '');

ALTER PUBLICATION supabase_realtime ADD TABLE public.app_settings;

-- ─── Отправка ───
CREATE OR REPLACE FUNCTION public.html_escape(p TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$$;

CREATE OR REPLACE FUNCTION public.setting(p_key TEXT) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT value FROM public.app_settings WHERE key = p_key;
$$;

-- Асинхронный POST в Bot API. DEFINER: читает Vault, куда у клиентов доступа нет.
CREATE OR REPLACE FUNCTION public.telegram_send(p_chat_id BIGINT, p_text TEXT) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_token TEXT;
BEGIN
  IF p_chat_id IS NULL THEN RETURN; END IF;
  SELECT decrypted_secret INTO v_token
  FROM vault.decrypted_secrets WHERE name = 'telegram_bot_token' LIMIT 1;
  IF v_token IS NULL OR v_token = '' THEN RETURN; END IF;
  PERFORM net.http_post(
    url     := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    body    := jsonb_build_object(
                 'chat_id', p_chat_id,
                 'text', p_text,
                 'parse_mode', 'HTML',
                 'disable_web_page_preview', true),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.telegram_send(BIGINT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.setting(TEXT) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.task_link(p_task_id UUID) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.setting('site_url'), '') || '/board?task=' || p_task_id::text;
$$;

-- ─── Событие: назначили задачу ───
CREATE OR REPLACE FUNCTION public.notify_task_assigned() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_chat  BIGINT;
  v_actor TEXT;
BEGIN
  IF NEW.assignee_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.assignee_id IS NOT DISTINCT FROM OLD.assignee_id THEN RETURN NEW; END IF;
  -- Сам себе назначил — не дёргаем.
  IF NEW.assignee_id = auth.uid() THEN RETURN NEW; END IF;
  SELECT telegram_chat_id INTO v_chat FROM public.profiles WHERE id = NEW.assignee_id AND is_active;
  IF v_chat IS NULL THEN RETURN NEW; END IF;
  SELECT name INTO v_actor FROM public.profiles WHERE id = auth.uid();
  PERFORM public.telegram_send(v_chat,
    '🗂 <b>' || public.html_escape(coalesce(v_actor, 'Кто-то')) || '</b> назначил(а) вам задачу' || E'\n'
    || '<a href="' || public.task_link(NEW.id) || '">' || public.html_escape(NEW.title) || '</a>'
    || CASE WHEN NEW.due_date IS NOT NULL THEN E'\nСрок: ' || to_char(NEW.due_date, 'DD.MM') ELSE '' END);
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_task_assigned AFTER INSERT OR UPDATE OF assignee_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assigned();

-- ─── Событие: новый комментарий ───
-- Получатели: исполнитель и автор задачи, кроме того, кто написал.
CREATE OR REPLACE FUNCTION public.notify_comment() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task   public.tasks%ROWTYPE;
  v_author TEXT;
  v_text   TEXT;
  r        RECORD;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id = NEW.task_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT name INTO v_author FROM public.profiles WHERE id = NEW.author_id;
  v_text := '💬 <b>' || public.html_escape(coalesce(v_author, 'Кто-то')) || '</b> · '
    || '<a href="' || public.task_link(v_task.id) || '">' || public.html_escape(v_task.title) || '</a>' || E'\n'
    || public.html_escape(left(NEW.body, 400)) || CASE WHEN length(NEW.body) > 400 THEN '…' ELSE '' END;
  FOR r IN
    SELECT DISTINCT p.telegram_chat_id
    FROM public.profiles p
    WHERE p.id IN (v_task.assignee_id, v_task.created_by)
      AND p.id <> NEW.author_id
      AND p.is_active
      AND p.telegram_chat_id IS NOT NULL
  LOOP
    PERFORM public.telegram_send(r.telegram_chat_id, v_text);
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_comment AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_comment();

-- ─── Утренняя сводка по срокам (будни, 09:00 МСК) ───
CREATE OR REPLACE FUNCTION public.notify_due_digest() RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Europe/Moscow')::date;
  v_sent  INTEGER := 0;
  p       RECORD;
  t       RECORD;
  v_text  TEXT;
  v_lines TEXT;
BEGIN
  FOR p IN SELECT id, telegram_chat_id FROM public.profiles WHERE is_active AND telegram_chat_id IS NOT NULL LOOP
    v_lines := '';
    FOR t IN
      SELECT id, title, due_date FROM public.tasks
      WHERE assignee_id = p.id AND done_at IS NULL AND due_date IS NOT NULL AND due_date <= v_today + 1
      ORDER BY due_date, created_at
    LOOP
      v_lines := v_lines || E'\n' || CASE
          WHEN t.due_date < v_today THEN '🔴 просрочено ' || to_char(t.due_date, 'DD.MM')
          WHEN t.due_date = v_today THEN '🟡 сегодня'
          ELSE '⚪ завтра' END
        || ' · <a href="' || public.task_link(t.id) || '">' || public.html_escape(t.title) || '</a>';
    END LOOP;
    IF v_lines <> '' THEN
      v_text := '📅 <b>Сроки на ' || to_char(v_today, 'DD.MM') || '</b>' || v_lines;
      PERFORM public.telegram_send(p.telegram_chat_id, v_text);
      v_sent := v_sent + 1;
    END IF;
  END LOOP;
  RETURN v_sent;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_due_digest() FROM PUBLIC, anon, authenticated;

-- 06:00 UTC = 09:00 МСК, по будням. Повторный запуск миграции перезапишет расписание с тем же именем.
SELECT cron.schedule('mrgn-board-due-digest', '0 6 * * 1-5', $$SELECT public.notify_due_digest()$$);

-- ─── RPC для участника: проверить связь ───
CREATE OR REPLACE FUNCTION public.notify_test() RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_chat  BIGINT;
  v_token TEXT;
BEGIN
  SELECT telegram_chat_id INTO v_chat FROM public.profiles WHERE id = auth.uid();
  IF v_chat IS NULL THEN RETURN 'no_chat_id'; END IF;
  SELECT decrypted_secret INTO v_token FROM vault.decrypted_secrets WHERE name = 'telegram_bot_token' LIMIT 1;
  IF v_token IS NULL OR v_token = '' THEN RETURN 'no_token'; END IF;
  PERFORM public.telegram_send(v_chat, '✅ Связь с MRGN board работает. Сюда будут приходить назначения, комментарии и утренняя сводка по срокам.');
  RETURN 'sent';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_test() FROM PUBLIC, anon;

-- ─── RPC для админа: состояние настройки ───
CREATE OR REPLACE FUNCTION public.notify_status() RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_token_set BOOLEAN;
  v_cron      BOOLEAN;
  v_last      RECORD;
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'admin only' USING ERRCODE = '42501'; END IF;
  SELECT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'telegram_bot_token' AND decrypted_secret <> '') INTO v_token_set;
  SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mrgn-board-due-digest') INTO v_cron;
  SELECT status_code, content::text AS content, created INTO v_last
  FROM net._http_response ORDER BY id DESC LIMIT 1;
  RETURN jsonb_build_object(
    'token_set', v_token_set,
    'digest_scheduled', v_cron,
    'linked_profiles', (SELECT count(*) FROM public.profiles WHERE telegram_chat_id IS NOT NULL),
    'last_status', v_last.status_code,
    'last_response', left(v_last.content, 300),
    'last_at', v_last.created
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_status() FROM PUBLIC, anon;

INSERT INTO public.app_migrations (name) VALUES ('004_notifications');
