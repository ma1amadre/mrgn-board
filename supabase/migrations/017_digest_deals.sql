-- 017_digest_deals: в утреннюю сводку добавлены сделки ответственного с датой закрытия
-- сегодня, завтра или уже прошедшей. Остальное — как в 016.

CREATE OR REPLACE FUNCTION public.notify_due_digest() RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Europe/Moscow')::date;
  v_site  TEXT := coalesce(public.setting('site_url'), '');
  v_sent  INTEGER := 0;
  p       RECORD;
  t       RECORD;
  d       RECORD;
  v_text  TEXT;
  v_lines TEXT;
  v_deals TEXT;
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

    v_deals := '';
    FOR d IN
      SELECT id, title, expected_close FROM public.deals
      WHERE owner_id = p.id AND stage NOT IN ('won', 'lost')
        AND expected_close IS NOT NULL AND expected_close <= v_today + 1
      ORDER BY expected_close, created_at
    LOOP
      v_deals := v_deals || E'\n' || CASE
          WHEN d.expected_close < v_today THEN '🔴 закрытие ' || to_char(d.expected_close, 'DD.MM')
          WHEN d.expected_close = v_today THEN '🟡 закрытие сегодня'
          ELSE '⚪ закрытие завтра' END
        || ' · <a href="' || v_site || '/deals?deal=' || d.id::text || '">' || public.html_escape(d.title) || '</a>';
    END LOOP;

    IF v_lines <> '' OR v_deals <> '' THEN
      v_text := '📅 <b>Сроки на ' || to_char(v_today, 'DD.MM') || '</b>' || v_lines
        || CASE WHEN v_deals <> '' THEN E'\n\n<b>Сделки</b>' || v_deals ELSE '' END;
      PERFORM public.telegram_send(p.telegram_chat_id, v_text);
      v_sent := v_sent + 1;
    END IF;
  END LOOP;
  RETURN v_sent;
END;
$$;

INSERT INTO public.app_migrations (name) VALUES ('017_digest_deals');
