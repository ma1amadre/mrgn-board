import { useState, type FormEvent } from 'react';
import { useInviteMember, useInvites, type InviteResult } from '../../shared/api/invites';
import { formatDateTime } from '../../shared/lib/dates';
import { ROLE_LABEL, type ProfileRole } from '../../shared/lib/labels';
import { Field } from '../../shared/ui/Field';
import { useToast } from '../../shared/ui/toastContext';

const RESULT_MESSAGE: Record<InviteResult, string> = {
  sent: 'Приглашение отправлено. Аккаунт появится в списке, как только письмо уйдёт.',
  exists: 'У этого адреса уже есть аккаунт.',
  no_key: 'Приглашения не настроены: нет service_role-ключа в Vault (см. подсказку ниже).',
  no_url: 'Приглашения не настроены: нет auth_url в настройках.',
};

const VAULT_SQL = `select vault.create_secret('<service_role key>', 'service_role_key');`;

/** Только для админа: форма приглашения и список ещё не принятых. */
export function InvitePanel() {
  const toast = useToast();
  const invites = useInvites(true);
  const invite = useInviteMember();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProfileRole>('member');
  const [showHelp, setShowHelp] = useState(false);

  const send = (value: string, r: ProfileRole) => {
    invite.mutate(
      { email: value.trim(), role: r },
      {
        onSuccess: (result) => {
          toast.show(RESULT_MESSAGE[result], result === 'sent' ? 'success' : 'info');
          if (result === 'sent') setEmail('');
          if (result === 'no_key' || result === 'no_url') setShowHelp(true);
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    send(email, role);
  };

  const pending = (invites.data ?? []).filter((i) => i.accepted_at === null);

  return (
    <section className="card stack">
      <h3 className="card-title">Пригласить участника</h3>
      <form className="row" onSubmit={submit}>
        <Field label="Email">
          <input
            className="input"
            type="email"
            required
            placeholder="name@mrgn.team"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Роль">
          <select
            className="select"
            value={role}
            onChange={(e) => setRole(e.target.value as ProfileRole)}
          >
            <option value="member">{ROLE_LABEL.member}</option>
            <option value="admin">{ROLE_LABEL.admin}</option>
          </select>
        </Field>
        <button type="submit" className="btn btn-primary" disabled={invite.isPending}>
          Пригласить
        </button>
      </form>
      <p className="muted small">
        Придёт письмо со ссылкой: по ней человек попадает в приложение и задаёт пароль. Доступ
        включается сразу.{' '}
        <button type="button" className="link-button" onClick={() => setShowHelp((v) => !v)}>
          {showHelp ? 'Скрыть настройку' : 'Как настроить'}
        </button>
      </p>
      {showHelp ? (
        <div className="stack small">
          <p>
            Письма шлёт база через GoTrue, ключ <code>service_role</code> берётся из Vault. Один
            раз, в Supabase → SQL Editor (ключ — Project Settings → API):
          </p>
          <pre className="prewrap">
            <code>{VAULT_SQL}</code>
          </pre>
          <p>
            Адрес GoTrue лежит в настройках как <code>auth_url</code>; в облаке уже заполнен.
          </p>
        </div>
      ) : null}
      {pending.length > 0 ? (
        <div className="stack small">
          <div className="muted">Ждут принятия</div>
          {pending.map((i) => (
            <div key={i.email} className="row">
              <span>{i.email}</span>
              <span className="badge">{ROLE_LABEL[i.role]}</span>
              <span className="muted">{formatDateTime(i.created_at)}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => send(i.email, i.role)}
                disabled={invite.isPending}
              >
                Отправить ещё раз
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
