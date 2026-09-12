import { useState, type FormEvent } from 'react';
import type { Profile } from '../../shared/api/types';
import { ROLE_LABEL, type ProfileRole } from '../../shared/lib/labels';
import { Field } from '../../shared/ui/Field';
import { useDirty } from '../../shared/ui/useDirty';

export type ProfileFormValues = {
  name: string;
  telegram: string;
  color: string;
  role: ProfileRole;
  is_active: boolean;
};

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
  const initial: ProfileFormValues = {
    name: profile.name,
    telegram: profile.telegram ?? '',
    color: profile.color,
    role: profile.role,
    is_active: profile.is_active,
  };
  const [values, setValues] = useState<ProfileFormValues>(initial);
  useDirty(values, initial, onDirtyChange);
  const set = <K extends keyof ProfileFormValues>(key: K, value: ProfileFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = values.name.trim();
    if (!name) return;
    onSubmit({ ...values, name, telegram: values.telegram.trim().replace(/^@/, '') });
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
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Сохранить
        </button>
      </div>
    </form>
  );
}
