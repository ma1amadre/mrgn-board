import { useId, useState, type FormEvent } from 'react';
import type { ClientRef, Profile, Stage } from '../../shared/api/types';
import { addDays, today as todayIso } from '../../shared/lib/dates';
import { PRIORITIES, PRIORITY_LABEL, type Priority } from '../../shared/lib/labels';
import { Avatar } from '../../shared/ui/Avatar';
import { Field } from '../../shared/ui/Field';
import { IconClose } from '../../shared/ui/icons';
import { useDirty } from '../../shared/ui/useDirty';
import { LabelsInput } from './LabelsInput';

export type TaskFormValues = {
  title: string;
  description: string;
  stage_id: string;
  /** Исполнителей может быть несколько; пустой список — не назначена. */
  assignee_ids: string[];
  client_id: string | null;
  priority: Priority;
  due_date: string | null;
  labels: string[];
};

export function TaskForm({
  initial,
  stages,
  profiles,
  clients,
  labelSuggestions,
  meId,
  submitLabel,
  busy,
  onSubmit,
  onCancel,
  onDirtyChange,
}: {
  initial: TaskFormValues;
  stages: Stage[];
  profiles: Profile[];
  clients: ClientRef[];
  /** Метки, уже встречающиеся в задачах, — подсказки в поле. */
  labelSuggestions: string[];
  /** Текущий пользователь — для «Взять себе»; чаще всего исполнитель и есть автор. */
  meId?: string;
  submitLabel: string;
  busy: boolean;
  onSubmit: (values: TaskFormValues) => void;
  onCancel: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [values, setValues] = useState<TaskFormValues>(initial);
  useDirty(values, initial, onDirtyChange);
  const assigneeId = useId();
  const set = <K extends keyof TaskFormValues>(key: K, value: TaskFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const today = todayIso();
  // Активные, кого ещё не добавили; выключенный участник остаётся в списке, если уже назначен.
  const available = profiles.filter((p) => p.is_active && !values.assignee_ids.includes(p.id));
  const addAssignee = (id: string) => {
    if (id && !values.assignee_ids.includes(id)) set('assignee_ids', [...values.assignee_ids, id]);
  };
  const quickDates: Array<{ label: string; value: string | null }> = [
    { label: 'Сегодня', value: today },
    { label: 'Завтра', value: addDays(today, 1) },
    { label: 'Через неделю', value: addDays(today, 7) },
    { label: 'Без срока', value: null },
  ];

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
      <Field
        label="Описание"
        hint="Можно markdown: **жирный**, *курсив*, `код`, списки через «- »."
      >
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
        <div className="field">
          <div className="field-label row">
            <span id={assigneeId}>Исполнители</span>
            {meId && !values.assignee_ids.includes(meId) ? (
              <button type="button" className="link-button" onClick={() => addAssignee(meId)}>
                Взять себе
              </button>
            ) : null}
          </div>
          <div className="assignees" role="group" aria-labelledby={assigneeId}>
            {values.assignee_ids.map((id) => {
              const p = profiles.find((x) => x.id === id);
              return (
                <span key={id} className="chip assignee-chip">
                  {p ? <Avatar name={p.name} color={p.color} /> : null}
                  {p?.name ?? '?'}
                  <button
                    type="button"
                    className="chip-remove"
                    aria-label={`Снять ${p?.name ?? 'исполнителя'}`}
                    onClick={() =>
                      set(
                        'assignee_ids',
                        values.assignee_ids.filter((x) => x !== id),
                      )
                    }
                  >
                    <IconClose size={12} />
                  </button>
                </span>
              );
            })}
            {available.length > 0 ? (
              <select
                className="select"
                aria-label="Добавить исполнителя"
                value=""
                onChange={(e) => addAssignee(e.target.value)}
              >
                <option value="">
                  {values.assignee_ids.length === 0 ? 'Не назначена…' : 'Добавить…'}
                </option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </div>
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
      {/* Те же быстрые сроки, что в меню «⋯» на доске: не лезть в календарь ради «завтра». */}
      <div className="row quick-dates" role="group" aria-label="Быстрый срок">
        {quickDates.map((q) => (
          <button
            key={q.label}
            type="button"
            className={
              values.due_date === q.value ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'
            }
            aria-pressed={values.due_date === q.value}
            onClick={() => set('due_date', q.value)}
          >
            {q.label}
          </button>
        ))}
      </div>
      <Field label="Метки" hint="Enter или запятая добавляет метку, до десяти на задачу.">
        <LabelsInput
          value={values.labels}
          suggestions={labelSuggestions}
          onChange={(labels) => set('labels', labels)}
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
