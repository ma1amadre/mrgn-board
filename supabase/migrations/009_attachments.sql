-- 009_attachments: вложения к задаче в Supabase Storage.
-- Файл лежит в приватном бакете под ASCII-ключом «task_id/uuid.ext» (ключи Storage не принимают
-- кириллицу), а исходное имя, размер и автор — в строке task_attachments. Список вложений
-- приезжает вложенным в задачу, как чек-лист.

CREATE TABLE public.task_attachments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 255),
  path       TEXT NOT NULL UNIQUE,
  size       BIGINT NOT NULL CHECK (size >= 0),
  mime       TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_attachments_task ON public.task_attachments (task_id, created_at);

-- UPDATE-политики нет: строку либо создают, либо удаляют вместе с файлом.
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "attachments: select" ON public.task_attachments
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "attachments: insert" ON public.task_attachments
  FOR INSERT WITH CHECK ((select public.is_member()) AND created_by = (select auth.uid()));
CREATE POLICY "attachments: delete" ON public.task_attachments
  FOR DELETE USING ((select public.is_member()));

-- Бакет приватный: скачивание по подписанным ссылкам. Лимит 25 МБ на файл.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('attachments', 'attachments', FALSE, 26214400)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "attachments bucket: select" ON storage.objects
  FOR SELECT USING (bucket_id = 'attachments' AND (select public.is_member()));
CREATE POLICY "attachments bucket: insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'attachments' AND (select public.is_member()));
CREATE POLICY "attachments bucket: delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'attachments' AND (select public.is_member()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.task_attachments;

INSERT INTO public.app_migrations (name) VALUES ('009_attachments');
