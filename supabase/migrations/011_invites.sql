-- 011_invites: приглашение участника из приложения.
-- Аккаунт создаёт GoTrue по admin-запросу /invite; его шлёт сама база через pg_net с
-- service_role-ключом из Vault (как токен Telegram) — приложение ключ не видит. Приглашённый
-- включается сразу: handle_new_user смотрит в invites и ставит is_active вместе с ролью.

CREATE TABLE public.invites (
  email       TEXT PRIMARY KEY,
  invited_by  UUID NOT NULL REFERENCES public.profiles(id),
  role        public.profile_role NOT NULL DEFAULT 'member',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);
COMMENT ON TABLE public.invites IS 'Кого пригласили; email в нижнем регистре. Пишет только RPC invite_member.';

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invites: select" ON public.invites
  FOR SELECT USING ((select public.is_admin()));

-- Куда базе стучаться за приглашением: у облака свой адрес, локально — kong внутри docker-сети.
INSERT INTO public.app_settings (key, value)
VALUES ('auth_url', 'https://zhmmutzbbecicguzsuve.supabase.co/auth/v1')
ON CONFLICT (key) DO NOTHING;

-- Приглашённый пользователь получает профиль сразу активным и с назначенной ролью.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  palette  TEXT[] := ARRAY['#0b6e5c', '#1b5fa6', '#8f5c00', '#b3261e', '#2f9c86', '#6e7576'];
  v_invite public.invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM public.invites WHERE email = lower(COALESCE(NEW.email, ''));
  INSERT INTO public.profiles (id, email, name, color, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'name', ''), split_part(COALESCE(NEW.email, 'user'), '@', 1)),
    palette[1 + floor(random() * array_length(palette, 1))::int],
    COALESCE(v_invite.role, 'member'),
    v_invite.email IS NOT NULL
  );
  IF v_invite.email IS NOT NULL THEN
    UPDATE public.invites SET accepted_at = NOW() WHERE email = v_invite.email;
  END IF;
  RETURN NEW;
END;
$$;

-- Ответ: sent | exists | no_key | no_url. Отправка асинхронная (pg_net), результат — в
-- net._http_response; приглашённый появится в «Команде», когда GoTrue создаст пользователя.
CREATE OR REPLACE FUNCTION public.invite_member(p_email TEXT, p_role public.profile_role DEFAULT 'member')
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  v_email TEXT := lower(btrim(p_email));
  v_key   TEXT;
  v_url   TEXT;
  v_site  TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'only admin can invite' USING ERRCODE = '42501';
  END IF;
  IF v_email !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' THEN
    RAISE EXCEPTION 'invalid email' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = v_email) THEN
    RETURN 'exists';
  END IF;
  SELECT decrypted_secret INTO v_key FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
  IF v_key IS NULL OR v_key = '' THEN
    RETURN 'no_key';
  END IF;
  SELECT value INTO v_url FROM public.app_settings WHERE key = 'auth_url';
  IF v_url IS NULL OR v_url = '' THEN
    RETURN 'no_url';
  END IF;
  SELECT value INTO v_site FROM public.app_settings WHERE key = 'site_url';

  INSERT INTO public.invites (email, invited_by, role)
  VALUES (v_email, auth.uid(), p_role)
  ON CONFLICT (email) DO UPDATE
    SET invited_by = EXCLUDED.invited_by, role = EXCLUDED.role, created_at = NOW(), accepted_at = NULL;

  -- needs_password в metadata: по ссылке из письма человек попадает в приложение уже с сессией,
  -- но без пароля — приложение по этому флагу уводит его на форму нового пароля.
  PERFORM net.http_post(
    url := v_url || '/invite?redirect_to=' || COALESCE(v_site, '') || '/reset-password',
    body := jsonb_build_object('email', v_email, 'data', jsonb_build_object('needs_password', true)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', v_key,
      'Authorization', 'Bearer ' || v_key
    )
  );
  RETURN 'sent';
END;
$$;
REVOKE EXECUTE ON FUNCTION public.invite_member(TEXT, public.profile_role) FROM PUBLIC, anon;

ALTER PUBLICATION supabase_realtime ADD TABLE public.invites;

INSERT INTO public.app_migrations (name) VALUES ('011_invites');
