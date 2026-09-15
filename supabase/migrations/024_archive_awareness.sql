-- 024_archive_awareness: архив (022) учитывают фоновые функции.
-- Утренняя сводка показывала архивные просроченные задачи, а правила повторения создавали задачи
-- для архивных клиентов и на выключенных участников.

CREATE OR REPLACE FUNCTION public.notify_due_digest()
RETURNS INTEGER
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
      WHERE assignee_id = p.id AND done_at IS NULL AND archived_at IS NULL
        AND due_date IS NOT NULL AND due_date <= v_today + 1
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

CREATE OR REPLACE FUNCTION public.spawn_recurring_tasks()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today    DATE := (now() AT TIME ZONE 'Europe/Moscow')::date;
  v_stage    UUID;
  v_task     UUID;
  v_next     DATE;
  v_assignee UUID;
  v_count    INTEGER := 0;
  r          RECORD;
  v_item     TEXT;
BEGIN
  SELECT id INTO v_stage FROM public.stages ORDER BY position, created_at LIMIT 1;
  IF v_stage IS NULL THEN RETURN 0; END IF;
  FOR r IN
    SELECT * FROM public.task_recurrences WHERE active AND next_run <= v_today
    ORDER BY next_run, created_at
    FOR UPDATE
  LOOP
    -- Клиент в архиве: правило выключаем и задачу не создаём, иначе архивный клиент обрастает новыми задачами.
    IF r.client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.clients WHERE id = r.client_id AND archived_at IS NOT NULL
    ) THEN
      UPDATE public.task_recurrences SET active = false WHERE id = r.id;
      CONTINUE;
    END IF;
    -- Выключенный участник задачу не увидит — создаём без исполнителя, она попадёт в «Без исполнителя».
    v_assignee := r.assignee_id;
    IF v_assignee IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = v_assignee AND is_active
    ) THEN
      v_assignee := NULL;
    END IF;

    INSERT INTO public.tasks (title, description, client_id, assignee_id, stage_id, priority, due_date, position, created_by, labels)
    VALUES (
      r.title, r.description, r.client_id, v_assignee, v_stage, r.priority,
      v_today + r.due_offset_days,
      COALESCE((SELECT MAX(position) FROM public.tasks WHERE stage_id = v_stage), 0) + 1024,
      r.created_by, r.labels
    )
    RETURNING id INTO v_task;
    FOREACH v_item IN ARRAY r.checklist LOOP
      INSERT INTO public.task_checklist_items (task_id, title, created_by) VALUES (v_task, v_item, r.created_by);
    END LOOP;
    -- Сдвигаем вперёд, пока не окажемся строго после сегодня: если cron молчал неделю, задача одна.
    v_next := r.next_run;
    WHILE v_next <= v_today LOOP
      v_next := public.recurrence_next(r.period, r.run_day, v_next);
    END LOOP;
    UPDATE public.task_recurrences SET next_run = v_next WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

INSERT INTO public.app_migrations (name) VALUES ('024_archive_awareness');
