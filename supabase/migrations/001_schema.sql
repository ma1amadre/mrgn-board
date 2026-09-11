-- 001_schema: расширения, типы, таблицы, триггеры, функции.
-- Конвенции: uuid из pgcrypto, created_at/updated_at на всех сущностях,
-- в SECURITY DEFINER функциях пользователь только из auth.uid().

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Типы ───
CREATE TYPE public.profile_role     AS ENUM ('admin', 'member');
CREATE TYPE public.client_direction AS ENUM ('cdn', 'site', 'bot', 'app', 'other');
CREATE TYPE public.client_status    AS ENUM ('lead', 'active', 'support', 'closed');
CREATE TYPE public.task_priority    AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE public.idea_status      AS ENUM ('new', 'discussing', 'accepted', 'rejected');

-- ─── Общие функции ───
CREATE OR REPLACE FUNCTION public.handle_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ─── Таблицы ───
CREATE TABLE public.app_migrations (
  name       TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.app_migrations IS 'Какие файлы миграций применены; приложение читает для самопроверки.';

CREATE TABLE public.profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT NOT NULL,
  name       TEXT NOT NULL,
  role       public.profile_role NOT NULL DEFAULT 'member',
  color      TEXT NOT NULL DEFAULT '#0b6e5c',
  telegram   TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.profiles IS 'Участники команды; строка создаётся триггером при появлении auth.users.';

CREATE TABLE public.clients (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  contact_name TEXT,
  contact      TEXT,
  direction    public.client_direction NOT NULL DEFAULT 'other',
  status       public.client_status NOT NULL DEFAULT 'lead',
  notes        TEXT,
  created_by   UUID NOT NULL REFERENCES public.profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.clients IS 'Клиенты и проекты, к которым привязываются задачи.';

CREATE TABLE public.stages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  position    INTEGER NOT NULL,
  color       TEXT,
  is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.stages IS 'Колонки доски. is_terminal — попадание в стадию закрывает задачу.';

CREATE TABLE public.ideas (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  body       TEXT,
  author_id  UUID NOT NULL REFERENCES public.profiles(id),
  status     public.idea_status NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.idea_votes (
  idea_id    UUID NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (idea_id, profile_id)
);

CREATE TABLE public.tasks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  client_id   UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  stage_id    UUID NOT NULL REFERENCES public.stages(id) ON DELETE RESTRICT,
  priority    public.task_priority NOT NULL DEFAULT 'normal',
  due_date    DATE,
  position    DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_by  UUID NOT NULL REFERENCES public.profiles(id),
  done_at     TIMESTAMPTZ,
  idea_id     UUID REFERENCES public.ideas(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN public.tasks.position IS 'Порядок внутри стадии: середина между соседями, шаг 1024 по краям.';

CREATE TABLE public.comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES public.profiles(id),
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Индексы ───
CREATE INDEX idx_tasks_stage_pos  ON public.tasks (stage_id, position);
CREATE INDEX idx_tasks_assignee   ON public.tasks (assignee_id);
CREATE INDEX idx_tasks_client     ON public.tasks (client_id);
CREATE INDEX idx_tasks_due_open   ON public.tasks (due_date) WHERE done_at IS NULL;
CREATE UNIQUE INDEX uq_tasks_idea ON public.tasks (idea_id) WHERE idea_id IS NOT NULL;
CREATE INDEX idx_comments_task    ON public.comments (task_id, created_at);
CREATE INDEX idx_stages_position  ON public.stages (position);

-- ─── updated_at ───
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_clients_updated_at  BEFORE UPDATE ON public.clients  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_stages_updated_at   BEFORE UPDATE ON public.stages   FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_ideas_updated_at    BEFORE UPDATE ON public.ideas    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_tasks_updated_at    BEFORE UPDATE ON public.tasks    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_comments_updated_at BEFORE UPDATE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ─── Роли ───
-- SECURITY DEFINER обязателен: политика на profiles, читающая profiles через INVOKER-функцию,
-- уходит в рекурсию RLS. Параметров нет — пользователь только из auth.uid().
CREATE OR REPLACE FUNCTION public.is_member() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active);
$$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_active AND role = 'admin');
$$;

-- ─── Профиль из auth.users ───
-- Имя из metadata (Dashboard → Add user умеет передать), иначе локальная часть email.
-- Цвет аватара — случайный из палитры статусов и акцента.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  palette TEXT[] := ARRAY['#0b6e5c', '#1b5fa6', '#8f5c00', '#b3261e', '#2f9c86', '#6e7576'];
BEGIN
  INSERT INTO public.profiles (id, email, name, color)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    palette[1 + floor(random() * array_length(palette, 1))::int]
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── Защита role / is_active ───
-- RLS не ограничивает колонки, поэтому триггер. auth.uid() IS NULL — SQL editor или сервисная
-- роль: так назначается первый админ. Для anon это не дыра: у anon нет ни одной политики.
CREATE OR REPLACE FUNCTION public.profiles_guard() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'only admin can change role or is_active' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_guard BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_guard();

-- ─── done_at по терминальной стадии ───
CREATE OR REPLACE FUNCTION public.tasks_set_done_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF (SELECT is_terminal FROM public.stages WHERE id = NEW.stage_id) THEN
    NEW.done_at = COALESCE(NEW.done_at, NOW());
  ELSE
    NEW.done_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tasks_done_at BEFORE INSERT OR UPDATE OF stage_id ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_set_done_at();

-- ─── RPC: перенумерация колонки ───
-- INVOKER: работает под RLS вызывающего. Вызывается клиентом, когда зазор между соседями исчерпан.
CREATE OR REPLACE FUNCTION public.renumber_stage(p_stage_id UUID) RETURNS VOID
LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  UPDATE public.tasks t SET position = s.rn * 1024
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) AS rn
    FROM public.tasks WHERE stage_id = p_stage_id
  ) s
  WHERE t.id = s.id;
$$;

-- ─── RPC: идея → задача ───
-- Атомарно: задача в первой стадии + статус идеи. Повторная конвертация невозможна
-- (FOR UPDATE + уникальный индекс). INVOKER: created_by = auth.uid() проходит WITH CHECK.
CREATE OR REPLACE FUNCTION public.convert_idea_to_task(p_idea_id UUID) RETURNS UUID
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  v_idea  public.ideas%ROWTYPE;
  v_stage UUID;
  v_task  UUID;
BEGIN
  SELECT * INTO v_idea FROM public.ideas WHERE id = p_idea_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'idea not found' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (SELECT 1 FROM public.tasks WHERE idea_id = p_idea_id) THEN
    RAISE EXCEPTION 'idea already converted' USING ERRCODE = '23505';
  END IF;
  SELECT id INTO v_stage FROM public.stages ORDER BY position LIMIT 1;
  IF v_stage IS NULL THEN
    RAISE EXCEPTION 'no stages configured' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.tasks (title, description, stage_id, position, created_by, idea_id)
  VALUES (
    v_idea.title,
    v_idea.body,
    v_stage,
    COALESCE((SELECT MAX(position) FROM public.tasks WHERE stage_id = v_stage), 0) + 1024,
    auth.uid(),
    p_idea_id
  )
  RETURNING id INTO v_task;

  UPDATE public.ideas SET status = 'accepted' WHERE id = p_idea_id;
  RETURN v_task;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.renumber_stage(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.convert_idea_to_task(UUID) FROM anon;

INSERT INTO public.app_migrations (name) VALUES ('001_schema');
