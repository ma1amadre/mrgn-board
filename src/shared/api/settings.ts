import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { keys } from './keys';

export type AppSettings = Record<string, string>;

export async function fetchSettings(): Promise<AppSettings> {
  const { data, error } = await supabase.from('app_settings').select('key,value');
  if (error) throw error;
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

export function useAppSettings() {
  return useQuery({ queryKey: keys.settings, queryFn: fetchSettings, staleTime: 5 * 60_000 });
}

/** Ключи заведены миграцией, поэтому upsert по key: INSERT-политика тоже только для админа. */
export async function saveSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('app_settings')
    .upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
}

export function useSaveSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => saveSetting(key, value),
    onSettled: () => qc.invalidateQueries({ queryKey: keys.settings }),
  });
}
