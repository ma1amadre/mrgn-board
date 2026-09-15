-- 015_notifications_center: уведомления внутри приложения.
-- Telegram подключают не все, поэтому каждое событие теперь сначала ложится в ленту участника,
-- а уже из неё уходит в Telegram, если chat ID есть. Одна точка отправки — функция notify();
-- триггеры 004/008/012 переписаны на неё. Ссылка в строке относительная (/board?task=…):
-- приложение переходит по ней само, для Telegram к ней добавляется site_url.

CREATE TABLE public.notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL CHECK (kind IN ('assigned', 'comment', 'mention', 'idea_comment')),
  title      TEXT NOT NULL,
  body       TEXT,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at    TIMESTAMPTZ
);
CREATE INDEX idx_notifications_profile ON public.notifications (profile_id, created_at DESC);

-- Свои и только свои; INSERT-политики нет — пишет notify() (SECURITY DEFINER).
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications: select" ON public.notifications
  FOR SELECT USING (profile_id = (select auth.uid()));
CREATE POLICY "notifications: update" ON public.notifications
  FOR UPDATE USING (profile_id = (select auth.uid()));
CREATE POLICY "notifications: delete" ON public.notifications
  FOR DELETE USING (profile_id = (select auth.uid()));
-- Клиенту разрешено менять только read_at.
CREATE TRIGGER trg_notifications_immutable BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.forbid_column_change('profile_id', 'kind', 'title', 'body', 'link', 'created_at');

CREATE OR REPLACE FUNCTION public.notify(p_profile UUID, p_kind TEXT, p_title TEXT, p_body TEXT, p_link TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_chat BIGINT;
  v_icon TEXT;
BEGIN
  IF p_profile IS NULL THEN RETURN; END IF;
  SELECT telegram_chat_id INTO v_chat FROM public.profiles WHERE id = p_profile AND is_active;
  IF NOT FOUND THEN RETURN; END IF;
  INSERT INTO public.notifications (profile_id, kind, title, body, link)
  VALUES (p_profile, p_kind, p_title, p_body, p_link);
  IF v_chat IS NULL THEN RETURN; END IF;
  v_icon := CASE p_kind
    WHEN 'assigned' THEN '🗂' WHEN 'mention' THEN '👋' WHEN 'idea_comment' THEN '💡' ELSE '💬' END;
  PERFORM public.telegram_send(v_chat,
    v_icon || ' <b>' || public.html_escape(p_title) || '</b>'
    || CASE WHEN p_body IS NOT NULL AND p_body <> '' THEN E'\n' || public.html_escape(p_body) ELSE '' END
    || CASE WHEN p_link IS NOT NULL
         THEN E'\n' || '<a href="' || coalesce(public.setting('site_url'), '') || p_link || '">Открыть</a>'
         ELSE '' END);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notify(UUID, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

-- ─── Назначили задачу ───
CREATE OR REPLACE FUNCTION public.notify_task_assigned() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor TEXT;
BEGIN
  IF NEW.assignee_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.assignee_id IS NOT DISTINCT FROM OLD.assignee_id THEN RETURN NEW; END IF;
  -- Сам себе назначил — не дёргаем.
  IF NEW.assignee_id = auth.uid() THEN RETURN NEW; END IF;
  SELECT name INTO v_actor FROM public.profiles WHERE id = auth.uid();
  PERFORM public.notify(NEW.assignee_id, 'assigned',
    coalesce(v_actor, 'Кто-то') || ' назначил(а) вам задачу',
    NEW.title || CASE WHEN NEW.due_date IS NOT NULL THEN ' · срок ' || to_char(NEW.due_date, 'DD.MM') ELSE '' END,
    '/board?task=' || NEW.id::text);
  RETURN NEW;
END;
$$;

-- ─── Комментарий к задаче: исполнителю, автору задачи и упомянутым ───
CREATE OR REPLACE FUNCTION public.notify_comment() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_task   public.tasks%ROWTYPE;
  v_author TEXT;
  r        RECORD;
BEGIN
  SELECT * INTO v_task FROM public.tasks WHERE id = NEW.task_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT name INTO v_author FROM public.profiles WHERE id = NEW.author_id;
  FOR r IN
    SELECT p.id, strpos(NEW.body, '@' || p.name) > 0 AS mentioned
    FROM public.profiles p
    WHERE p.id <> NEW.author_id
      AND p.is_active
      AND (p.id IN (v_task.assignee_id, v_task.created_by) OR strpos(NEW.body, '@' || p.name) > 0)
  LOOP
    PERFORM public.notify(r.id, CASE WHEN r.mentioned THEN 'mention' ELSE 'comment' END,
      coalesce(v_author, 'Кто-то') || CASE WHEN r.mentioned THEN ' упомянул(а) вас в «' ELSE ': комментарий к «' END
        || v_task.title || '»',
      left(NEW.body, 400) || CASE WHEN length(NEW.body) > 400 THEN '…' ELSE '' END,
      '/board?task=' || v_task.id::text);
  END LOOP;
  RETURN NEW;
END;
$$;

-- ─── Комментарий под идеей: автору идеи и упомянутым ───
CREATE OR REPLACE FUNCTION public.notify_idea_comment() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_idea   public.ideas%ROWTYPE;
  v_author TEXT;
  r        RECORD;
BEGIN
  SELECT * INTO v_idea FROM public.ideas WHERE id = NEW.idea_id;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT name INTO v_author FROM public.profiles WHERE id = NEW.author_id;
  FOR r IN
    SELECT p.id, strpos(NEW.body, '@' || p.name) > 0 AS mentioned
    FROM public.profiles p
    WHERE p.id <> NEW.author_id
      AND p.is_active
      AND (p.id = v_idea.author_id OR strpos(NEW.body, '@' || p.name) > 0)
  LOOP
    PERFORM public.notify(r.id, CASE WHEN r.mentioned THEN 'mention' ELSE 'idea_comment' END,
      coalesce(v_author, 'Кто-то') || CASE WHEN r.mentioned THEN ' упомянул(а) вас в идее «' ELSE ': к идее «' END
        || v_idea.title || '»',
      left(NEW.body, 400) || CASE WHEN length(NEW.body) > 400 THEN '…' ELSE '' END,
      '/ideas?idea=' || v_idea.id::text);
  END LOOP;
  RETURN NEW;
END;
$$;

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

INSERT INTO public.app_migrations (name) VALUES ('015_notifications_center');
