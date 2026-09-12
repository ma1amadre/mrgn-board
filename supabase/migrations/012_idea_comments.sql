-- 012_idea_comments: обсуждение под идеей.
-- Отдельная таблица, а не общая с комментариями задач: у неё свой FK, свои получатели
-- уведомлений (автор идеи) и своя ссылка в письме. Права — как у comments.

CREATE TABLE public.idea_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id    UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.profiles(id),
  body       TEXT NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_idea_comments_idea ON public.idea_comments (idea_id, created_at);

CREATE TRIGGER trg_idea_comments_updated_at BEFORE UPDATE ON public.idea_comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_idea_comments_immutable BEFORE UPDATE ON public.idea_comments
  FOR EACH ROW EXECUTE FUNCTION public.forbid_column_change('author_id', 'idea_id');

ALTER TABLE public.idea_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "idea_comments: select" ON public.idea_comments
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "idea_comments: insert" ON public.idea_comments
  FOR INSERT WITH CHECK ((select public.is_member()) AND author_id = (select auth.uid()));
CREATE POLICY "idea_comments: update" ON public.idea_comments
  FOR UPDATE USING ((select public.is_member()) AND author_id = (select auth.uid()));
CREATE POLICY "idea_comments: delete" ON public.idea_comments
  FOR DELETE USING ((select public.is_admin()) OR ((select public.is_member()) AND author_id = (select auth.uid())));

CREATE OR REPLACE FUNCTION public.idea_link(p_idea_id UUID) RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(public.setting('site_url'), '') || '/ideas?idea=' || p_idea_id::text;
$$;

-- Автору идеи и упомянутым, кроме самого пишущего — как notify_comment у задач.
CREATE OR REPLACE FUNCTION public.notify_idea_comment() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_idea   public.ideas%ROWTYPE;
  v_author TEXT;
  v_text   TEXT;
  r        RECORD;
BEGIN
  SELECT * INTO v_idea FROM public.ideas WHERE id = NEW.idea_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT name INTO v_author FROM public.profiles WHERE id = NEW.author_id;
  v_text := '<b>' || public.html_escape(coalesce(v_author, 'Кто-то')) || '</b> · идея '
    || '<a href="' || public.idea_link(v_idea.id) || '">' || public.html_escape(v_idea.title) || '</a>' || E'\n'
    || public.html_escape(left(NEW.body, 400)) || CASE WHEN length(NEW.body) > 400 THEN '…' ELSE '' END;
  FOR r IN
    SELECT p.telegram_chat_id,
           bool_or(strpos(NEW.body, '@' || p.name) > 0) AS mentioned
    FROM public.profiles p
    WHERE p.id <> NEW.author_id
      AND p.is_active
      AND p.telegram_chat_id IS NOT NULL
      AND (p.id = v_idea.author_id OR strpos(NEW.body, '@' || p.name) > 0)
    GROUP BY p.telegram_chat_id
  LOOP
    PERFORM public.telegram_send(r.telegram_chat_id,
      CASE WHEN r.mentioned THEN '👋 ' ELSE '💡 ' END || v_text);
  END LOOP;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_notify_idea_comment AFTER INSERT ON public.idea_comments
  FOR EACH ROW EXECUTE FUNCTION public.notify_idea_comment();

ALTER PUBLICATION supabase_realtime ADD TABLE public.idea_comments;

INSERT INTO public.app_migrations (name) VALUES ('012_idea_comments');
