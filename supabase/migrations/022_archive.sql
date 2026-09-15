-- 022_archive: архив вместо удаления.
-- Задачи и клиенты получают archived_at: приложение по умолчанию их не показывает, но ничего
-- не теряется — восстановить можно из раздела «Архив». Удалять навсегда остаётся админу.

ALTER TABLE public.tasks   ADD COLUMN archived_at TIMESTAMPTZ;
ALTER TABLE public.clients ADD COLUMN archived_at TIMESTAMPTZ;
CREATE INDEX idx_tasks_archived   ON public.tasks (archived_at) WHERE archived_at IS NOT NULL;
CREATE INDEX idx_clients_archived ON public.clients (archived_at) WHERE archived_at IS NOT NULL;

-- Удалять задачу — только админу; участники архивируют.
DROP POLICY "tasks: delete" ON public.tasks;
CREATE POLICY "tasks: delete" ON public.tasks
  FOR DELETE USING ((select public.is_admin()));

ALTER TABLE public.task_activity DROP CONSTRAINT task_activity_kind_check;
ALTER TABLE public.task_activity ADD CONSTRAINT task_activity_kind_check CHECK (kind IN (
  'created', 'stage', 'assignee', 'client', 'priority', 'due_date', 'title', 'description', 'labels',
  'checklist_add', 'checklist_done', 'checklist_undone', 'checklist_remove',
  'attachment_add', 'attachment_remove', 'archived', 'restored'
));

-- Лог изменений: как в 007, плюс архивирование и восстановление.
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

  IF NEW.archived_at IS DISTINCT FROM OLD.archived_at THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind)
    VALUES (NEW.id, v_actor, CASE WHEN NEW.archived_at IS NULL THEN 'restored' ELSE 'archived' END);
  END IF;

  RETURN NEW;
END;
$$;

INSERT INTO public.app_migrations (name) VALUES ('022_archive');
