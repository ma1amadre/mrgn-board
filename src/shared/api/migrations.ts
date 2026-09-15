import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { keys } from './keys';

/** Имена файлов из supabase/migrations — код рассчитывает ровно на эту схему. */
export const EXPECTED_MIGRATIONS = [
  '001_schema',
  '002_rls',
  '003_seed_realtime',
  '004_notifications',
  '005_activity',
  '006_checklists',
  '007_labels',
  '008_mentions',
  '009_attachments',
  '010_deals',
  '011_invites',
  '012_idea_comments',
  '013_task_templates',
  '014_deals_delete',
] as const;

export async function fetchAppliedMigrations(): Promise<string[]> {
  const { data, error } = await supabase.from('app_migrations').select('name');
  if (error) throw error;
  return data.map((row) => row.name);
}

/** Какие миграции ещё не применены к базе, к которой подключён клиент. */
export function useMissingMigrations(): string[] {
  const applied = useQuery({
    queryKey: keys.migrations,
    queryFn: fetchAppliedMigrations,
    staleTime: Infinity,
  });
  if (!applied.data) return [];
  return EXPECTED_MIGRATIONS.filter((name) => !applied.data.includes(name));
}
