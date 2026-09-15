-- 026_recurrence_skip_if_open: правило может ждать закрытия предыдущей задачи.
-- Еженедельный отчёт, который не закрыли, раньше накапливался дублями. Теперь у правила есть
-- флажок skip_if_open, а у задачи — ссылка на правило, по которой это и проверяется.

ALTER TABLE public.task_recurrences ADD COLUMN skip_if_open BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.tasks ADD COLUMN recurrence_id UUID REFERENCES public.task_recurrences(id) ON DELETE SET NULL;
CREATE INDEX idx_tasks_recurrence ON public.tasks (recurrence_id) WHERE recurrence_id IS NOT NULL;

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

    -- Сдвигаем вперёд, пока не окажемся строго после сегодня: если cron молчал неделю, задача одна.
    v_next := r.next_run;
    WHILE v_next <= v_today LOOP
      v_next := public.recurrence_next(r.period, r.run_day, v_next);
    END LOOP;
    UPDATE public.task_recurrences SET next_run = v_next WHERE id = r.id;

    -- Предыдущая задача по правилу ещё открыта — этот запуск пропускаем, дата уже сдвинута.
    IF r.skip_if_open AND EXISTS (
      SELECT 1 FROM public.tasks
      WHERE recurrence_id = r.id AND done_at IS NULL AND archived_at IS NULL
    ) THEN
      CONTINUE;
    END IF;

    -- Выключенный участник задачу не увидит — создаём без исполнителя, она попадёт в «Без исполнителя».
    v_assignee := r.assignee_id;
    IF v_assignee IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.profiles WHERE id = v_assignee AND is_active
    ) THEN
      v_assignee := NULL;
    END IF;

    INSERT INTO public.tasks (title, description, client_id, assignee_id, stage_id, priority, due_date, position, created_by, labels, recurrence_id)
    VALUES (
      r.title, r.description, r.client_id, v_assignee, v_stage, r.priority,
      v_today + r.due_offset_days,
      COALESCE((SELECT MAX(position) FROM public.tasks WHERE stage_id = v_stage), 0) + 1024,
      r.created_by, r.labels, r.id
    )
    RETURNING id INTO v_task;
    FOREACH v_item IN ARRAY r.checklist LOOP
      INSERT INTO public.task_checklist_items (task_id, title, created_by) VALUES (v_task, v_item, r.created_by);
    END LOOP;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

INSERT INTO public.app_migrations (name) VALUES ('026_recurrence_skip_if_open');
