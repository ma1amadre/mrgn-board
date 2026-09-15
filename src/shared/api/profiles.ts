import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { keys } from './keys';
import type { Profile, Updates } from './types';

export async function fetchProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase.from('profiles').select('*').order('name');
  if (error) throw error;
  return data;
}

export function useProfiles() {
  return useQuery({ queryKey: keys.profiles.all, queryFn: fetchProfiles });
}

export type ProfilePatch = Pick<
  Updates<'profiles'>,
  | 'name'
  | 'telegram'
  | 'telegram_chat_id'
  | 'color'
  | 'role'
  | 'is_active'
  | 'notify_assigned'
  | 'notify_comments'
  | 'notify_mentions'
  | 'notify_digest'
>;

/** RLS молча отфильтровывает чужие строки: без select() UPDATE «успешен» с нулём строк. */
export async function updateProfile(id: string, patch: ProfilePatch): Promise<void> {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select('id');
  if (error) throw error;
  if (data.length === 0) throw new Error('Недостаточно прав для этого действия');
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProfilePatch }) => updateProfile(id, patch),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.profiles.all }),
  });
}
