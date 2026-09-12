import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../app/auth/authContext';
import { useClientMutations, useClients } from '../../shared/api/clients';
import { useStages } from '../../shared/api/stages';
import { useTasks } from '../../shared/api/tasks';
import { formatDate, today } from '../../shared/lib/dates';
import {
  CLIENT_DIRECTION_LABEL,
  CLIENT_STATUS_BADGE,
  CLIENT_STATUS_LABEL,
  PRIORITY_BADGE,
  PRIORITY_LABEL,
} from '../../shared/lib/labels';
import { isOpen, sortByPosition } from '../../shared/lib/tasks';
import { Avatar } from '../../shared/ui/Avatar';
import { useConfirm } from '../../shared/ui/confirmContext';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Linkify } from '../../shared/ui/Linkify';
import { PageHead } from '../../shared/ui/PageHead';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { dueBadgeClass } from '../board/dueBadge';
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
  const { update, remove } = useClientMutations();
  const [editing, setEditing] = useState(false);

  const client = clients.data?.find((c) => c.id === id);
  useDocumentTitle(client?.name ?? 'Клиент');
  if (clients.isPending) return <EmptyState>Загрузка…</EmptyState>;
  if (clients.isError) return <EmptyState>Не удалось загрузить клиента.</EmptyState>;
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
  const todayIso = today();

  const save = (values: ClientFormValues) => {
    update.mutate(
      {
        id: client.id,
        patch: {
          name: values.name,
          direction: values.direction,
          status: values.status,
          contact_name: values.contact_name || null,
          contact: values.contact || null,
          notes: values.notes || null,
        },
      },
      { onSuccess: () => setEditing(false), onError: (err) => toast.error(err) },
    );
  };

  const del = async () => {
    const ok = await confirm({
      title: `Удалить клиента «${client.name}»?`,
      text: 'Задачи останутся на доске без привязки к клиенту.',
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
            <Link className="btn btn-secondary" to={`/board?client=${client.id}`}>
              На доске
            </Link>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
              Редактировать
            </button>
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
      <div className="card">
        {editing ? (
          <ClientForm
            initial={{
              name: client.name,
              direction: client.direction,
              status: client.status,
              contact_name: client.contact_name ?? '',
              contact: client.contact ?? '',
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
              <div>
                <span className="muted">Контакт: </span>
                {[client.contact_name, client.contact].filter(Boolean).join(' · ') || '—'}
              </div>
              <div className="muted">Добавлен {formatDate(client.created_at)}</div>
            </div>
            {client.notes ? (
              <p className="prewrap">
                <Linkify text={client.notes} />
              </p>
            ) : (
              <p className="muted">Без заметок.</p>
            )}
          </>
        )}
      </div>
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
    </>
  );
}
