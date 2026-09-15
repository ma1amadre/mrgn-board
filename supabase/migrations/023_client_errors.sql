-- 023_client_errors: журнал ошибок клиента.
-- Ошибки рендера и необработанные исключения в браузере участника ложатся в таблицу через RPC;
-- админ видит их в настройках. Без этого узнать о сломанной странице можно было только из консоли
-- на чужом ноутбуке. Лимит 20 записей в час на участника — чтобы зацикленная ошибка не залила базу.

CREATE TABLE public.client_errors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  message    TEXT NOT NULL,
  stack      TEXT,
  url        TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_client_errors_created ON public.client_errors (created_at DESC);

-- Читает админ; пишет только RPC (SECURITY DEFINER), удаляет админ.
ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_errors: select" ON public.client_errors
  FOR SELECT USING ((select public.is_admin()));
CREATE POLICY "client_errors: delete" ON public.client_errors
  FOR DELETE USING ((select public.is_admin()));

CREATE OR REPLACE FUNCTION public.log_client_error(p_message TEXT, p_stack TEXT, p_url TEXT, p_user_agent TEXT)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_member() THEN RETURN; END IF;
  IF (SELECT count(*) FROM public.client_errors
      WHERE profile_id = auth.uid() AND created_at > now() - INTERVAL '1 hour') >= 20 THEN
    RETURN;
  END IF;
  INSERT INTO public.client_errors (profile_id, message, stack, url, user_agent)
  VALUES (auth.uid(), left(p_message, 500), left(p_stack, 4000), left(p_url, 500), left(p_user_agent, 300));
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_client_error(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;

INSERT INTO public.app_migrations (name) VALUES ('023_client_errors');
