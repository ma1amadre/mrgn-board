import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { keys } from './keys';
import type { Tables } from './types';

export type NotifyTestResult = 'sent' | 'no_chat_id' | 'no_token';

/** Пробное сообщение себе; ответ говорит, чего не хватает для связи. */
export async function notifyTest(): Promise<NotifyTestResult> {
  const { data, error } = await supabase.rpc('notify_test');
  if (error) throw error;
  return data as NotifyTestResult;
}

export function useNotifyTest() {
  return useMutation({ mutationFn: notifyTest });
}

export type NotifyStatus = {
  token_set: boolean;
  digest_scheduled: boolean;
  linked_profiles: number;
  last_status: number | null;
  last_response: string | null;
  last_at: string | null;
};

/** Состояние настройки уведомлений; RPC отвечает только админу. */
export async function fetchNotifyStatus(): Promise<NotifyStatus> {
  const { data, error } = await supabase.rpc('notify_status');
  if (error) throw error;
  return data as NotifyStatus;
}

export function useNotifyStatus(enabled: boolean) {
  return useQuery({
    queryKey: keys.notifyStatus,
    queryFn: fetchNotifyStatus,
    enabled,
    staleTime: 10_000,
  });
}

export type Notification = Tables<'notifications'>;

/** Последние 50 своих уведомлений — RLS отдаёт только свои. */
export async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

export function useNotifications() {
  return useQuery({ queryKey: keys.notifications, queryFn: fetchNotifications });
}

export async function markRead(ids: string[]): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', ids);
  if (error) throw error;
}

export async function markAllRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markRead,
    onSettled: () => qc.invalidateQueries({ queryKey: keys.notifications }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSettled: () => qc.invalidateQueries({ queryKey: keys.notifications }),
  });
}
