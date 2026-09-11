import { useState } from 'react';
import { useAuth, useProfile } from '../../app/auth/authContext';
import { useProfiles, useUpdateProfile } from '../../shared/api/profiles';
import type { Profile } from '../../shared/api/types';
import { ROLE_LABEL } from '../../shared/lib/labels';
import { Avatar } from '../../shared/ui/Avatar';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Modal } from '../../shared/ui/Modal';
import { PageHead } from '../../shared/ui/PageHead';
import { useToast } from '../../shared/ui/toastContext';
import { ProfileForm, type ProfileFormValues } from './ProfileForm';

export function TeamPage() {
  const me = useProfile();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const profiles = useProfiles();
  const update = useUpdateProfile();
  const [editing, setEditing] = useState<Profile | null>(null);

  const save = (values: ProfileFormValues) => {
    if (!editing) return;
    const patch = {
      name: values.name,
      telegram: values.telegram || null,
      color: values.color,
      // role/is_active в форме есть только у админа; участник их не отправляет.
      ...(isAdmin ? { role: values.role, is_active: values.is_active } : {}),
    };
    update.mutate(
      { id: editing.id, patch },
      { onSuccess: () => setEditing(null), onError: (err) => toast.error(err) },
    );
  };

  return (
    <>
      <PageHead title="Команда" />
      {isAdmin ? (
        <p className="muted">
          Аккаунты создаёт администратор в Supabase (Authentication → Users). Новый аккаунт
          выключен, пока админ не включит доступ здесь.
        </p>
      ) : null}
      {profiles.isPending ? <EmptyState>Загрузка…</EmptyState> : null}
      {profiles.isError ? <EmptyState>Не удалось загрузить команду.</EmptyState> : null}
      {profiles.data ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Участник</th>
                <th>Email</th>
                <th>Telegram</th>
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
        >
          <ProfileForm
            profile={editing}
            adminFields={isAdmin}
            busy={update.isPending}
            onSubmit={save}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      ) : null}
    </>
  );
}
