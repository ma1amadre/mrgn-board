-- 010_deals: воронка сделок.
-- Сделка привязана к клиенту и живёт отдельно от задач: у неё свои стадии (enum, без настройки —
-- воронка у команды одна), сумма и ожидаемая дата закрытия. Выиграна/проиграна — терминальные,
-- closed_at ставит триггер, как done_at у задач.

CREATE TYPE public.deal_stage AS ENUM ('new', 'contact', 'proposal', 'negotiation', 'won', 'lost');

CREATE TABLE public.deals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  client_id      UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  stage          public.deal_stage NOT NULL DEFAULT 'new',
  amount         NUMERIC(14, 2) CHECK (amount IS NULL OR amount >= 0),
  owner_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expected_close DATE,
  notes          TEXT,
  created_by     UUID NOT NULL REFERENCES public.profiles(id),
  closed_at      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON COLUMN public.deals.amount IS 'Сумма в рублях; NULL — ещё не оценена.';
CREATE INDEX idx_deals_client ON public.deals (client_id);
CREATE INDEX idx_deals_stage  ON public.deals (stage, expected_close);

CREATE TRIGGER trg_deals_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER trg_deals_immutable BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.forbid_column_change('created_by');

-- closed_at определяется только стадией: в терминальной сохраняется момент первого попадания.
CREATE OR REPLACE FUNCTION public.deals_set_closed_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.stage IN ('won', 'lost') THEN
    NEW.closed_at = COALESCE(CASE WHEN TG_OP = 'UPDATE' THEN OLD.closed_at END, NOW());
  ELSE
    NEW.closed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_deals_closed_at BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_set_closed_at();

-- Как задачи: общие для команды.
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deals: select" ON public.deals
  FOR SELECT USING ((select public.is_member()));
CREATE POLICY "deals: insert" ON public.deals
  FOR INSERT WITH CHECK ((select public.is_member()) AND created_by = (select auth.uid()));
CREATE POLICY "deals: update" ON public.deals
  FOR UPDATE USING ((select public.is_member()));
CREATE POLICY "deals: delete" ON public.deals
  FOR DELETE USING ((select public.is_member()));

ALTER PUBLICATION supabase_realtime ADD TABLE public.deals;

INSERT INTO public.app_migrations (name) VALUES ('010_deals');
