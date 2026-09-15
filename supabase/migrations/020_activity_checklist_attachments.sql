-- 020_activity_checklist_attachments: чек-лист и вложения в истории задачи; выигранная сделка
-- переводит клиента-лида в работу.

ALTER TABLE public.task_activity DROP CONSTRAINT task_activity_kind_check;
ALTER TABLE public.task_activity ADD CONSTRAINT task_activity_kind_check CHECK (kind IN (
  'created', 'stage', 'assignee', 'client', 'priority', 'due_date', 'title', 'description', 'labels',
  'checklist_add', 'checklist_done', 'checklist_undone', 'checklist_remove',
  'attachment_add', 'attachment_remove'
));

CREATE OR REPLACE FUNCTION public.checklist_log_activity() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind, to_value)
    VALUES (NEW.task_id, COALESCE(auth.uid(), NEW.created_by), 'checklist_add', NEW.title);
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    -- Каскад при удалении задачи: строки истории удаляются вместе с ней, писать некуда.
    IF EXISTS (SELECT 1 FROM public.tasks WHERE id = OLD.task_id) THEN
      INSERT INTO public.task_activity (task_id, actor_id, kind, from_value)
      VALUES (OLD.task_id, auth.uid(), 'checklist_remove', OLD.title);
    END IF;
    RETURN OLD;
  ELSIF NEW.is_done IS DISTINCT FROM OLD.is_done THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind, to_value)
    VALUES (NEW.task_id, auth.uid(), CASE WHEN NEW.is_done THEN 'checklist_done' ELSE 'checklist_undone' END, NEW.title);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_checklist_activity AFTER INSERT OR UPDATE OF is_done OR DELETE ON public.task_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.checklist_log_activity();

CREATE OR REPLACE FUNCTION public.attachment_log_activity() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind, to_value)
    VALUES (NEW.task_id, COALESCE(auth.uid(), NEW.created_by), 'attachment_add', NEW.name);
    RETURN NEW;
  END IF;
  IF EXISTS (SELECT 1 FROM public.tasks WHERE id = OLD.task_id) THEN
    INSERT INTO public.task_activity (task_id, actor_id, kind, from_value)
    VALUES (OLD.task_id, auth.uid(), 'attachment_remove', OLD.name);
  END IF;
  RETURN OLD;
END;
$$;
CREATE TRIGGER trg_attachment_activity AFTER INSERT OR DELETE ON public.task_attachments
  FOR EACH ROW EXECUTE FUNCTION public.attachment_log_activity();

-- Сделка выиграна — клиент больше не лид. Другие статусы (сопровождение, закрыт) не трогаем.
CREATE OR REPLACE FUNCTION public.deals_won_client_active() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.stage = 'won' AND (TG_OP = 'INSERT' OR OLD.stage IS DISTINCT FROM 'won') THEN
    UPDATE public.clients SET status = 'active' WHERE id = NEW.client_id AND status = 'lead';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_deals_won AFTER INSERT OR UPDATE OF stage ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_won_client_active();

INSERT INTO public.app_migrations (name) VALUES ('020_activity_checklist_attachments');
