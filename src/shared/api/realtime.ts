import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '../supabase/client';
import { keys } from './keys';

/** Таблица → какие кеши сбрасывать. Payload не разбираем: нужен только факт изменения. */
const TABLE_KEYS: Record<string, ReadonlyArray<readonly string[]>> = {
  tasks: [keys.tasks.all],
  ideas: [keys.ideas.all],
  deals: [keys.deals.all],
  idea_votes: [keys.ideas.all],
  // Лента клиента собирается из комментариев и историй задач и сделок.
  comments: [keys.comments.all, keys.clientFeed.all],
  idea_comments: [keys.ideaComments.all],
  task_activity: [keys.activity.all, keys.clientFeed.all],
  deal_activity: [keys.dealActivity.all, keys.clientFeed.all],
  // Пункты чек-листа приезжают вложенными в задачи — сбрасываем кеш задач.
  task_checklist_items: [keys.tasks.all],
  task_attachments: [keys.tasks.all],
  stages: [keys.stages.all],
  clients: [keys.clients.all],
  // Контакты приезжают вложенными в клиентов.
  client_contacts: [keys.clients.all],
  profiles: [keys.profiles.all],
  app_settings: [keys.settings],
  invites: [keys.invites],
  task_templates: [keys.templates],
  task_recurrences: [keys.recurrences],
  notifications: [keys.notifications.all],
};

/** Один канал на приложение; монтируется в Layout, живёт пока пользователь внутри. */
export function useRealtimeInvalidation(): void {
  const qc = useQueryClient();
  useEffect(() => {
    let channel = supabase.channel('db-changes');
    for (const [table, list] of Object.entries(TABLE_KEYS)) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        for (const key of list) void qc.invalidateQueries({ queryKey: key });
      });
    }
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}
