import { useState, type FormEvent } from 'react';
import type { Client, Profile, Stage } from '../../shared/api/types';
import { PRIORITIES, PRIORITY_LABEL, type Priority } from '../../shared/lib/labels';
import { Field } from '../../shared/ui/Field';
import { useDirty } from '../../shared/ui/useDirty';

export type TaskFormValues = {
  title: string;
  description: string;
  stage_id: string;
  assignee_id: string | null;
  client_id: string | null;
  priority: Priority;
  due_date: string | null;
};

export function TaskForm({
  initial,
  stages,
  profiles,
  clients,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
  onDirtyChange,
}: {
  initial: TaskFormValues;
  stages: Stage[];
  profiles: Profile[];
  clients: Client[];
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: TaskFormValues) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [values, setValues] = useState<TaskFormValues>(initial);
  useDirty(values, initial, onDirtyChange);
  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const title = values.title.trim();
    if (!title) return;
    onSubmit({ ...values, title, description: values.description.trim() });
  };

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Название">
        <input
          className="input"
          required
          autoFocus
          maxLength={200}
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </Field>
      <Field label="Описание">
        <textarea
          className="textarea"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>
      <div className="form-row">
        <Field label="Стадия">
          <select
            className="select"
            value={values.stage_id}
            onChange={(e) => set('stage_id', e.target.value)}
          >
            {stages.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Исполнитель">
          <select
            className="select"
            value={values.assignee_id ?? ''}
            onChange={(e) => set('assignee_id', e.target.value || null)}
          >
            <option value="">Не назначен</option>
            {profiles
              .filter((p) => p.is_active || p.id === values.assignee_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
      </div>
      <div className="form-row">
        <Field label="Клиент / проект">
          <select
            className="select"
            value={values.client_id ?? ''}
            onChange={(e) => set('client_id', e.target.value || null)}
          >
            <option value="">Без клиента</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Приоритет">
          <select
            className="select"
            value={values.priority}
            onChange={(e) => set('priority', e.target.value as Priority)}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Срок">
          <input
            className="input"
            type="date"
            value={values.due_date ?? ''}
            onChange={(e) => set('due_date', e.target.value || null)}
          />
        </Field>
      </div>
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
