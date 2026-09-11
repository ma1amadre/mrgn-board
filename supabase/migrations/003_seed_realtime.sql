-- 003_seed_realtime: стартовые стадии и публикация realtime.

INSERT INTO public.stages (name, position, color, is_terminal) VALUES
  ('Бэклог',      1000, NULL,      FALSE),
  ('В работе',    2000, '#1b5fa6', FALSE),
  ('На проверке', 3000, '#8f5c00', FALSE),
  ('Готово',      4000, '#1b7f3b', TRUE);

-- Клиент подписывается на изменения этих таблиц и сбрасывает кеш запросов.
ALTER PUBLICATION supabase_realtime ADD TABLE
  public.tasks, public.ideas, public.idea_votes, public.comments,
  public.stages, public.clients, public.profiles;

INSERT INTO public.app_migrations (name) VALUES ('003_seed_realtime');
