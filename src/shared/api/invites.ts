import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProfileRole } from '../lib/labels';
import { supabase } from '../supabase/client';
import { keys } from './keys';
import type { Tables } from './types';

export type Invite = Tables<'invites'>;
export type InviteResult = 'sent' | 'exists' | 'no_key' | 'no_url';

/** Список видит только админ (RLS); приглашения без accepted_at — ещё не принятые. */
export async function fetchInvites(): Promise<Invite[]> {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export function useInvites(enabled: boolean) {
  return useQuery({ queryKey: keys.invites, queryFn: fetchInvites, enabled });
}

export async function inviteMember(email: string, role: ProfileRole): Promise<InviteResult> {
  const { data, error } = await supabase.rpc('invite_member', { p_email: email, p_role: role });
  if (error) throw error;
  return data as InviteResult;
}

export function useInviteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: ProfileRole }) =>
      inviteMember(email, role),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.invites }),
  });
}
