-- 018_client_contacts: несколько контактов у клиента.
-- Раньше был один «контакт» строкой в clients; теперь таблица: имя, роль, телефон, email,
-- Telegram, заметка. Старые значения переносятся первой (основной) записью, колонки уходят.

CREATE TABLE public.client_contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name       TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  role       TEXT,
  phone      TEXT,
  email      TEXT,
  telegram   TEXT,
  notes      TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_client_contacts_client ON public.client_contacts (client_id, is_primary DESC, created_at);

CREATE TRIGGER trg_client_contacts_updated_at BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_client_contacts_immutable BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW EXECUTE FUNCTION public.forbid_column_change('created_by', 'client_id');

-- Как клиенты: правят все участники; удаление — тоже участники (это не сам клиент).
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_contacts: select" ON public.client_contacts
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "client_contacts: insert" ON public.client_contacts
  FOR INSERT WITH CHECK ((select public.is_member()) AND created_by = (select auth.uid()));
CREATE POLICY "client_contacts: update" ON public.client_contacts
  FOR UPDATE USING ((select public.is_member()));
CREATE POLICY "client_contacts: delete" ON public.client_contacts
  FOR DELETE USING ((select public.is_member()));

-- Перенос: имя из contact_name, а «как связаться» раскладываем по виду — телефон, почта, Telegram
-- или заметка, если не похоже ни на что. Без имени — «Контакт».
INSERT INTO public.client_contacts (client_id, name, phone, email, telegram, notes, is_primary, created_by)
SELECT
  c.id,
  coalesce(nullif(btrim(c.contact_name), ''), 'Контакт'),
  CASE WHEN c.contact ~ '^[+0-9][0-9 ()-]{5,}$' THEN c.contact END,
  CASE WHEN c.contact ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' THEN c.contact END,
  CASE WHEN c.contact ~ '^@[A-Za-z0-9_]{3,}$' THEN ltrim(c.contact, '@') END,
  CASE WHEN c.contact IS NOT NULL
        AND c.contact !~ '^[+0-9][0-9 ()-]{5,}$'
        AND c.contact !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$'
        AND c.contact !~ '^@[A-Za-z0-9_]{3,}$'
       THEN c.contact END,
  TRUE,
  c.created_by
FROM public.clients c
WHERE nullif(btrim(coalesce(c.contact_name, '')), '') IS NOT NULL
   OR nullif(btrim(coalesce(c.contact, '')), '') IS NOT NULL;

ALTER TABLE public.clients DROP COLUMN contact_name, DROP COLUMN contact;

ALTER PUBLICATION supabase_realtime ADD TABLE public.client_contacts;

INSERT INTO public.app_migrations (name) VALUES ('018_client_contacts');
