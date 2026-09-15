import { useState, type FormEvent } from 'react';
import { useAppSettings } from '../../shared/api/settings';
import type { Profile } from '../../shared/api/types';
import { ROLE_LABEL, type ProfileRole } from '../../shared/lib/labels';
import { Field } from '../../shared/ui/Field';
import { useDirty } from '../../shared/ui/useDirty';

export type ProfileFormValues = {
  name: string;
  telegram: string;
  telegram_chat_id: string;
  color: string;
  role: ProfileRole;
  is_active: boolean;
  notify_assigned: boolean;
  notify_comments: boolean;
  notify_mentions: boolean;
  notify_digest: boolean;
};

const NOTIFY_FIELDS: Array<{
  key: 'notify_assigned' | 'notify_comments' | 'notify_mentions' | 'notify_digest';
  label: string;
}> = [
  { key: 'notify_assigned', label: 'Мне назначили задачу' },
  { key: 'notify_comments', label: 'Комментарий к моей задаче или идее' },
  { key: 'notify_mentions', label: 'Меня упомянули' },
  { key: 'notify_digest', label: 'Утренняя сводка по срокам (только Telegram)' },
];

export function ProfileForm({
  profile,
  adminFields,
  busy,
  onSubmit,
  onCancel,
  onDirtyChange,
}: {
  profile: Profile;
  /** Роль и доступ меняет только админ; остальным эти поля не показываем. */
  adminFields: boolean;
  busy: boolean;
  onSubmit: (values: ProfileFormValues) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const settings = useAppSettings();
  const bot = settings.data?.telegram_bot?.replace(/^@/, '') ?? '';
  const initial: ProfileFormValues = {
    name: profile.name,
    telegram: profile.telegram ?? '',
    telegram_chat_id: profile.telegram_chat_id === null ? '' : String(profile.telegram_chat_id),
    color: profile.color,
    role: profile.role,
    is_active: profile.is_active,
    notify_assigned: profile.notify_assigned,
    notify_comments: profile.notify_comments,
    notify_mentions: profile.notify_mentions,
    notify_digest: profile.notify_digest,
  };
  const [values, setValues] = useState<ProfileFormValues>(initial);
  useDirty(values, initial, onDirtyChange);
  const set = <K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const chatIdValid =
    values.telegram_chat_id === '' || /^-?\d{1,19}$/.test(values.telegram_chat_id);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = values.name.trim();
    if (!name || !chatIdValid) return;
    onSubmit({
      ...values,
      name,
      telegram: values.telegram.trim().replace(/^@/, ''),
      telegram_chat_id: values.telegram_chat_id.trim(),
    });
  };

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Имя">
        <input
          className="input"
          required
          maxLength={80}
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </Field>
      <div className="form-row">
        <Field label="Telegram" hint="без @">
          <input
            className="input"
            value={values.telegram}
            onChange={(e) => set('telegram', e.target.value)}
          />
        </Field>
        <Field label="Цвет аватара">
          <input
            className="input"
            type="color"
            style={{ padding: 2, width: 64 }}
            value={values.color}
            onChange={(e) => set('color', e.target.value)}
          />
        </Field>
      </div>
      <Field
        label="Telegram chat ID для уведомлений"
        error={chatIdValid ? null : 'Только цифры'}
        hint={
          bot
            ? `Откройте @${bot}, нажмите Start, затем узнайте свой ID у @userinfobot и вставьте сюда.`
            : 'Бот ещё не настроен администратором; поле можно заполнить позже.'
        }
      >
        <input
          className="input"
          inputMode="numeric"
          placeholder="например, 253446517"
          value={values.telegram_chat_id}
          aria-invalid={!chatIdValid}
          onChange={(e) => set('telegram_chat_id', e.target.value.trim())}
        />
      </Field>
      {/* Тумблеры — сами label, поэтому не внутри Field. */}
      <div className="field">
        <span className="field-label">Уведомления</span>
        <div className="stack small">
          {NOTIFY_FIELDS.map((f) => (
            <label key={f.key} className="switch">
              <input
                type="checkbox"
                checked={values[f.key]}
                onChange={(e) => set(f.key, e.target.checked)}
              />
              <span className="switch-track" />
              {f.label}
            </label>
          ))}
        </div>
      </div>
      {adminFields ? (
        <div className="form-row">
          <Field label="Роль">
            <select
              className="select"
              value={values.role}
              onChange={(e) => set('role', e.target.value as ProfileRole)}
            >
              {(Object.keys(ROLE_LABEL) as ProfileRole[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </Field>
          {/* Тумблер сам является label — в Field (тоже label) его не вкладываем. */}
          <div className="field">
            <span className="field-label">Доступ</span>
            <label className="switch" style={{ height: 36 }}>
              <input
                type="checkbox"
                checked={values.is_active}
                onChange={(e) => set('is_active', e.target.checked)}
              />
              <span className="switch-track" />
              {values.is_active ? 'активен' : 'отключён'}
            </label>
          </div>
        </div>
      ) : null}
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy || !chatIdValid}>
          Сохранить
        </button>
      </div>
    </form>
  );
}
