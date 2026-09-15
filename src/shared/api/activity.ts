import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { keys } from './keys';
import type { ActivityWithActor } from './types';

/** Свежие сверху: в ленте важнее последнее изменение. Пишет только триггер в БД. */
export async function fetchActivity(taskId: string): Promise<ActivityWithActor[]> {
  const { data, error } = await supabase
    .from('task_activity')
    .select('*, actor:profiles(id,name,color)')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ActivityWithActor[];
}

export function useActivity(taskId: string, enabled = true) {
  return useQuery({
    queryKey: keys.activity.byTask(taskId),
    queryFn: () => fetchActivity(taskId),
    enabled,
  });
}
