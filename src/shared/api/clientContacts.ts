import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { Inserts, Updates } from './types';

/** Контакты приезжают вложенными в клиента (embed в fetchClients) — отдельного запроса нет. */
export async function addContact(input: Inserts<'client_contacts'>): Promise<void> {
  const { error } = await supabase.from('client_contacts').insert(input);
  if (error) throw error;
}

export async function updateContact(id: string, patch: Updates<'client_contacts'>): Promise<void> {
  const { data, error } = await supabase
    .from('client_contacts')
    .update(patch)
    .eq('id', id)
    .select('id');
  if (error) throw error;
  assertAffected(data);
}

export async function deleteContact(id: string): Promise<void> {
  const { data, error } = await supabase.from('client_contacts').delete().eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export function useContactMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: keys.clients.all });
  return {
    add: useMutation({ mutationFn: addContact, onSettled: invalidate }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Updates<'client_contacts'> }) =>
        updateContact(id, patch),
      onSettled: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteContact, onSettled: invalidate }),
  };
}
