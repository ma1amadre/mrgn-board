-- 006_checklists: чек-лист внутри задачи.
-- Пункты общие для команды, как и сама задача: отметить или удалить может любой участник.
-- Порядок — по времени добавления; перестановки нет намеренно, это не второй канбан.

CREATE TABLE public.task_checklist_items (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title      TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 300),
  is_done    BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_checklist_task ON public.task_checklist_items (task_id, created_at);

CREATE TRIGGER trg_checklist_updated_at BEFORE UPDATE ON public.task_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_checklist_immutable BEFORE UPDATE ON public.task_checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.forbid_column_change('created_by', 'task_id');

ALTER TABLE public.task_checklist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checklist: select" ON public.task_checklist_items
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "checklist: insert" ON public.task_checklist_items
  FOR INSERT WITH CHECK ((select public.is_member()) AND created_by = (select auth.uid()));
CREATE POLICY "checklist: update" ON public.task_checklist_items
  FOR UPDATE USING ((select public.is_member()));
CREATE POLICY "checklist: delete" ON public.task_checklist_items
  FOR DELETE USING ((select public.is_member()));

-- Пункты приезжают вложенными в задачи, поэтому их изменения сбрасывают кеш задач (см. realtime.ts).
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_checklist_items;

INSERT INTO public.app_migrations (name) VALUES ('006_checklists');
