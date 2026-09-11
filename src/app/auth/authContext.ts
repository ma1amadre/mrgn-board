import type { Session } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';
import type { Profile } from '../../shared/api/types';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export type AuthValue = {
  status: AuthStatus;
  session: Session | null;
  /** null, пока грузится или строки profiles нет (RLS / триггер не отработал). */
  profile: Profile | null;
  profileError: unknown;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth вызван вне AuthProvider');
  return ctx;
}

/** Профиль текущего пользователя — только под RequireAuth, где он гарантированно есть. */
export function useProfile(): Profile {
  const { profile } = useAuth();
  if (!profile) throw new Error('useProfile вызван вне RequireAuth');
  return profile;
}
