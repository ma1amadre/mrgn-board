import { useState, type FormEvent } from 'react';
import {
  CLIENT_DIRECTIONS,
  CLIENT_DIRECTION_LABEL,
  CLIENT_STATUSES,
  CLIENT_STATUS_LABEL,
  type ClientDirection,
  type ClientStatus,
} from '../../shared/lib/labels';
import { Field } from '../../shared/ui/Field';

export type ClientFormValues = {
  name: string;
  direction: ClientDirection;
  status: ClientStatus;
  contact_name: string;
  contact: string;
  notes: string;
};

export function ClientForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
}: {
  initial: ClientFormValues;
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: ClientFormValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);
  const set = <K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = values.name.trim();
    if (!name) return;
    onSubmit({
      ...values,
      name,
      contact_name: values.contact_name.trim(),
      contact: values.contact.trim(),
      notes: values.notes.trim(),
    });
  };

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Название">
        <input
          className="input"
          required
          autoFocus
          maxLength={200}
          value={values.name}
          onChange={(e) => set('name', e.target.value)}
        />
      </Field>
      <div className="form-row">
        <Field label="Направление">
          <select
            className="select"
            value={values.direction}
            onChange={(e) => set('direction', e.target.value as ClientDirection)}
          >
            {CLIENT_DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {CLIENT_DIRECTION_LABEL[d]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Статус">
          <select
            className="select"
            value={values.status}
            onChange={(e) => set('status', e.target.value as ClientStatus)}
          >
            {CLIENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CLIENT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="form-row">
        <Field label="Контактное лицо">
          <input
            className="input"
            value={values.contact_name}
            onChange={(e) => set('contact_name', e.target.value)}
          />
        </Field>
        <Field label="Контакт" hint="Telegram, телефон или email">
          <input
            className="input"
            value={values.contact}
            onChange={(e) => set('contact', e.target.value)}
          />
        </Field>
      </div>
      <Field label="Заметки">
        <textarea
          className="textarea"
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
        />
      </Field>
      <div className="modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onCancel} disabled={busy}>
          Отмена
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
