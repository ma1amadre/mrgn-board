-- 019_recurring_tasks: повторяющиеся задачи.
-- Правило хранит заготовку задачи и расписание: раз в неделю по дню недели или раз в месяц
-- по числу (1–28, чтобы не спотыкаться о февраль). Раз в сутки pg_cron создаёт задачи, у которых
-- next_run наступил, и сдвигает next_run вперёд. Пропущенные дни не наверстываются: одна задача.

CREATE TYPE public.recurrence_period AS ENUM ('week', 'month');

CREATE TABLE public.task_recurrences (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title           TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  description     TEXT,
  client_id       UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  assignee_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  priority        public.task_priority NOT NULL DEFAULT 'normal',
  labels          TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(labels) <= 10),
  checklist       TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(checklist) <= 50),
  period          public.recurrence_period NOT NULL,
  -- week: 1 = понедельник … 7 = воскресенье; month: число месяца.
  run_day         SMALLINT NOT NULL CHECK (run_day BETWEEN 1 AND 28),
  due_offset_days SMALLINT NOT NULL DEFAULT 0 CHECK (due_offset_days BETWEEN 0 AND 60),
  next_run        DATE NOT NULL,
  active          BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID NOT NULL REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_task_recurrences_next ON public.task_recurrences (next_run) WHERE active;

CREATE TRIGGER trg_task_recurrences_updated_at BEFORE UPDATE ON public.task_recurrences
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_task_recurrences_immutable BEFORE UPDATE ON public.task_recurrences
  FOR EACH ROW EXECUTE FUNCTION public.forbid_column_change('created_by');

ALTER TABLE public.task_recurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_recurrences: select" ON public.task_recurrences
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "task_recurrences: insert" ON public.task_recurrences
  FOR INSERT WITH CHECK ((select public.is_member()) AND created_by = (select auth.uid()));
CREATE POLICY "task_recurrences: update" ON public.task_recurrences
  FOR UPDATE USING ((select public.is_member()));
CREATE POLICY "task_recurrences: delete" ON public.task_recurrences
  FOR DELETE USING ((select public.is_admin()) OR ((select public.is_member()) AND created_by = (select auth.uid())));

-- Следующая дата после p_from по правилу; run_day ≤ 28, поэтому число месяца всегда существует.
CREATE OR REPLACE FUNCTION public.recurrence_next(p_period public.recurrence_period, p_run_day INTEGER, p_from DATE)
RETURNS DATE
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_period
    WHEN 'week' THEN p_from + ((p_run_day - extract(isodow FROM p_from)::int + 6) % 7 + 1) * INTERVAL '1 day'
    ELSE CASE
      WHEN extract(day FROM p_from)::int < p_run_day THEN date_trunc('month', p_from)::date + (p_run_day - 1)
      ELSE (date_trunc('month', p_from) + INTERVAL '1 month')::date + (p_run_day - 1)
    END
  END::date;
$$;

-- Создаёт задачи по правилам, у которых next_run наступил. Задача идёт в первую стадию,
-- в конец колонки, от имени автора правила; чек-лист — из правила.
CREATE OR REPLACE FUNCTION public.spawn_recurring_tasks() RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_today DATE := (now() AT TIME ZONE 'Europe/Moscow')::date;
  v_stage UUID;
  v_task  UUID;
  v_next  DATE;
  v_count INTEGER := 0;
  r       RECORD;
  v_item  TEXT;
BEGIN
  SELECT id INTO v_stage FROM public.stages ORDER BY position, created_at LIMIT 1;
  IF v_stage IS NULL THEN RETURN 0; END IF;
  FOR r IN
    SELECT * FROM public.task_recurrences WHERE active AND next_run <= v_today
    ORDER BY next_run, created_at
    FOR UPDATE
  LOOP
    INSERT INTO public.tasks (title, description, client_id, assignee_id, stage_id, priority, due_date, position, created_by, labels)
    VALUES (
      r.title, r.description, r.client_id, r.assignee_id, v_stage, r.priority,
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
REVOKE EXECUTE ON FUNCTION public.spawn_recurring_tasks() FROM PUBLIC, anon, authenticated;

-- 04:00 UTC = 07:00 МСК, ежедневно: к началу дня новые задачи уже на доске.
SELECT cron.schedule('mrgn-board-recurring', '0 4 * * *', $$SELECT public.spawn_recurring_tasks()$$);

-- Задача, созданная по расписанию, приходит без auth.uid(): в уведомлении об этом и пишем.
CREATE OR REPLACE FUNCTION public.notify_task_assigned() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor TEXT;
BEGIN
  IF NEW.assignee_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.assignee_id IS NOT DISTINCT FROM OLD.assignee_id THEN RETURN NEW; END IF;
  IF NEW.assignee_id = auth.uid() THEN RETURN NEW; END IF;
  SELECT name INTO v_actor FROM public.profiles WHERE id = auth.uid();
  PERFORM public.notify(NEW.assignee_id, 'assigned',
    CASE WHEN auth.uid() IS NULL THEN 'Задача по расписанию' ELSE coalesce(v_actor, 'Кто-то') || ' назначил(а) вам задачу' END,
    NEW.title || CASE WHEN NEW.due_date IS NOT NULL THEN ' · срок ' || to_char(NEW.due_date, 'DD.MM') ELSE '' END,
    '/board?task=' || NEW.id::text);
  RETURN NEW;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_recurrences;

INSERT INTO public.app_migrations (name) VALUES ('019_recurring_tasks');
