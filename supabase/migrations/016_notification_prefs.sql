-- 016_notification_prefs: что присылать участнику.
-- Четыре флага в профиле, по умолчанию всё включено. Первые три гасят и ленту, и Telegram —
-- «не хочу знать» значит совсем; четвёртый — только утреннюю сводку (она есть лишь в Telegram).

ALTER TABLE public.profiles
  ADD COLUMN notify_assigned BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN notify_comments BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN notify_mentions BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN notify_digest   BOOLEAN NOT NULL DEFAULT TRUE;

CREATE OR REPLACE FUNCTION public.notify(p_profile UUID, p_kind TEXT, p_title TEXT, p_body TEXT, p_link TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_profile public.profiles%ROWTYPE;
  v_icon    TEXT;
  v_wanted  BOOLEAN;
BEGIN
  IF p_profile IS NULL THEN RETURN; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = p_profile AND is_active;
  IF NOT FOUND THEN RETURN; END IF;
  -- CASE с THEN внутри условия IF ломает парсер plpgsql — считаем флаг отдельно.
  v_wanted := CASE p_kind
    WHEN 'assigned' THEN v_profile.notify_assigned
    WHEN 'mention'  THEN v_profile.notify_mentions
    ELSE v_profile.notify_comments END;
  IF NOT v_wanted THEN RETURN; END IF;

  INSERT INTO public.notifications (profile_id, kind, title, body, link)
  VALUES (p_profile, p_kind, p_title, p_body, p_link);
  IF v_profile.telegram_chat_id IS NULL THEN RETURN; END IF;
  v_icon := CASE p_kind
    WHEN 'assigned' THEN '🗂' WHEN 'mention' THEN '👋' WHEN 'idea_comment' THEN '💡' ELSE '💬' END;
  PERFORM public.telegram_send(v_profile.telegram_chat_id,
    v_icon || ' <b>' || public.html_escape(p_title) || '</b>'
    || CASE WHEN p_body IS NOT NULL AND p_body <> '' THEN E'\n' || public.html_escape(p_body) ELSE '' END
    || CASE WHEN p_link IS NOT NULL
         THEN E'\n' || '<a href="' || coalesce(public.setting('site_url'), '') || p_link || '">Открыть</a>'
         ELSE '' END);
END;
$$;

-- Утренняя сводка: как в 004, плюс проверка notify_digest.
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
  FOR p IN
    SELECT id, telegram_chat_id FROM public.profiles
    WHERE is_active AND telegram_chat_id IS NOT NULL AND notify_digest
  LOOP
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

INSERT INTO public.app_migrations (name) VALUES ('016_notification_prefs');
