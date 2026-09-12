-- 005_activity: история изменений задачи.
-- Пишет триггер в БД, а не клиент: иначе перенос мимо приложения (SQL editor, RPC) остался бы
-- незамеченным, а участник мог бы записать чужое имя. В строке хранятся подписи на момент
-- изменения (имя стадии, исполнителя), а не id — лента читается без join и переживает удаления.

CREATE TABLE public.task_activity (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind       TEXT NOT NULL CHECK (kind IN (
               'created', 'stage', 'assignee', 'client', 'priority', 'due_date', 'title', 'description', 'labels'
             )),
  from_value TEXT,
  to_value   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.task_activity IS 'Лента изменений задачи; заполняет только триггер tasks_log_activity.';
CREATE INDEX idx_task_activity_task ON public.task_activity (task_id, created_at);

-- Читают участники; INSERT/UPDATE/DELETE политик нет — пишет триггер (SECURITY DEFINER),
-- удаляется каскадом вместе с задачей.
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_activity: select" ON public.task_activity
  FOR SELECT USING ((select public.is_member()));

-- Подпись для ссылки на удалённую сущность: id ещё был, а строки уже нет
-- (например, ON DELETE SET NULL у client_id срабатывает, когда клиент уже удалён).
CREATE OR REPLACE FUNCTION public.activity_label(p_name TEXT, p_id UUID) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(p_name, CASE WHEN p_id IS NOT NULL THEN '(удалено)' END);
$$;

-- position и updated_at не логируются: перестановка внутри колонки — не событие.
-- auth.uid() пуст в SQL editor и в cron — тогда actor NULL, у created берём создателя.
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

  -- Текст описания в ленту не кладём: достаточно факта, старая версия видна в самой задаче до правки.
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind)
    VALUES (NEW.id, v_actor, 'description');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tasks_log_activity AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_log_activity();

-- У уже существующих задач лента начинается с создания, датированного задним числом.
INSERT INTO public.task_activity (task_id, actor_id, kind, created_at)
SELECT id, created_by, 'created', created_at FROM public.tasks;

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_activity;

INSERT INTO public.app_migrations (name) VALUES ('005_activity');
