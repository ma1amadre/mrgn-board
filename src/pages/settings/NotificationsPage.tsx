import { useState, type FormEvent } from 'react';
import { useNotifyStatus } from '../../shared/api/notifications';
import { useAppSettings, useSaveSetting, type AppSettings } from '../../shared/api/settings';
import { formatDateTime } from '../../shared/lib/dates';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Field } from '../../shared/ui/Field';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonRows } from '../../shared/ui/Skeleton';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';

const VAULT_SQL = `select vault.create_secret('<токен от BotFather>', 'telegram_bot_token');`;

function Check({ ok, children }: { ok: boolean; children: string }) {
  return (
    <div className="row">
      <span className={ok ? 'badge badge-success' : 'badge badge-warning'}>
        {ok ? 'Да' : 'Нет'}
      </span>
      <span>{children}</span>
    </div>
  );
}

/** Монтируется, когда настройки загружены: начальные значения берутся из них один раз. */
function SettingsForm({ initial }: { initial: AppSettings }) {
  const toast = useToast();
  const save = useSaveSetting();
  const [bot, setBot] = useState(initial.telegram_bot ?? '');
  const [siteUrl, setSiteUrl] = useState(initial.site_url ?? '');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const jobs = [
      { key: 'telegram_bot', value: bot.trim().replace(/^@/, '') },
      { key: 'site_url', value: siteUrl.trim().replace(/\/$/, '') },
    ];
    Promise.all(jobs.map((j) => save.mutateAsync(j)))
      .then(() => toast.show('Настройки сохранены', 'success'))
      .catch((err: unknown) => toast.error(err));
  };

  return (
    <form className="card form" onSubmit={submit}>
      <h3 className="card-title">Параметры</h3>
      <Field label="Юзернейм бота" hint="Показывается участникам в подсказке к chat ID.">
        <input
          className="input"
          placeholder="mrgn_board_bot"
          value={bot}
          onChange={(e) => setBot(e.target.value)}
        />
      </Field>
      <Field label="Адрес приложения" hint="Из него собираются ссылки на задачи в сообщениях.">
        <input
          className="input"
          type="url"
          value={siteUrl}
          onChange={(e) => setSiteUrl(e.target.value)}
        />
      </Field>
      <div className="modal-actions">
        <button type="submit" className="btn btn-primary" disabled={save.isPending}>
          Сохранить
        </button>
      </div>
    </form>
  );
}

export function NotificationsPage() {
  const settings = useAppSettings();
  const status = useNotifyStatus(true);
  useDocumentTitle('Уведомления');

  return (
    <>
      <PageHead title="Уведомления в Telegram" />
      <p className="muted">
        База сама шлёт сообщения через Bot API: назначение задачи, новый комментарий к вашей задаче
        и утренняя сводка по срокам в 09:00 по Москве в будни.
      </p>

      <section className="card">
        <h3 className="card-title">Состояние</h3>
        {status.isPending ? <SkeletonRows rows={3} /> : null}
        {status.isError ? <EmptyState>Не удалось получить состояние.</EmptyState> : null}
        {status.data ? (
          <div className="stack">
            <Check ok={status.data.token_set}>Токен бота сохранён в Vault</Check>
            <Check ok={status.data.digest_scheduled}>Утренняя сводка по расписанию</Check>
            <Check ok={status.data.linked_profiles > 0}>
              {`Участников с chat ID: ${status.data.linked_profiles}`}
            </Check>
            {status.data.last_at ? (
              <p className="small muted">
                Последний ответ Telegram: {status.data.last_status ?? '—'} ·{' '}
                {formatDateTime(status.data.last_at)}
                {status.data.last_status !== 200 && status.data.last_response
                  ? ` · ${status.data.last_response}`
                  : ''}
              </p>
            ) : (
              <p className="small muted">Отправок ещё не было.</p>
            )}
          </div>
        ) : null}
      </section>

      {settings.data ? <SettingsForm initial={settings.data} /> : null}

      <section className="card">
        <h3 className="card-title">Как подключить</h3>
        <ol className="stack" style={{ margin: 0, paddingLeft: 'var(--s-5)' }}>
          <li>
            В Telegram у @BotFather: <code>/newbot</code>, придумать имя и юзернейм. BotFather
            выдаст токен.
          </li>
          <li>
            Supabase → SQL Editor, выполнить (токен вставить вместо плейсхолдера):
            <pre className="prewrap">
              <code>{VAULT_SQL}</code>
            </pre>
            Токен хранится в Vault, из приложения он не читается.
          </li>
          <li>Вписать юзернейм бота в форму выше.</li>
          <li>
            Каждый участник: открыть бота, нажать Start, узнать свой ID у @userinfobot и вписать его
            в свой профиль на странице «Команда». Кнопка «Проверить» там же пришлёт пробное
            сообщение.
          </li>
        </ol>
      </section>
    </>
  );
}
