-- 007_labels: метки задачи.
-- Массив строк прямо в tasks, без справочника: команде из четырёх человек не нужен экран
-- администрирования меток, а подсказки в форме собираются из уже использованных значений.

ALTER TABLE public.tasks ADD COLUMN labels TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE public.tasks ADD CONSTRAINT tasks_labels_limit CHECK (cardinality(labels) <= 10);

-- Нормализация в БД, а не только в форме: обрезка, без пустых и дублей, по алфавиту —
-- тогда одинаковые наборы меток сравниваются как равные (см. ветку labels в логе изменений).
CREATE OR REPLACE FUNCTION public.tasks_normalize_labels() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  SELECT COALESCE(array_agg(DISTINCT btrim(l) ORDER BY btrim(l)), '{}')
    INTO NEW.labels
    FROM unnest(NEW.labels) AS l
   WHERE btrim(l) <> '';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tasks_labels BEFORE INSERT OR UPDATE OF labels ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_normalize_labels();

-- Лог изменений: добавлена ветка labels, остальное как в 005_activity.
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

  IF NEW.assignee_id IS DISTINCT FROM OLD.assignee_id THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'assignee',
      public.activity_label((SELECT name FROM public.profiles WHERE id = OLD.assignee_id), OLD.assignee_id),
      public.activity_label((SELECT name FROM public.profiles WHERE id = NEW.assignee_id), NEW.assignee_id));
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

  RETURN NEW;
END;
$$;

INSERT INTO public.app_migrations (name) VALUES ('007_labels');
