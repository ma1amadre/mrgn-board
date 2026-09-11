import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { env } from './env';

/** Единственный клиент на приложение; anon-ключ, права — на стороне RLS. */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
