import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useProfile } from '../../app/auth/authContext';
import { useNotifyTest } from '../../shared/api/notifications';
import { useProfiles, useUpdateProfile } from '../../shared/api/profiles';
import type { Profile } from '../../shared/api/types';
import { ROLE_LABEL } from '../../shared/lib/labels';
import { Avatar } from '../../shared/ui/Avatar';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Modal } from '../../shared/ui/Modal';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonRows } from '../../shared/ui/Skeleton';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { InvitePanel } from './InvitePanel';
import { ProfileForm, type ProfileFormValues } from './ProfileForm';

const TEST_MESSAGE = {
  sent: 'Сообщение отправлено, проверьте Telegram.',
  no_chat_id: 'Сначала укажите chat ID в профиле.',
  no_token: 'Бот ещё не настроен администратором.',
} as const;

export function TeamPage() {
  const me = useProfile();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const profiles = useProfiles();
  const update = useUpdateProfile();
  const test = useNotifyTest();
  const [editing, setEditing] = useState<Profile | null>(null);
  const [draftDirty, setDraftDirty] = useState(false);
  useDocumentTitle('Команда');

  const save = (values: ProfileFormValues) => {
    if (!editing) return;
    const patch = {
      name: values.name,
      telegram: values.telegram || null,
      telegram_chat_id: values.telegram_chat_id ? Number(values.telegram_chat_id) : null,
      color: values.color,
      // role/is_active в форме есть только у админа; участник их не отправляет.
      ...(isAdmin ? { role: values.role, is_active: values.is_active } : {}),
    };
    update.mutate(
      { id: editing.id, patch },
      { onSuccess: () => setEditing(null), onError: (err) => toast.error(err) },
    );
  };

  const runTest = () => {
    test.mutate(undefined, {
      onSuccess: (result) =>
        toast.show(TEST_MESSAGE[result], result === 'sent' ? 'success' : 'info'),
      onError: (err) => toast.error(err),
    });
  };

  return (
    <>
      <PageHead
        title="Команда"
        actions={
          isAdmin ? (
            <Link className="btn btn-secondary" to="/settings/notifications">
              Настройка уведомлений
            </Link>
          ) : null
        }
      />
      {isAdmin ? <InvitePanel /> : null}
      {profiles.isPending ? <SkeletonRows rows={4} /> : null}
      {profiles.isError ? <EmptyState>Не удалось загрузить команду.</EmptyState> : null}
      {profiles.data ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Участник</th>
                <th>Email</th>
                <th>Telegram</th>
                <th>Уведомления</th>
                <th>Роль</th>
                <th>Доступ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {profiles.data.map((p) => (
                <tr key={p.id}>
                  <td>
                    <span className="row">
                      <Avatar name={p.name} color={p.color} />
                      {p.name}
                      {p.id === me.id ? <span className="muted small">(вы)</span> : null}
                    </span>
                  </td>
                  <td className="muted">{p.email}</td>
                  <td className="muted">{p.telegram ? `@${p.telegram}` : '—'}</td>
                  <td>
                    {p.telegram_chat_id !== null ? (
                      <span className="row">
                        <span className="badge badge-success">Подключены</span>
                        {p.id === me.id ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={runTest}
                            disabled={test.isPending}
                          >
                            Проверить
                          </button>
                        ) : null}
                      </span>
                    ) : (
                      <span className="badge">Нет</span>
                    )}
                  </td>
                  <td>
                    <span className={p.role === 'admin' ? 'badge badge-accent' : 'badge'}>
                      {ROLE_LABEL[p.role]}
                    </span>
                  </td>
                  <td>
                    {p.is_active ? (
                      <span className="badge badge-success">Включён</span>
                    ) : (
                      <span className="badge badge-warning">Выключен</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {isAdmin || p.id === me.id ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setEditing(p)}
                      >
                        Изменить
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {editing ? (
        <Modal
          title={editing.id === me.id ? 'Мой профиль' : editing.name}
          onClose={() => setEditing(null)}
          dirty={draftDirty}
        >
          <ProfileForm
            profile={editing}
            adminFields={isAdmin}
            busy={update.isPending}
            onSubmit={save}
            onCancel={() => setEditing(null)}
            onDirtyChange={setDraftDirty}
          />
          {editing.id === me.id ? (
            <p className="small" style={{ marginTop: 'var(--s-3)' }}>
              <Link className="link" to="/reset-password">
                Сменить пароль
              </Link>
            </p>
          ) : null}
        </Modal>
      ) : null}
    </>
  );
}
