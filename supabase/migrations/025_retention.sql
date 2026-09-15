-- 025_retention: уборка журналов.
-- Уведомления и ошибки клиента копились без ограничения. Раз в сутки удаляем прочитанные
-- уведомления старше 90 дней, любые старше 180 и ошибки старше 30 дней.

CREATE OR REPLACE FUNCTION public.cleanup_logs()
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_n INTEGER := 0;
  v_k INTEGER;
BEGIN
  DELETE FROM public.notifications
  WHERE (read_at IS NOT NULL AND created_at < now() - INTERVAL '90 days')
     OR created_at < now() - INTERVAL '180 days';
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
  DELETE FROM public.client_errors WHERE created_at < now() - INTERVAL '30 days';
  GET DIAGNOSTICS v_k = ROW_COUNT; v_n := v_n + v_k;
  RETURN v_n;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.cleanup_logs() FROM PUBLIC, anon, authenticated;

SELECT cron.schedule('mrgn-board-cleanup', '30 3 * * *', $$SELECT public.cleanup_logs()$$);

INSERT INTO public.app_migrations (name) VALUES ('025_retention');
