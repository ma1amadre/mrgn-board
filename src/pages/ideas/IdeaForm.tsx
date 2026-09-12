import { useState, type FormEvent } from 'react';
import { Field } from '../../shared/ui/Field';
import { useDirty } from '../../shared/ui/useDirty';

export type IdeaFormValues = { title: string; body: string };

export function IdeaForm({
  initial,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
  onDirtyChange,
}: {
  initial: IdeaFormValues;
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: IdeaFormValues) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [values, setValues] = useState(initial);
  useDirty(values, initial, onDirtyChange);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const title = values.title.trim();
    if (!title) return;
    onSubmit({ title, body: values.body.trim() });
  };
  return (
    <form className="form" onSubmit={submit}>
      <Field label="Идея">
        <input
          className="input"
          required
          autoFocus
          maxLength={200}
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
        />
      </Field>
      <Field label="Подробности" hint="Зачем это нужно и что даст.">
        <textarea
          className="textarea"
          value={values.body}
          onChange={(e) => setValues((v) => ({ ...v, body: e.target.value }))}
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
