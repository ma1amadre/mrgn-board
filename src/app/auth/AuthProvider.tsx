import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { keys } from '../../shared/api/keys';
import { fetchProfile } from '../../shared/api/profiles';
import { supabase } from '../../shared/supabase/client';
import { AuthContext, type AuthStatus, type AuthValue } from './authContext';

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionStatus, setSessionStatus] = useState<AuthStatus>('loading');

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionStatus(data.session ? 'signedIn' : 'signedOut');
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionStatus(next ? 'signedIn' : 'signedOut');
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

  const value = useMemo<AuthValue>(() => {
    const profile = profileQuery.data ?? null;
    const waitingProfile = sessionStatus === 'signedIn' && profileQuery.isPending;
    return {
      status: waitingProfile ? 'loading' : sessionStatus,
      session,
      profile,
      profileError: profileQuery.error,
      isAdmin: profile !== null && profile.is_active && profile.role === 'admin',
      signIn,
      signOut,
    };
  }, [
    profileQuery.data,
    profileQuery.isPending,
    profileQuery.error,
    session,
    sessionStatus,
    signIn,
    signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
