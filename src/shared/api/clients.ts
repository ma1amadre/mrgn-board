import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { assertAffected } from './assert';
import { keys } from './keys';
import type { ClientWithContacts, Inserts, Updates } from './types';

const CLIENT_SELECT = '*, contacts:client_contacts(*)';

export async function fetchClients(): Promise<ClientWithContacts[]> {
  const { data, error } = await supabase
    .from('clients')
    .select(CLIENT_SELECT)
    .is('archived_at', null)
    .order('name');
  if (error) throw error;
  return data as ClientWithContacts[];
}

export async function fetchArchivedClients(): Promise<ClientWithContacts[]> {
  const { data, error } = await supabase
    .from('clients')
    .select(CLIENT_SELECT)
    .not('archived_at', 'is', null)
    .order('archived_at', { ascending: false });
  if (error) throw error;
  return data as ClientWithContacts[];
}

export function useArchivedClients() {
  return useQuery({ queryKey: keys.clients.archived, queryFn: fetchArchivedClients });
}

export function useClients() {
  return useQuery({ queryKey: keys.clients.all, queryFn: fetchClients });
}

export async function createClient(input: Inserts<'clients'>): Promise<ClientWithContacts> {
  const { data, error } = await supabase
    .from('clients')
    .insert(input)
    .select(CLIENT_SELECT)
    .single();
  if (error) throw error;
  return data as ClientWithContacts;
}

export async function updateClient(id: string, patch: Updates<'clients'>): Promise<void> {
  const { data, error } = await supabase.from('clients').update(patch).eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export async function deleteClient(id: string): Promise<void> {
  const { data, error } = await supabase.from('clients').delete().eq('id', id).select('id');
  if (error) throw error;
  assertAffected(data);
}

export function useClientMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: keys.clients.all });
    // У задач подтянуто имя клиента — после правки/удаления оно устарело.
    void qc.invalidateQueries({ queryKey: keys.tasks.all });
    void qc.invalidateQueries({ queryKey: keys.deals.all });
  };
  return {
    create: useMutation({ mutationFn: createClient, onSettled: invalidate }),
    update: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: Updates<'clients'> }) =>
        updateClient(id, patch),
      onSettled: invalidate,
    }),
    remove: useMutation({ mutationFn: deleteClient, onSettled: invalidate }),
  };
}
