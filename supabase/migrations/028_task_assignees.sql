-- 028_task_assignees: несколько исполнителей у задачи.
-- Вместо колонки tasks.assignee_id — таблица task_assignees; старое значение переносится.
-- Уведомление о назначении, история, утренняя сводка, комментарии и правила повторения
-- переведены на новую таблицу; колонка удалена, чтобы не было двух источников правды.

CREATE TABLE public.task_assignees (
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (task_id, profile_id)
);
CREATE INDEX idx_task_assignees_profile ON public.task_assignees (profile_id);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_assignees: select" ON public.task_assignees
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "task_assignees: insert" ON public.task_assignees
  FOR INSERT WITH CHECK ((select public.is_member()));
CREATE POLICY "task_assignees: delete" ON public.task_assignees
  FOR DELETE USING ((select public.is_member()));

INSERT INTO public.task_assignees (task_id, profile_id, created_at)
SELECT id, assignee_id, created_at FROM public.tasks WHERE assignee_id IS NOT NULL;

-- История: добавление и снятие исполнителя — отдельные записи; старый вид 'assignee' остаётся
-- для уже записанных строк.
ALTER TABLE public.task_activity DROP CONSTRAINT task_activity_kind_check;
ALTER TABLE public.task_activity ADD CONSTRAINT task_activity_kind_check CHECK (kind IN (
  'created', 'stage', 'assignee', 'assignee_add', 'assignee_remove', 'client', 'priority', 'due_date',
  'title', 'description', 'labels',
  'checklist_add', 'checklist_done', 'checklist_undone', 'checklist_remove',
  'attachment_add', 'attachment_remove', 'archived', 'restored'
));

CREATE OR REPLACE FUNCTION public.task_assignees_log_activity() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row  public.task_assignees%ROWTYPE := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  v_name TEXT;
BEGIN
  SELECT name INTO v_name FROM public.profiles WHERE id = v_row.profile_id;
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind, to_value)
    VALUES (v_row.task_id, auth.uid(), 'assignee_add', public.activity_label(v_name, v_row.profile_id));
  ELSE
    INSERT INTO public.task_activity (task_id, actor_id, kind, from_value)
    VALUES (v_row.task_id, auth.uid(), 'assignee_remove', public.activity_label(v_name, v_row.profile_id));
  END IF;
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.task_assignees_log_activity() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_task_assignees_log_activity AFTER INSERT OR DELETE ON public.task_assignees
  FOR EACH ROW EXECUTE FUNCTION public.task_assignees_log_activity();

-- Уведомление о назначении: каждому добавленному, кроме того, кто добавил сам себя.
DROP TRIGGER trg_notify_task_assigned ON public.tasks;
DROP FUNCTION public.notify_task_assigned();
CREATE OR REPLACE FUNCTION public.notify_task_assignee() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor TEXT;
  v_task  public.tasks%ROWTYPE;
BEGIN
  IF NEW.profile_id = auth.uid() THEN RETURN NULL; END IF;
  SELECT * INTO v_task FROM public.tasks WHERE id = NEW.task_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT name INTO v_actor FROM public.profiles WHERE id = auth.uid();
  PERFORM public.notify(NEW.profile_id, 'assigned',
    CASE WHEN auth.uid() IS NULL THEN 'Задача по расписанию' ELSE coalesce(v_actor, 'Кто-то') || ' назначил(а) вам задачу' END,
    v_task.title || CASE WHEN v_task.due_date IS NOT NULL THEN ' · срок ' || to_char(v_task.due_date, 'DD.MM') ELSE '' END,
    '/board?task=' || v_task.id::text);
  RETURN NULL;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify_task_assignee() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_task_assignee AFTER INSERT ON public.task_assignees
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignee();

-- Комментарий: всем исполнителям, автору задачи и упомянутым.
CREATE OR REPLACE FUNCTION public.notify_comment() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task   public.tasks%ROWTYPE;
  v_author TEXT;
  r        RECORD;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id = NEW.task_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT name INTO v_author FROM public.profiles WHERE id = NEW.author_id;
  FOR r IN
    SELECT p.id, strpos(NEW.body, '@' || p.name) > 0 AS mentioned
    FROM public.profiles p
    WHERE p.id <> NEW.author_id
      AND p.is_active
      AND (p.id = v_task.created_by
        OR EXISTS (SELECT 1 FROM public.task_assignees ta WHERE ta.task_id = v_task.id AND ta.profile_id = p.id)
        OR strpos(NEW.body, '@' || p.name) > 0)
  LOOP
    PERFORM public.notify(r.id, CASE WHEN r.mentioned THEN 'mention' ELSE 'comment' END,
      coalesce(v_author, 'Кто-то') || CASE WHEN r.mentioned THEN ' упомянул(а) вас в «' ELSE ': комментарий к «' END
        || v_task.title || '»',
      left(NEW.body, 400) || CASE WHEN length(NEW.body) > 400 THEN '…' ELSE '' END,
      '/board?task=' || v_task.id::text);
  END LOOP;
  RETURN NEW;
END;
$$;

-- Сводка: задачи, где участник среди исполнителей.
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
      SELECT tk.id, tk.title, tk.due_date FROM public.tasks tk
      JOIN public.task_assignees ta ON ta.task_id = tk.id AND ta.profile_id = p.id
      WHERE tk.done_at IS NULL AND tk.archived_at IS NULL
        AND tk.due_date IS NOT NULL AND tk.due_date <= v_today + 1
      ORDER BY tk.due_date, tk.created_at
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

-- Правила повторения: исполнитель правила становится исполнителем созданной задачи.
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
    v_next := r.next_run;
    WHILE v_next <= v_today LOOP
      v_next := public.recurrence_next(r.period, r.run_day, v_next);
    END LOOP;
    UPDATE public.task_recurrences SET next_run = v_next WHERE id = r.id;

    IF r.client_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.clients WHERE id = r.client_id AND archived_at IS NOT NULL
    ) THEN
      CONTINUE;
    END IF;

    IF r.skip_if_open AND EXISTS (
      SELECT 1 FROM public.tasks
      WHERE recurrence_id = r.id AND done_at IS NULL AND archived_at IS NULL
    ) THEN
      CONTINUE;
    END IF;

    v_assignee := r.assignee_id;
    IF v_assignee IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = v_assignee AND is_active
    ) THEN
      v_assignee := NULL;
    END IF;

    INSERT INTO public.tasks (title, description, client_id, stage_id, priority, due_date, position, created_by, labels, recurrence_id)
    VALUES (
      r.title, r.description, r.client_id, v_stage, r.priority,
      v_today + r.due_offset_days,
      COALESCE((SELECT MAX(position) FROM public.tasks WHERE stage_id = v_stage), 0) + 1024,
      r.created_by, r.labels, r.id
    )
    RETURNING id INTO v_task;
    IF v_assignee IS NOT NULL THEN
      INSERT INTO public.task_assignees (task_id, profile_id) VALUES (v_task, v_assignee);
    END IF;
    FOREACH v_item IN ARRAY r.checklist LOOP
      INSERT INTO public.task_checklist_items (task_id, title, created_by) VALUES (v_task, v_item, r.created_by);
    END LOOP;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- Лог изменений задачи без ветки про исполнителя: её ведёт триггер на task_assignees.
CREATE OR REPLACE FUNCTION public.tasks_log_activity() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind)
    VALUES (NEW.id, COALESCE(v_actor, NEW.created_by), 'created');
    RETURN NEW;
  END IF;

  IF NEW.stage_id IS DISTINCT FROM OLD.stage_id THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'stage',
      public.activity_label((SELECT name FROM public.stages WHERE id = OLD.stage_id), OLD.stage_id),
      public.activity_label((SELECT name FROM public.stages WHERE id = NEW.stage_id), NEW.stage_id));
  END IF;

  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'client',
      public.activity_label((SELECT name FROM public.clients WHERE id = OLD.client_id), OLD.client_id),
      public.activity_label((SELECT name FROM public.clients WHERE id = NEW.client_id), NEW.client_id));
  END IF;

  IF NEW.priority IS DISTINCT FROM OLD.priority THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'priority', OLD.priority::TEXT, NEW.priority::TEXT);
  END IF;

  IF NEW.due_date IS DISTINCT FROM OLD.due_date THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'due_date', OLD.due_date::TEXT, NEW.due_date::TEXT);
  END IF;

  IF NEW.title IS DISTINCT FROM OLD.title THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'title', OLD.title, NEW.title);
  END IF;

  IF NEW.description IS DISTINCT FROM OLD.description THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind)
    VALUES (NEW.id, v_actor, 'description');
  END IF;

  IF NEW.labels IS DISTINCT FROM OLD.labels THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'labels',
      NULLIF(array_to_string(OLD.labels, ', '), ''),
      NULLIF(array_to_string(NEW.labels, ', '), ''));
  END IF;

  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind)
    VALUES (NEW.id, v_actor, CASE WHEN NEW.archived_at IS NULL THEN 'restored' ELSE 'archived' END);
  END IF;

  RETURN NEW;
END;
$$;

ALTER TABLE public.tasks DROP COLUMN assignee_id;

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignees;

INSERT INTO public.app_migrations (name) VALUES ('028_task_assignees');
