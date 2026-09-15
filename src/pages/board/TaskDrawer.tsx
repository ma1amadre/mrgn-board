import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth/authContext';
import { useActivity } from '../../shared/api/activity';
import { useComments } from '../../shared/api/comments';
import { useTaskMutations, useTasks } from '../../shared/api/tasks';
import type { Client, Profile, Stage, TaskWithRefs } from '../../shared/api/types';
import { withCurrentClient } from '../../shared/lib/clients';
import { formatDate, formatDateTime } from '../../shared/lib/dates';
import { PRIORITY_BADGE, PRIORITY_LABEL } from '../../shared/lib/labels';
import { Avatar } from '../../shared/ui/Avatar';
import { useConfirm } from '../../shared/ui/confirmContext';
import { Drawer } from '../../shared/ui/Drawer';
import { Menu } from '../../shared/ui/Menu';
import { Markdown } from '../../shared/ui/Markdown';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { ActivityList } from './ActivityList';
import { Attachments } from './Attachments';
import { Checklist } from './Checklist';
import { SaveTemplateModal } from './SaveTemplateModal';
import { useTaskQuickActions } from './useTaskQuickActions';
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
  loading = false,
  onClose,
}: {
  task: TaskWithRefs | undefined;
  stages: Stage[];
  profiles: Profile[];
  clients: Client[];
  today: string;
  labelSuggestions: string[];
  /** Задачи нет на доске, и архив ещё грузится — не спешим объявлять её удалённой. */
  loading?: boolean;
  onClose: () => void;
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const { update, remove } = useTaskMutations();
  const { isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  useDocumentTitle(task?.title ?? null);
  // Счётчики для заголовков секций; сами списки грузят те же запросы из кеша.
  const comments = useComments(task?.id ?? null);
  const activity = useActivity(task?.id ?? '', task !== undefined);
  // Те же быстрые действия, что в меню карточки на доске: стадия, исполнитель, срок без формы.
  const allTasks = useTasks().data ?? [];
  const actionsFor = useTaskQuickActions(stages, allTasks, today);

  if (!task) {
    return (
      <Drawer title={<h2>{loading ? 'Загрузка…' : 'Задача не найдена'}</h2>} onClose={onClose}>
        {loading ? null : <p className="muted">Возможно, её удалили.</p>}
      </Drawer>
    );
  }

  const stage = stages.find((s) => s.id === task.stage_id);
  // Архивную открывают по старой ссылке: показываем как есть, без правок, с кнопкой «Восстановить».
  const archived = task.archived_at !== null;
  const restore = () =>
    update.mutate(
      { id: task.id, patch: { archived_at: null } },
      { onError: (err) => toast.error(err) },
    );
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

  // Архив вместо удаления: задача уходит с доски, но остаётся в разделе «Архив».
  const archive = () => {
    update.mutate(
      { id: task.id, patch: { archived_at: new Date().toISOString() } },
      { onSuccess: onClose, onError: (err) => toast.error(err) },
    );
  };

  const del = async () => {
    const ok = await confirm({
      title: `Удалить задачу «${task.title}»?`,
      text: 'Комментарии и файлы к ней тоже пропадут. Это действие нельзя отменить.',
    });
    if (!ok) return;
    remove.mutate(
      { id: task.id, attachmentPaths: task.attachments.map((a) => a.path) },
      { onSuccess: onClose, onError: (err) => toast.error(err) },
    );
  };

  return (
    <Drawer
      title={
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <h2 className="grow">{task.title}</h2>
          {editing || archived ? null : <Menu label="Быстрые действия" items={actionsFor(task)} />}
        </div>
      }
      onClose={onClose}
      dirty={editing && dirty}
    >
      {archived ? (
        <div className="alert alert-warning" role="status">
          <p className="grow">
            В архиве с {formatDateTime(task.archived_at as string)}: на доске и в отчётах её нет.
          </p>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={restore}
            disabled={update.isPending}
          >
            Восстановить
          </button>
        </div>
      ) : null}
      {editing ? (
        <TaskForm
          initial={initial}
          stages={stages}
          profiles={profiles}
          clients={withCurrentClient(clients, task.client)}
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
            <Markdown text={task.description} />
          ) : (
            <p className="muted">Без описания.</p>
          )}
          <div className="row">
            {archived ? null : (
              <>
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
                  onClick={() => setSavingTemplate(true)}
                  title="Сохранить как шаблон для новых задач"
                >
                  В шаблон
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={archive}
                  disabled={update.isPending}
                >
                  В архив
                </button>
              </>
            )}
            {isAdmin ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => void del()}
                disabled={remove.isPending}
              >
                Удалить
              </button>
            ) : null}
          </div>
        </>
      )}
      <details className="drawer-section" open={task.checklist.length > 0}>
        <summary>
          Чек-лист
          {task.checklist.length > 0 ? (
            <span className="badge">
              {task.checklist.filter((i) => i.is_done).length}/{task.checklist.length}
            </span>
          ) : null}
        </summary>
        <Checklist taskId={task.id} items={task.checklist} />
      </details>
      <details className="drawer-section" open={task.attachments.length > 0}>
        <summary>
          Вложения
          {task.attachments.length > 0 ? (
            <span className="badge">{task.attachments.length}</span>
          ) : null}
        </summary>
        <Attachments taskId={task.id} items={task.attachments} />
      </details>
      <details className="drawer-section" open>
        <summary>
          Комментарии
          {comments.data && comments.data.length > 0 ? (
            <span className="badge">{comments.data.length}</span>
          ) : null}
        </summary>
        <CommentsList taskId={task.id} />
      </details>
      <details className="drawer-section">
        <summary>
          История
          {activity.data && activity.data.length > 0 ? (
            <span className="badge">{activity.data.length}</span>
          ) : null}
        </summary>
        <ActivityList taskId={task.id} />
      </details>
      {savingTemplate ? (
        <SaveTemplateModal task={task} onClose={() => setSavingTemplate(false)} />
      ) : null}
    </Drawer>
  );
}
