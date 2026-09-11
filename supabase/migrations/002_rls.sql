-- 002_rls: включение RLS и политики.
-- Для anon политик нет вообще — всё закрыто. Проверки обёрнуты в (select ...),
-- чтобы планировщик считал их один раз на запрос, а не на строку.

ALTER TABLE public.app_migrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idea_votes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments       ENABLE ROW LEVEL SECURITY;

-- ─── app_migrations: только чтение участниками ───
CREATE POLICY "app_migrations: select" ON public.app_migrations
  FOR SELECT USING ((select public.is_member()));

-- ─── profiles ───
-- Свой профиль виден даже деактивированному — нужен для экрана «Доступ отключён».
-- INSERT только триггером, DELETE только через auth (каскад).
CREATE POLICY "profiles: select" ON public.profiles
  FOR SELECT USING ((select public.is_member()) OR id = (select auth.uid()));
CREATE POLICY "profiles: update" ON public.profiles
  FOR UPDATE USING ((select public.is_admin()) OR ((select public.is_member()) AND id = (select auth.uid())));

-- ─── clients ───
CREATE POLICY "clients: select" ON public.clients
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "clients: insert" ON public.clients
  FOR INSERT WITH CHECK ((select public.is_member()) AND created_by = (select auth.uid()));
CREATE POLICY "clients: update" ON public.clients
  FOR UPDATE USING ((select public.is_member()));
CREATE POLICY "clients: delete" ON public.clients
  FOR DELETE USING ((select public.is_admin()));

-- ─── stages: читают все, меняет админ ───
CREATE POLICY "stages: select" ON public.stages
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "stages: insert" ON public.stages
  FOR INSERT WITH CHECK ((select public.is_admin()));
CREATE POLICY "stages: update" ON public.stages
  FOR UPDATE USING ((select public.is_admin()));
CREATE POLICY "stages: delete" ON public.stages
  FOR DELETE USING ((select public.is_admin()));

-- ─── tasks: общие для команды ───
CREATE POLICY "tasks: select" ON public.tasks
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "tasks: insert" ON public.tasks
  FOR INSERT WITH CHECK ((select public.is_member()) AND created_by = (select auth.uid()));
CREATE POLICY "tasks: update" ON public.tasks
  FOR UPDATE USING ((select public.is_member()));
CREATE POLICY "tasks: delete" ON public.tasks
  FOR DELETE USING ((select public.is_member()));

-- ─── ideas: статус общий, удаление — автор или админ ───
CREATE POLICY "ideas: select" ON public.ideas
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "ideas: insert" ON public.ideas
  FOR INSERT WITH CHECK ((select public.is_member()) AND author_id = (select auth.uid()));
CREATE POLICY "ideas: update" ON public.ideas
  FOR UPDATE USING ((select public.is_member()));
CREATE POLICY "ideas: delete" ON public.ideas
  FOR DELETE USING ((select public.is_admin()) OR ((select public.is_member()) AND author_id = (select auth.uid())));

-- ─── idea_votes: голосуешь только за себя ───
CREATE POLICY "idea_votes: select" ON public.idea_votes
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "idea_votes: insert" ON public.idea_votes
  FOR INSERT WITH CHECK ((select public.is_member()) AND profile_id = (select auth.uid()));
CREATE POLICY "idea_votes: delete" ON public.idea_votes
  FOR DELETE USING ((select public.is_member()) AND profile_id = (select auth.uid()));

-- ─── comments: правит автор, удаляет автор или админ ───
CREATE POLICY "comments: select" ON public.comments
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "comments: insert" ON public.comments
  FOR INSERT WITH CHECK ((select public.is_member()) AND author_id = (select auth.uid()));
CREATE POLICY "comments: update" ON public.comments
  FOR UPDATE USING ((select public.is_member()) AND author_id = (select auth.uid()));
CREATE POLICY "comments: delete" ON public.comments
  FOR DELETE USING ((select public.is_admin()) OR ((select public.is_member()) AND author_id = (select auth.uid())));

INSERT INTO public.app_migrations (name) VALUES ('002_rls');
