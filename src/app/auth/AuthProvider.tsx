import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { keys } from '../../shared/api/keys';
import { fetchProfile } from '../../shared/api/profiles';
import { supabase } from '../../shared/supabase/client';
import { AuthContext, type AuthStatus, type AuthValue } from './authContext';

/** Адрес формы нового пароля — с учётом base-пути GitHub Pages. */
function resetRedirectUrl(): string {
  return new URL(`${import.meta.env.BASE_URL}reset-password`, window.location.origin).toString();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionStatus, setSessionStatus] = useState<AuthStatus>('loading');
  const [recovery, setRecovery] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionStatus(data.session ? 'signedIn' : 'signedOut');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      setSessionStatus(next ? 'signedIn' : 'signedOut');
      // Ссылка из письма открывает сайт с токеном восстановления: сессия уже есть,
      // но пароль ещё старый — флаг снимается после смены пароля или выхода.
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      // Приглашённый приходит по ссылке уже с сессией, но без пароля (флаг ставит invite_member).
      if (next?.user.user_metadata?.needs_password === true) setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;
  const profileQuery = useQuery({
    queryKey: keys.profiles.me(userId),
    queryFn: () => fetchProfile(userId as string),
    enabled: userId !== null,
    staleTime: 5 * 60_000,
  });

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    queryClient.clear();
  }, [queryClient]);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: resetRedirectUrl(),
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password, data: { needs_password: false } });
    if (error) throw error;
    setRecovery(false);
  }, []);

  const value = useMemo<AuthValue>(() => {
    const profile = profileQuery.data ?? null;
    const waitingProfile = sessionStatus === 'signedIn' && profileQuery.isPending;
    return {
      status: waitingProfile ? 'loading' : sessionStatus,
      session,
      profile,
      profileError: profileQuery.error,
      isAdmin: profile !== null && profile.is_active && profile.role === 'admin',
      recovery,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
    };
  }, [
    profileQuery.data,
    profileQuery.isPending,
    profileQuery.error,
    session,
    sessionStatus,
    recovery,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
