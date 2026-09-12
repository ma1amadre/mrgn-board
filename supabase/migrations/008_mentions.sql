-- 008_mentions: упоминания @Имя в комментариях.
-- Упомянутый получает уведомление, даже если он не исполнитель и не автор задачи.
-- Адрес — само имя профиля после «@»: без справочника токенов и без id в тексте,
-- совпадение по подстроке (strpos), поэтому имена с пробелами работают как есть.

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
  v_text := '<b>' || public.html_escape(coalesce(v_author, 'Кто-то')) || '</b> · '
    || '<a href="' || public.task_link(v_task.id) || '">' || public.html_escape(v_task.title) || '</a>' || E'\n'
    || public.html_escape(left(NEW.body, 400)) || CASE WHEN length(NEW.body) > 400 THEN '…' ELSE '' END;
  FOR r IN
    SELECT p.telegram_chat_id,
           bool_or(strpos(NEW.body, '@' || p.name) > 0) AS mentioned
    FROM public.profiles p
    WHERE p.id <> NEW.author_id
      AND p.is_active
      AND p.telegram_chat_id IS NOT NULL
      AND (p.id IN (v_task.assignee_id, v_task.created_by) OR strpos(NEW.body, '@' || p.name) > 0)
    GROUP BY p.telegram_chat_id
  LOOP
    PERFORM public.telegram_send(r.telegram_chat_id,
      CASE WHEN r.mentioned THEN '👋 ' ELSE '💬 ' END || v_text);
  END LOOP;
  RETURN NEW;
END;
$$;

INSERT INTO public.app_migrations (name) VALUES ('008_mentions');
