import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useProfile } from '../../app/auth/authContext';
import { useClients } from '../../shared/api/clients';
import { useProfiles } from '../../shared/api/profiles';
import {
  useRecurrenceMutations,
  useRecurrences,
  type RecurrenceWithRefs,
} from '../../shared/api/recurrences';
import { useTasks } from '../../shared/api/tasks';
import type { Client, Profile } from '../../shared/api/types';
import { formatDate, today as todayIso } from '../../shared/lib/dates';
import { PRIORITIES, PRIORITY_LABEL, type Priority } from '../../shared/lib/labels';
import {
  WEEKDAY_LABEL,
  describeRecurrence,
  nextRun,
  type RecurrencePeriod,
} from '../../shared/lib/recurrence';
import { collectLabels } from '../../shared/lib/taskLabels';
import { Avatar } from '../../shared/ui/Avatar';
import { useConfirm } from '../../shared/ui/confirmContext';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Field } from '../../shared/ui/Field';
import { Modal } from '../../shared/ui/Modal';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonRows } from '../../shared/ui/Skeleton';
import { useToast } from '../../shared/ui/toastContext';
import { useDirty } from '../../shared/ui/useDirty';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { LabelsInput } from '../board/LabelsInput';

type Values = {
  title: string;
  description: string;
  client_id: string | null;
  assignee_id: string | null;
  priority: Priority;
  labels: string[];
  /** Пункты чек-листа по одному в строке. */
  checklist: string;
  period: RecurrencePeriod;
  run_day: number;
  due_offset_days: number;
};

const EMPTY: Values = {
  title: '',
  description: '',
  client_id: null,
  assignee_id: null,
  priority: 'normal',
  labels: [],
  checklist: '',
  period: 'week',
  run_day: 1,
  due_offset_days: 0,
};

function toValues(r: RecurrenceWithRefs): Values {
  return {
    title: r.title,
    description: r.description ?? '',
    client_id: r.client_id,
    assignee_id: r.assignee_id,
    priority: r.priority,
    labels: r.labels,
    checklist: r.checklist.join('\n'),
    period: r.period,
    run_day: r.run_day,
    due_offset_days: r.due_offset_days,
  };
}

function RecurrenceForm({
  initial,
  clients,
  profiles,
  labelSuggestions,
  busy,
  onSubmit,
  onCancel,
  onDirtyChange,
}: {
  initial: Values;
  clients: Client[];
  profiles: Profile[];
  labelSuggestions: string[];
  busy: boolean;
  onSubmit: (values: Values) => void;
  onCancel: () => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const [values, setValues] = useState(initial);
  useDirty(values, initial, onDirtyChange);
  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  const preview = nextRun(values.period, values.run_day, todayIso());

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) return;
    onSubmit({ ...values, title: values.title.trim(), description: values.description.trim() });
  };

  return (
    <form className="form" onSubmit={submit}>
      <Field label="Название задачи">
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
        <Field label="Повторять">
          <select
            className="select"
            value={values.period}
            onChange={(e) => {
              const period = e.target.value as RecurrencePeriod;
              set('period', period);
              set('run_day', period === 'week' ? Math.min(values.run_day, 7) : values.run_day);
            }}
          >
            <option value="week">Каждую неделю</option>
            <option value="month">Каждый месяц</option>
          </select>
        </Field>
        <Field label={values.period === 'week' ? 'День недели' : 'Число месяца'}>
          <select
            className="select"
            value={values.run_day}
            onChange={(e) => set('run_day', Number(e.target.value))}
          >
            {values.period === 'week'
              ? WEEKDAY_LABEL.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))
              : Array.from({ length: 28 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
          </select>
        </Field>
        <Field label="Срок, дней после создания">
          <input
            className="input"
            type="number"
            min={0}
            max={60}
            value={values.due_offset_days}
            onChange={(e) =>
              set('due_offset_days', Math.max(0, Math.min(60, Number(e.target.value))))
            }
          />
        </Field>
      </div>
      <p className="muted small">
        Ближайший запуск: {formatDate(preview)}, в 07:00 по Москве; задача встанет в первую стадию.
      </p>
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
      </div>
      <Field label="Метки">
        <LabelsInput
          value={values.labels}
          suggestions={labelSuggestions}
          onChange={(labels) => set('labels', labels)}
        />
      </Field>
      <Field label="Чек-лист" hint="По одному пункту в строке; до 50.">
        <textarea
          className="textarea"
          value={values.checklist}
          onChange={(e) => set('checklist', e.target.value)}
        />
      </Field>
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

function parseChecklist(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 50);
}

export function RecurringPage() {
  const me = useProfile();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const rules = useRecurrences();
  const clients = useClients();
  const profiles = useProfiles();
  const tasks = useTasks();
  const { create, update, remove } = useRecurrenceMutations();
  const [editing, setEditing] = useState<'new' | RecurrenceWithRefs | null>(null);
  const [dirty, setDirty] = useState(false);
  useDocumentTitle('Повторяющиеся задачи');

  const labelSuggestions = useMemo(() => collectLabels(tasks.data ?? []), [tasks.data]);

  const submit = (values: Values) => {
    const base = {
      title: values.title,
      description: values.description || null,
      client_id: values.client_id,
      assignee_id: values.assignee_id,
      priority: values.priority,
      labels: values.labels,
      checklist: parseChecklist(values.checklist),
      period: values.period,
      run_day: values.run_day,
      due_offset_days: values.due_offset_days,
    };
    const onError = (err: unknown) => toast.error(err);
    if (editing === 'new') {
      create.mutate(
        {
          ...base,
          next_run: nextRun(values.period, values.run_day, todayIso()),
          created_by: me.id,
        },
        { onSuccess: () => setEditing(null), onError },
      );
    } else if (editing) {
      // Расписание поменяли — считаем ближайший запуск заново, иначе дата остаётся.
      const scheduleChanged =
        editing.period !== values.period || editing.run_day !== values.run_day;
      update.mutate(
        {
          id: editing.id,
          patch: scheduleChanged
            ? { ...base, next_run: nextRun(values.period, values.run_day, todayIso()) }
            : base,
        },
        { onSuccess: () => setEditing(null), onError },
      );
    }
  };

  const toggle = (r: RecurrenceWithRefs) =>
    update.mutate(
      { id: r.id, patch: { active: !r.active } },
      { onError: (err) => toast.error(err) },
    );

  const del = async (r: RecurrenceWithRefs) => {
    const ok = await confirm({
      title: `Удалить правило «${r.title}»?`,
      text: 'Уже созданные задачи останутся.',
    });
    if (!ok) return;
    remove.mutate(r.id, { onError: (err) => toast.error(err) });
  };

  return (
    <>
      <PageHead
        title="Повторяющиеся задачи"
        actions={
          <>
            <Link className="btn btn-secondary" to="/settings/templates">
              Шаблоны
            </Link>
            <button type="button" className="btn btn-primary" onClick={() => setEditing('new')}>
              Новое правило
            </button>
          </>
        }
      />
      <p className="muted">
        Каждое утро в 07:00 по Москве база создаёт задачи по правилам, у которых подошла дата:
        отчёты, продления, регулярные проверки. Пропущенные дни не наверстываются.
      </p>
      {rules.isPending ? <SkeletonRows rows={3} /> : null}
      {rules.isError ? <EmptyState>Не удалось загрузить правила.</EmptyState> : null}
      {rules.data?.length === 0 ? <EmptyState>Правил пока нет.</EmptyState> : null}
      {rules.data && rules.data.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Задача</th>
                <th>Повтор</th>
                <th>Следующий запуск</th>
                <th>Исполнитель</th>
                <th>Клиент</th>
                <th>Активно</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rules.data.map((r) => (
                <tr key={r.id} className={r.active ? '' : 'muted'}>
                  <td>
                    {r.title}
                    {r.checklist.length > 0 ? (
                      <span className="muted small"> · чек-лист {r.checklist.length}</span>
                    ) : null}
                  </td>
                  <td>{describeRecurrence(r.period, r.run_day)}</td>
                  <td>{formatDate(r.next_run)}</td>
                  <td>
                    {r.assignee ? (
                      <span className="row">
                        <Avatar name={r.assignee.name} color={r.assignee.color} />
                        {r.assignee.name}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="muted">{r.client?.name ?? '—'}</td>
                  <td>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={r.active}
                        onChange={() => toggle(r)}
                        aria-label={`Правило «${r.title}» активно`}
                      />
                      <span className="switch-track" />
                    </label>
                  </td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setEditing(r)}
                    >
                      Изменить
                    </button>
                    {isAdmin || r.created_by === me.id ? (
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => void del(r)}
                        disabled={remove.isPending}
                      >
                        Удалить
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
          title={editing === 'new' ? 'Новое правило' : editing.title}
          onClose={() => setEditing(null)}
          dirty={dirty}
        >
          <RecurrenceForm
            initial={editing === 'new' ? EMPTY : toValues(editing)}
            clients={clients.data ?? []}
            profiles={profiles.data ?? []}
            labelSuggestions={labelSuggestions}
            busy={create.isPending || update.isPending}
            onSubmit={submit}
            onCancel={() => setEditing(null)}
            onDirtyChange={setDirty}
          />
        </Modal>
      ) : null}
    </>
  );
}
