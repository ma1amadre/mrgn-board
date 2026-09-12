import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../supabase/client';
import { keys } from './keys';

/** Таблица → какой кеш сбрасывать. Payload не разбираем: нужен только факт изменения. */
const TABLE_KEYS: Record<string, readonly string[]> = {
  tasks: keys.tasks.all,
  ideas: keys.ideas.all,
  idea_votes: keys.ideas.all,
  comments: keys.comments.all,
  stages: keys.stages.all,
  clients: keys.clients.all,
  profiles: keys.profiles.all,
  app_settings: keys.settings,
};

/** Один канал на приложение; монтируется в Layout, живёт пока пользователь внутри. */
export function useRealtimeInvalidation(): void {
  const qc = useQueryClient();
  useEffect(() => {
    let channel = supabase.channel('db-changes');
    for (const [table, key] of Object.entries(TABLE_KEYS)) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        void qc.invalidateQueries({ queryKey: key });
      });
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}
