// Тестовые пользователи для ЛОКАЛЬНОГО стека (npx supabase start). Использует service role,
// поэтому в облако не ходит: URL обязан быть 127.0.0.1/localhost.
// Запуск (Git Bash):  . <(npx supabase status -o env) && node scripts/local-users.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.API_URL ?? process.env.SUPABASE_URL;
const key = process.env.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Нужны API_URL и SERVICE_ROLE_KEY — возьмите из `npx supabase status -o env`.');
  process.exit(1);
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url)) {
  console.error(`Отказ: ${url} не локальный стек.`);
  process.exit(1);
}

const USERS = [
  { email: 'admin@local.test', password: 'local-admin-1', name: 'Женя' },
  { email: 'member@local.test', password: 'local-member-1', name: 'Алик' },
  { email: 'third@local.test', password: 'local-third-1', name: 'Руслан' },
];

const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

for (const u of USERS) {
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { name: u.name },
  });
  if (error) console.error(`${u.email}: ${error.message}`);
  else console.log(`created ${u.email} ${data.user.id}`);
}
