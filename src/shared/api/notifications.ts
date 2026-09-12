import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { keys } from './keys';

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
