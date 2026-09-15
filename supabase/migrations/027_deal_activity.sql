-- 027_deal_activity: история сделки и причина проигрыша.
-- Смена стадии, суммы, ответственного и срока сделки не оставляла следа, а отчёт по сделкам
-- считал только created→closed. Лента deal_activity заполняется триггером, как task_activity.

ALTER TABLE public.deals ADD COLUMN lost_reason TEXT CHECK (lost_reason IS NULL OR length(lost_reason) <= 300);
COMMENT ON COLUMN public.deals.lost_reason IS 'Почему проиграли; имеет смысл только при stage = lost.';

CREATE TABLE public.deal_activity (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id    UUID NOT NULL REFERENCES public.deals(id) ON DELETE CASCADE,
  actor_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind       TEXT NOT NULL CHECK (kind IN (
               'created', 'stage', 'amount', 'owner', 'expected_close', 'title', 'client', 'lost_reason'
             )),
  from_value TEXT,
  to_value   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE public.deal_activity IS 'Лента изменений сделки; заполняет только триггер deals_log_activity.';
CREATE INDEX idx_deal_activity_deal ON public.deal_activity (deal_id, created_at);

-- Читают участники; пишет только триггер (SECURITY DEFINER), политик на запись нет.
ALTER TABLE public.deal_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "deal_activity: select" ON public.deal_activity
  FOR SELECT USING ((select public.is_member()));

-- Стадия хранится ключом enum: подпись у клиента (DEAL_STAGE_LABEL), как приоритет у задач.
CREATE OR REPLACE FUNCTION public.deals_log_activity() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_actor UUID := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.deal_activity (deal_id, actor_id, kind)
    VALUES (NEW.id, COALESCE(v_actor, NEW.created_by), 'created');
    RETURN NEW;
  END IF;

  IF NEW.stage IS DISTINCT FROM OLD.stage THEN
    INSERT INTO public.deal_activity (deal_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'stage', OLD.stage::TEXT, NEW.stage::TEXT);
  END IF;
  IF NEW.amount IS DISTINCT FROM OLD.amount THEN
    INSERT INTO public.deal_activity (deal_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'amount', OLD.amount::TEXT, NEW.amount::TEXT);
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    INSERT INTO public.deal_activity (deal_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'owner',
      public.activity_label((SELECT name FROM public.profiles WHERE id = OLD.owner_id), OLD.owner_id),
      public.activity_label((SELECT name FROM public.profiles WHERE id = NEW.owner_id), NEW.owner_id));
  END IF;
  IF NEW.expected_close IS DISTINCT FROM OLD.expected_close THEN
    INSERT INTO public.deal_activity (deal_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'expected_close', OLD.expected_close::TEXT, NEW.expected_close::TEXT);
  END IF;
  IF NEW.title IS DISTINCT FROM OLD.title THEN
    INSERT INTO public.deal_activity (deal_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'title', OLD.title, NEW.title);
  END IF;
  IF NEW.client_id IS DISTINCT FROM OLD.client_id THEN
    INSERT INTO public.deal_activity (deal_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'client',
      public.activity_label((SELECT name FROM public.clients WHERE id = OLD.client_id), OLD.client_id),
      public.activity_label((SELECT name FROM public.clients WHERE id = NEW.client_id), NEW.client_id));
  END IF;
  IF NEW.lost_reason IS DISTINCT FROM OLD.lost_reason THEN
    INSERT INTO public.deal_activity (deal_id, actor_id, kind, from_value, to_value)
    VALUES (NEW.id, v_actor, 'lost_reason', OLD.lost_reason, NEW.lost_reason);
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.deals_log_activity() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_deals_log_activity AFTER INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.deals_log_activity();

ALTER PUBLICATION supabase_realtime ADD TABLE public.deal_activity;

INSERT INTO public.app_migrations (name) VALUES ('027_deal_activity');
