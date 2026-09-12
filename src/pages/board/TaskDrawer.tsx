import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTaskMutations } from '../../shared/api/tasks';
import type { Client, Profile, Stage, TaskWithRefs } from '../../shared/api/types';
import { formatDate, formatDateTime } from '../../shared/lib/dates';
import { PRIORITY_BADGE, PRIORITY_LABEL } from '../../shared/lib/labels';
import { Avatar } from '../../shared/ui/Avatar';
import { useConfirm } from '../../shared/ui/confirmContext';
import { Drawer } from '../../shared/ui/Drawer';
import { Linkify } from '../../shared/ui/Linkify';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { ActivityList } from './ActivityList';
import { Attachments } from './Attachments';
import { Checklist } from './Checklist';
import { CommentsList } from './CommentsList';
import { dueBadgeClass } from './dueBadge';
import { TaskForm, type TaskFormValues } from './TaskForm';

export function TaskDrawer({
  task,
  stages,
  profiles,
  clients,
  today,
  labelSuggestions,
  onClose,
}: {
  task: TaskWithRefs | undefined;
  stages: Stage[];
  profiles: Profile[];
  clients: Client[];
  today: string;
  labelSuggestions: string[];
  onClose: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const { update, remove } = useTaskMutations();
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  useDocumentTitle(task?.title ?? null);

  if (!task) {
    return (
      <Drawer title={<h2>Задача не найдена</h2>} onClose={onClose}>
        <p className="muted">Возможно, её удалили.</p>
      </Drawer>
    );
  }

  const stage = stages.find((s) => s.id === task.stage_id);
  const initial: TaskFormValues = {
    title: task.title,
    description: task.description ?? '',
    stage_id: task.stage_id,
    assignee_id: task.assignee_id,
    client_id: task.client_id,
    priority: task.priority,
    due_date: task.due_date,
    labels: task.labels,
  };

  const save = (values: TaskFormValues) => {
    update.mutate(
      {
        id: task.id,
        patch: {
          title: values.title,
          description: values.description || null,
          stage_id: values.stage_id,
          assignee_id: values.assignee_id,
          client_id: values.client_id,
          priority: values.priority,
          due_date: values.due_date,
          labels: values.labels,
        },
      },
      { onSuccess: () => setEditing(false), onError: (err) => toast.error(err) },
    );
  };

  const del = async () => {
    const ok = await confirm({
      title: `Удалить задачу «${task.title}»?`,
      text: 'Комментарии к ней тоже пропадут. Это действие нельзя отменить.',
    });
    if (!ok) return;
    remove.mutate(task.id, { onSuccess: onClose, onError: (err) => toast.error(err) });
  };

  return (
    <Drawer title={<h2>{task.title}</h2>} onClose={onClose} dirty={editing && dirty}>
      {editing ? (
        <TaskForm
          initial={initial}
          stages={stages}
          profiles={profiles}
          clients={clients}
          labelSuggestions={labelSuggestions}
          submitLabel="Сохранить"
          busy={update.isPending}
          onSubmit={save}
          onCancel={() => setEditing(false)}
          onDirtyChange={setDirty}
        />
      ) : (
        <>
          <div className="row">
            <span className="badge badge-accent">{stage?.name ?? '—'}</span>
            <span className={PRIORITY_BADGE[task.priority]}>{PRIORITY_LABEL[task.priority]}</span>
            {task.due_date ? (
              <span className={dueBadgeClass(task, today)}>до {formatDate(task.due_date)}</span>
            ) : null}
          </div>
          {task.labels.length > 0 ? (
            <div className="task-labels">
              {task.labels.map((l) => (
                <Link key={l} className="chip" to={`/board?label=${encodeURIComponent(l)}`}>
                  {l}
                </Link>
              ))}
            </div>
          ) : null}
          <div className="stack small">
            <div className="row">
              <span className="muted">Исполнитель:</span>
              {task.assignee ? (
                <span className="row">
                  <Avatar name={task.assignee.name} color={task.assignee.color} />{' '}
                  {task.assignee.name}
                </span>
              ) : (
                <span>не назначен</span>
              )}
            </div>
            <div className="row">
              <span className="muted">Клиент:</span>
              {task.client ? (
                <Link className="link" to={`/clients/${task.client.id}`}>
                  {task.client.name}
                </Link>
              ) : (
                <span>—</span>
              )}
            </div>
            <div className="row muted">
              <span>Создана {formatDateTime(task.created_at)}</span>
              {task.done_at ? <span>· закрыта {formatDateTime(task.done_at)}</span> : null}
            </div>
          </div>
          {task.description ? (
            <p className="prewrap">
              <Linkify text={task.description} />
            </p>
          ) : (
            <p className="muted">Без описания.</p>
          )}
          <div className="row">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setEditing(true)}
            >
              Редактировать
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => void del()}
              disabled={remove.isPending}
            >
              Удалить
            </button>
          </div>
        </>
      )}
      <Checklist taskId={task.id} items={task.checklist} />
      <Attachments taskId={task.id} items={task.attachments} />
      <CommentsList taskId={task.id} />
      <ActivityList taskId={task.id} />
    </Drawer>
  );
}
