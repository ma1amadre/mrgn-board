-- 014_deals_delete: удалять сделку может её автор или админ — как у идей, а не как у задач.
-- Сделка с суммой и историей переговоров — не то, что стоит терять по случайному клику коллеги.

DROP POLICY "deals: delete" ON public.deals;
CREATE POLICY "deals: delete" ON public.deals
  FOR DELETE USING ((select public.is_admin()) OR ((select public.is_member()) AND created_by = (select auth.uid())));

INSERT INTO public.app_migrations (name) VALUES ('014_deals_delete');
