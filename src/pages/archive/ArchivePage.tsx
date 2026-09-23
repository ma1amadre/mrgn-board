import { Link } from 'react-router-dom';
import { useAuth } from '../../app/auth/authContext';
import { useArchivedClients, useClientMutations } from '../../shared/api/clients';
import { useArchivedTasks, useTaskMutations } from '../../shared/api/tasks';
import type { ClientWithContacts, TaskWithRefs } from '../../shared/api/types';
import { formatDateTime } from '../../shared/lib/dates';
import { CLIENT_STATUS_BADGE, CLIENT_STATUS_LABEL } from '../../shared/lib/labels';
import { useConfirm } from '../../shared/ui/confirmContext';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonRows } from '../../shared/ui/Skeleton';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';

/** Архив: задачи и клиенты, убранные с глаз. Вернуть может любой, удалить навсегда — админ. */
export function ArchivePage() {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const tasks = useArchivedTasks();
  const clients = useArchivedClients();
  const taskMut = useTaskMutations();
  const clientMut = useClientMutations();
  useDocumentTitle('Архив');

  const onError = (err: unknown) => toast.error(err);

  const restoreTask = (t: TaskWithRefs) =>
    taskMut.update.mutate({ id: t.id, patch: { archived_at: null } }, { onError });
  const deleteTask = async (t: TaskWithRefs) => {
    const ok = await confirm({
      title: `Удалить задачу «${t.title}» навсегда?`,
      text: 'Комментарии, файлы и история пропадут. Это действие нельзя отменить.',
    });
    if (!ok) return;
    taskMut.remove.mutate(
      { id: t.id, attachmentPaths: t.attachments.map((a) => a.path) },
      { onError },
    );
  };
  const restoreClient = (c: ClientWithContacts) =>
    clientMut.update.mutate({ id: c.id, patch: { archived_at: null } }, { onError });
  const deleteClient = async (c: ClientWithContacts) => {
    const ok = await confirm({
      title: `Удалить клиента «${c.name}» навсегда?`,
      text: 'Сделки и контакты клиента тоже удалятся; задачи останутся без привязки.',
    });
    if (!ok) return;
    clientMut.remove.mutate(c.id, { onError });
  };

  return (
    <>
      <PageHead title="Архив" />
      <p className="muted">
        Сюда попадает то, что убрали с доски и из списка клиентов кнопкой «В архив». Вернуть можно в
        любой момент{isAdmin ? ', удалить навсегда — только отсюда' : ''}.
      </p>

      <section className="stack">
        <h2>Задачи{tasks.data ? ` (${tasks.data.length})` : ''}</h2>
        {tasks.isPending ? <SkeletonRows rows={2} /> : null}
        {tasks.isError ? <EmptyState>Не удалось загрузить архив задач.</EmptyState> : null}
        {tasks.data?.length === 0 ? <p className="muted">Архивных задач нет.</p> : null}
        {tasks.data?.map((t) => (
          // .card из кита — колонка, поэтому строка с действиями вложена отдельно.
          <div key={t.id} className="card">
            <div className="row">
              <div className="grow">
                <div className="task-title">{t.title}</div>
                <div className="small muted">
                  {t.client ? `${t.client.name} · ` : ''}
                  {t.archived_at ? `в архиве с ${formatDateTime(t.archived_at)}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => restoreTask(t)}
                disabled={taskMut.update.isPending}
              >
                Восстановить
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void deleteTask(t)}
                  disabled={taskMut.remove.isPending}
                >
                  Удалить
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </section>

      <section className="stack">
        <h2>Клиенты{clients.data ? ` (${clients.data.length})` : ''}</h2>
        {clients.isPending ? <SkeletonRows rows={2} /> : null}
        {clients.isError ? <EmptyState>Не удалось загрузить архив клиентов.</EmptyState> : null}
        {clients.data?.length === 0 ? <p className="muted">Архивных клиентов нет.</p> : null}
        {clients.data?.map((c) => (
          <div key={c.id} className="card">
            <div className="row">
              <div className="grow">
                <Link className="link" to={`/clients/${c.id}`}>
                  {c.name}
                </Link>
                <div className="row small">
                  <span className={CLIENT_STATUS_BADGE[c.status]}>
                    {CLIENT_STATUS_LABEL[c.status]}
                  </span>
                  <span className="muted">
                    {c.archived_at ? `в архиве с ${formatDateTime(c.archived_at)}` : ''}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => restoreClient(c)}
                disabled={clientMut.update.isPending}
              >
                Восстановить
              </button>
              {isAdmin ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => void deleteClient(c)}
                  disabled={clientMut.remove.isPending}
                >
                  Удалить
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
