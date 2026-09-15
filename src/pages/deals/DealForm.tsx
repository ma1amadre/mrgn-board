import { useState, type FormEvent } from 'react';
import type { ClientRef, Profile } from '../../shared/api/types';
import { parseAmount } from '../../shared/lib/deals';
import { DEAL_STAGES, DEAL_STAGE_LABEL, type DealStage } from '../../shared/lib/labels';
import { Field } from '../../shared/ui/Field';
import { useDirty } from '../../shared/ui/useDirty';

export type DealFormValues = {
  title: string;
  client_id: string;
  stage: DealStage;
  /** Как в инпуте: «1 200 000» или «1500,50»; в число переводится при отправке (parseAmount). */
  amount: string;
  owner_id: string | null;
  expected_close: string | null;
  notes: string;
};

export function DealForm({
  initial,
  clients,
  profiles,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
  onDirtyChange,
}: {
  initial: DealFormValues;
  clients: ClientRef[];
  profiles: Profile[];
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: DealFormValues) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [values, setValues] = useState<DealFormValues>(initial);
  const [amountError, setAmountError] = useState<string | null>(null);
  useDirty(values, initial, onDirtyChange);
  const set = <K extends keyof DealFormValues>(key: K, value: DealFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const title = values.title.trim();
    if (!title || !values.client_id) return;
    const amount = parseAmount(values.amount);
    if (amount !== null && (Number.isNaN(amount) || amount < 0)) {
      setAmountError('Сумма — число в рублях, например 150 000 или 12 500,50.');
      return;
    }
    setAmountError(null);
    onSubmit({ ...values, title, notes: values.notes.trim() });
  };

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Название">
        <input
          className="input"
          required
          autoFocus
          maxLength={200}
          placeholder="Например: CDN для интернет-магазина"
          value={values.title}
          onChange={(e) => set('title', e.target.value)}
        />
      </Field>
      <div className="form-row">
        <Field
          label="Клиент"
          hint={clients.length === 0 ? 'Сначала добавьте клиента в разделе «Клиенты».' : undefined}
        >
          <select
            className="select"
            required
            value={values.client_id}
            onChange={(e) => set('client_id', e.target.value)}
          >
            <option value="">Выбрать…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Стадия">
          <select
            className="select"
            value={values.stage}
            onChange={(e) => set('stage', e.target.value as DealStage)}
          >
            {DEAL_STAGES.map((s) => (
              <option key={s} value={s}>
                {DEAL_STAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="form-row">
        <Field label="Сумма, ₽" error={amountError ?? undefined}>
          <input
            className="input"
            inputMode="decimal"
            placeholder="150 000"
            value={values.amount}
            onChange={(e) => set('amount', e.target.value)}
          />
        </Field>
        <Field label="Ответственный">
          <select
            className="select"
            value={values.owner_id ?? ''}
            onChange={(e) => set('owner_id', e.target.value || null)}
          >
            <option value="">Не назначен</option>
            {profiles
              .filter((p) => p.is_active || p.id === values.owner_id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Ожидаемое закрытие">
          <input
            className="input"
            type="date"
            value={values.expected_close ?? ''}
            onChange={(e) => set('expected_close', e.target.value || null)}
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
