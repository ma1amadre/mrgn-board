-- 013_task_templates: шаблоны задач.
-- Шаблон — заготовка формы плюс пункты чек-листа. Стадию и клиента он не хранит: они зависят от
-- момента создания. Удалить может автор или админ, пользоваться — все.

CREATE TABLE public.task_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
  title       TEXT NOT NULL DEFAULT '',
  description TEXT,
  priority    public.task_priority NOT NULL DEFAULT 'normal',
  labels      TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(labels) <= 10),
  checklist   TEXT[] NOT NULL DEFAULT '{}' CHECK (cardinality(checklist) <= 50),
  created_by  UUID NOT NULL REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_task_templates_name ON public.task_templates (name);

CREATE TRIGGER trg_task_templates_updated_at BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_task_templates_immutable BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.forbid_column_change('created_by');

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "task_templates: select" ON public.task_templates
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "task_templates: insert" ON public.task_templates
  FOR INSERT WITH CHECK ((select public.is_member()) AND created_by = (select auth.uid()));
CREATE POLICY "task_templates: update" ON public.task_templates
  FOR UPDATE USING ((select public.is_admin()) OR ((select public.is_member()) AND created_by = (select auth.uid())));
CREATE POLICY "task_templates: delete" ON public.task_templates
  FOR DELETE USING ((select public.is_admin()) OR ((select public.is_member()) AND created_by = (select auth.uid())));

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_templates;

INSERT INTO public.app_migrations (name) VALUES ('013_task_templates');
