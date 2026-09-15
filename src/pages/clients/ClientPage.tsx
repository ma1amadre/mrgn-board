import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../app/auth/authContext';
import { useArchivedClients, useClientMutations, useClients } from '../../shared/api/clients';
import { useDeals } from '../../shared/api/deals';
import { useClientFeed } from '../../shared/api/feed';
import { useStages } from '../../shared/api/stages';
import { useTasks } from '../../shared/api/tasks';
import { formatDate, formatDateTime, today } from '../../shared/lib/dates';
import { formatMoney } from '../../shared/lib/deals';
import {
  CLIENT_DIRECTION_LABEL,
  CLIENT_STATUS_BADGE,
  CLIENT_STATUS_LABEL,
  DEAL_STAGE_BADGE,
  DEAL_STAGE_LABEL,
  PRIORITY_BADGE,
  PRIORITY_LABEL,
} from '../../shared/lib/labels';
import { isOpen, sortByPosition } from '../../shared/lib/tasks';
import { Avatar } from '../../shared/ui/Avatar';
import { useConfirm } from '../../shared/ui/confirmContext';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Markdown } from '../../shared/ui/Markdown';
import { PageHead } from '../../shared/ui/PageHead';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { dueBadgeClass } from '../board/dueBadge';
import { ClientContacts } from './ClientContacts';
import { ClientFeed } from './ClientFeed';
import { ClientForm, type ClientFormValues } from './ClientForm';

export function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const clients = useClients();
  const tasks = useTasks();
  const stages = useStages();
  const deals = useDeals();
  const { update, remove } = useClientMutations();
  const [editing, setEditing] = useState(false);

  // Лента собирается по id задач и сделок клиента; хук стоит до ранних выходов ниже.
  const taskIds = useMemo(
    () => (tasks.data ?? []).filter((t) => t.client_id === id).map((t) => t.id),
    [tasks.data, id],
  );
  const dealIds = useMemo(
    () => (deals.data ?? []).filter((d) => d.client_id === id).map((d) => d.id),
    [deals.data, id],
  );
  const feed = useClientFeed(
    id ?? '',
    taskIds,
    dealIds,
    id !== undefined && tasks.data !== undefined && deals.data !== undefined,
  );

  const found = clients.data?.find((c) => c.id === id);
  // Среди активных нет — ищем в архиве: ссылки из задач и сделок ведут и на архивных клиентов.
  const archived = useArchivedClients(clients.data !== undefined && found === undefined);
  const client = found ?? archived.data?.find((c) => c.id === id);
  const isArchived = client !== undefined && client.archived_at !== null;
  useDocumentTitle(client?.name ?? 'Клиент');
  const loading =
    clients.isPending ||
    (found === undefined && archived.data === undefined && !archived.isError && !clients.isError);
  if (loading) return <EmptyState>Загрузка…</EmptyState>;
  if (clients.isError || archived.isError) {
    return <EmptyState>Не удалось загрузить клиента.</EmptyState>;
  }
  if (!client) {
    return (
      <>
        <PageHead title="Клиент не найден" />
        <Link className="link" to="/clients">
          К списку клиентов
        </Link>
      </>
    );
  }

  const stageName = (stageId: string) => stages.data?.find((s) => s.id === stageId)?.name ?? '—';
  const clientTasks = sortByPosition((tasks.data ?? []).filter((t) => t.client_id === client.id));
  const open = clientTasks.filter(isOpen);
  const done = clientTasks.filter((t) => !isOpen(t));
  const clientDeals = (deals.data ?? []).filter((d) => d.client_id === client.id);
  const todayIso = today();

  const save = (values: ClientFormValues) => {
    update.mutate(
      {
        id: client.id,
        patch: {
          name: values.name,
          direction: values.direction,
          status: values.status,
          notes: values.notes || null,
        },
      },
      { onSuccess: () => setEditing(false), onError: (err) => toast.error(err) },
    );
  };

  const archive = () => {
    update.mutate(
      { id: client.id, patch: { archived_at: new Date().toISOString() } },
      { onSuccess: () => navigate('/clients'), onError: (err) => toast.error(err) },
    );
  };
  const restore = () =>
    update.mutate(
      { id: client.id, patch: { archived_at: null } },
      { onError: (err) => toast.error(err) },
    );

  const del = async () => {
    const ok = await confirm({
      title: `Удалить клиента «${client.name}»?`,
      text:
        clientDeals.length > 0
          ? `Вместе с клиентом удалятся его сделки (${clientDeals.length}). Задачи останутся на доске без привязки.`
          : 'Задачи останутся на доске без привязки к клиенту.',
    });
    if (!ok) return;
    remove.mutate(client.id, {
      onSuccess: () => navigate('/clients'),
      onError: (err) => toast.error(err),
    });
  };

  const taskRow = (t: (typeof clientTasks)[number]) => (
    <Link key={t.id} className="card card-interactive task" to={`/board?task=${t.id}`}>
      <div className="task-title">{t.title}</div>
      <div className="task-meta">
        <span className="badge badge-accent">{stageName(t.stage_id)}</span>
        {t.priority !== 'normal' ? (
          <span className={PRIORITY_BADGE[t.priority]}>{PRIORITY_LABEL[t.priority]}</span>
        ) : null}
        {t.due_date ? (
          <span className={dueBadgeClass(t, todayIso)}>{formatDate(t.due_date)}</span>
        ) : null}
        {t.assignee ? <Avatar name={t.assignee.name} color={t.assignee.color} /> : null}
      </div>
    </Link>
  );

  return (
    <>
      <PageHead
        title={client.name}
        actions={
          <>
            {isArchived ? null : (
              <Link className="btn btn-primary" to={`/board?client=${client.id}&new=1`}>
                Новая задача
              </Link>
            )}
            <Link className="btn btn-secondary" to={`/board?client=${client.id}`}>
              На доске
            </Link>
            {isArchived ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={restore}
                disabled={update.isPending}
              >
                Восстановить
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditing(true)}
                >
                  Редактировать
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
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
                className="btn btn-ghost"
                onClick={() => void del()}
                disabled={remove.isPending}
              >
                Удалить
              </button>
            ) : null}
          </>
        }
      />
      {isArchived ? (
        <div className="alert alert-warning" role="status">
          <p>
            Клиент в архиве с {formatDateTime(client.archived_at as string)}: в списках и фильтрах
            его нет, новые задачи и сделки по нему не создаются.
          </p>
        </div>
      ) : null}
      <div className="card">
        {editing ? (
          <ClientForm
            initial={{
              name: client.name,
              direction: client.direction,
              status: client.status,
              notes: client.notes ?? '',
            }}
            submitLabel="Сохранить"
            busy={update.isPending}
            onSubmit={save}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <>
            <div className="row">
              <span className={CLIENT_STATUS_BADGE[client.status]}>
                {CLIENT_STATUS_LABEL[client.status]}
              </span>
              <span className="badge">{CLIENT_DIRECTION_LABEL[client.direction]}</span>
            </div>
            <div className="stack small">
              <div className="muted">Добавлен {formatDate(client.created_at)}</div>
            </div>
            {client.notes ? (
              <Markdown text={client.notes} />
            ) : (
              <p className="muted">Без заметок.</p>
            )}
          </>
        )}
      </div>
      <ClientContacts clientId={client.id} contacts={client.contacts} />
      <section className="stack">
        <div className="row">
          <h2>Сделки ({clientDeals.length})</h2>
          {isArchived ? null : (
            <Link className="btn btn-secondary btn-sm" to={`/deals?client=${client.id}&new=1`}>
              Новая сделка
            </Link>
          )}
        </div>
        {clientDeals.length === 0 ? (
          <p className="muted">Сделок пока нет.</p>
        ) : (
          clientDeals.map((d) => (
            <Link key={d.id} className="card card-interactive task" to={`/deals?deal=${d.id}`}>
              <div className="task-title">{d.title}</div>
              <div className="task-meta">
                <span className={DEAL_STAGE_BADGE[d.stage]}>{DEAL_STAGE_LABEL[d.stage]}</span>
                {d.amount !== null ? <strong>{formatMoney(d.amount)}</strong> : null}
                {d.expected_close ? (
                  <span className="muted">до {formatDate(d.expected_close)}</span>
                ) : null}
                {d.owner ? <Avatar name={d.owner.name} color={d.owner.color} /> : null}
              </div>
            </Link>
          ))
        )}
      </section>
      <section className="stack">
        <h2>Открытые задачи ({open.length})</h2>
        {open.length === 0 ? <p className="muted">Нет открытых задач.</p> : open.map(taskRow)}
      </section>
      {done.length > 0 ? (
        <section className="stack">
          <h2>Закрытые ({done.length})</h2>
          {done.map(taskRow)}
        </section>
      ) : null}
      <ClientFeed
        data={feed.data}
        pending={feed.isPending}
        error={feed.isError}
        tasks={clientTasks}
        deals={clientDeals}
      />
    </>
  );
}
