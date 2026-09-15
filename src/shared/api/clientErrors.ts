import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client';
import { keys } from './keys';
import type { Tables } from './types';

export type ClientError = Tables<'client_errors'>;

/** Одну и ту же ошибку за сессию шлём один раз: зацикленный рендер и так забьёт лимит в базе. */
const seen = new Set<string>();

/** Не бросает никогда: журнал ошибок не должен ломать то, что и так сломалось. */
export function reportClientError(error: unknown, source: string): void {
  const err = error instanceof Error ? error : new Error(String(error));
  const key = `${source}:${err.message}`;
  if (seen.has(key)) return;
  seen.add(key);
  void supabase
    .rpc('log_client_error', {
      p_message: `[${source}] ${err.message}`,
      p_stack: err.stack ?? '',
      p_url: window.location.href,
      p_user_agent: navigator.userAgent,
    })
    .then(({ error: rpcError }) => {
      if (rpcError) console.warn('Не удалось записать ошибку в журнал', rpcError);
    });
}

/** Глобальные ловушки: необработанные исключения и промисы. Вешается один раз при старте. */
export function installErrorReporting(): void {
  window.addEventListener('error', (e) => reportClientError(e.error ?? e.message, 'window'));
  window.addEventListener('unhandledrejection', (e) => reportClientError(e.reason, 'promise'));
}

export async function fetchClientErrors(): Promise<ClientError[]> {
  const { data, error } = await supabase
    .from('client_errors')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

export function useClientErrors() {
  return useQuery({ queryKey: keys.clientErrors, queryFn: fetchClientErrors });
}

export async function clearClientErrors(): Promise<void> {
  const { error } = await supabase.from('client_errors').delete().not('id', 'is', null);
  if (error) throw error;
}

export function useClearClientErrors() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clearClientErrors,
    onSettled: () => qc.invalidateQueries({ queryKey: keys.clientErrors }),
  });
}
