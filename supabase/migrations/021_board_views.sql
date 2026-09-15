-- 021_board_views: сохранённые фильтры доски.
-- Личные: то, что участник собирает из селектов, сохраняется строкой запроса (?assignee=…&label=…)
-- и применяется одним кликом. Общих видов нет намеренно — у каждого свои привычные срезы.

CREATE TABLE public.board_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 60),
  query      TEXT NOT NULL CHECK (length(query) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_board_views_profile ON public.board_views (profile_id, created_at);

ALTER TABLE public.board_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "board_views: select" ON public.board_views
  FOR SELECT USING (profile_id = (select auth.uid()));
CREATE POLICY "board_views: insert" ON public.board_views
  FOR INSERT WITH CHECK ((select public.is_member()) AND profile_id = (select auth.uid()));
CREATE POLICY "board_views: delete" ON public.board_views
  FOR DELETE USING (profile_id = (select auth.uid()));

INSERT INTO public.app_migrations (name) VALUES ('021_board_views');
