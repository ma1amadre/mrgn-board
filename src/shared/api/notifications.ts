import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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

export const RECENT_LIMIT = 30;
export const PAGE_SIZE = 50;

/** Последние уведомления для колокольчика — RLS отдаёт только свои. */
export async function fetchRecentNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(RECENT_LIMIT);
  if (error) throw error;
  return data;
}

export function useRecentNotifications() {
  return useQuery({ queryKey: keys.notifications.recent, queryFn: fetchRecentNotifications });
}

/** Непрочитанных всего — отдельным count, а не длиной списка: список обрезан лимитом. */
export async function fetchUnreadCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export function useUnreadCount() {
  return useQuery({ queryKey: keys.notifications.unread, queryFn: fetchUnreadCount });
}

/** Страница истории: курсор — created_at последней строки предыдущей страницы. */
export async function fetchNotificationsPage(
  onlyUnread: boolean,
  before: string | null,
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (onlyUnread) query = query.is('read_at', null);
  if (before) query = query.lt('created_at', before);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export function useNotificationsHistory(onlyUnread: boolean) {
  return useInfiniteQuery({
    queryKey: keys.notifications.history(onlyUnread),
    queryFn: ({ pageParam }) => fetchNotificationsPage(onlyUnread, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) =>
      last.length < PAGE_SIZE ? undefined : (last[last.length - 1]?.created_at ?? undefined),
  });
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
    onSettled: () => qc.invalidateQueries({ queryKey: keys.notifications.all }),
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSettled: () => qc.invalidateQueries({ queryKey: keys.notifications.all }),
  });
}
