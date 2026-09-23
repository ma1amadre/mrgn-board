import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useProfile } from '../../app/auth/authContext';
import { useClientMutations, useClients } from '../../shared/api/clients';
import { useDeals } from '../../shared/api/deals';
import { useTasks } from '../../shared/api/tasks';
import { contactLine, contactWays, primaryContact } from '../../shared/lib/clients';
import { csvFilename, toCsv } from '../../shared/lib/csv';
import { formatAgo, today } from '../../shared/lib/dates';
import { lastActivityByClient } from '../../shared/lib/feed';
import { downloadTextFile } from '../../shared/lib/download';
import {
  CLIENT_DIRECTION_LABEL,
  CLIENT_STATUSES,
  CLIENT_STATUS_BADGE,
  CLIENT_STATUS_LABEL,
  type ClientStatus,
} from '../../shared/lib/labels';
import { isOpen } from '../../shared/lib/tasks';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Modal } from '../../shared/ui/Modal';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonRows } from '../../shared/ui/Skeleton';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { ClientForm, type ClientFormValues } from './ClientForm';

const EMPTY_CLIENT: ClientFormValues = {
  name: '',
  direction: 'other',
  status: 'lead',
  notes: '',
};

/** Фильтр по статусу: по умолчанию всё, кроме закрытых, — они копятся и мешают. */
type StatusFilter = 'open' | 'all' | ClientStatus;
type Sort = 'name' | 'tasks' | 'status' | 'activity';

const STATUS_ORDER: Record<ClientStatus, number> = { lead: 0, active: 1, support: 2, closed: 3 };

export function ClientsPage() {
  const me = useProfile();
  const toast = useToast();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const clients = useClients();
  const tasks = useTasks();
  const deals = useDeals();
  const { create } = useClientMutations();
  const [creating, setCreating] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  useDocumentTitle('Клиенты');

  const statusParam = sp.get('status');
  const status: StatusFilter =
    statusParam === 'all' || (CLIENT_STATUSES as string[]).includes(statusParam ?? '')
      ? (statusParam as StatusFilter)
      : 'open';
  const sortParam = sp.get('sort');
  const sort: Sort =
    sortParam === 'tasks' || sortParam === 'status' || sortParam === 'activity'
      ? sortParam
      : 'name';
  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(sp);
    if (value) next.set(key, value);
    else next.delete(key);
    setSp(next, { replace: true });
  };

  const openByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks.data ?? []) {
      if (t.client_id && isOpen(t)) map.set(t.client_id, (map.get(t.client_id) ?? 0) + 1);
    }
    return map;
  }, [tasks.data]);

  // Последняя активность — грубо, по updated_at клиента, его задач и сделок.
  const lastActivity = useMemo(
    () => lastActivityByClient(clients.data ?? [], tasks.data ?? [], deals.data ?? []),
    [clients.data, tasks.data, deals.data],
  );
  const todayIso = today();

  const rows = useMemo(() => {
    const list = (clients.data ?? []).filter((c) =>
      status === 'all' ? true : status === 'open' ? c.status !== 'closed' : c.status === status,
    );
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'ru');
    return list.sort((a, b) => {
      if (sort === 'tasks') {
        return (openByClient.get(b.id) ?? 0) - (openByClient.get(a.id) ?? 0) || byName(a, b);
      }
      if (sort === 'status') return STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || byName(a, b);
      if (sort === 'activity') {
        return (
          (lastActivity.get(b.id) ?? '').localeCompare(lastActivity.get(a.id) ?? '') || byName(a, b)
        );
      }
      return byName(a, b);
    });
  }, [clients.data, status, sort, openByClient, lastActivity]);

  const hiddenClosed =
    status === 'open' ? (clients.data ?? []).filter((c) => c.status === 'closed').length : 0;

  const exportCsv = () => {
    // Колонок ровно столько, сколько заголовков: имя и роль контакта отдельно от способов связи.
    const out = rows.map((c) => {
      const contact = primaryContact(c.contacts);
      return [
        c.name,
        CLIENT_DIRECTION_LABEL[c.direction],
        CLIENT_STATUS_LABEL[c.status],
        contact ? [contact.name, contact.role].filter(Boolean).join(', ') : '',
        contactWays(contact),
        openByClient.get(c.id) ?? 0,
        c.notes ?? '',
        c.created_at.slice(0, 10),
      ];
    });
    downloadTextFile(
      csvFilename('clients', today()),
      toCsv(
        [
          'Название',
          'Направление',
          'Статус',
          'Контакт',
          'Как связаться',
          'Открытых задач',
          'Заметки',
          'Добавлен',
        ],
        out,
      ),
    );
  };

  const submitNew = (values: ClientFormValues) => {
    create.mutate(
      {
        name: values.name,
        direction: values.direction,
        status: values.status,
        notes: values.notes || null,
        created_by: me.id,
      },
      {
        onSuccess: (client) => {
          setCreating(false);
          navigate(`/clients/${client.id}`);
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  return (
    <>
      <PageHead
        title="Клиенты"
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={exportCsv}
              disabled={!clients.data}
              title="Скачать список в CSV"
            >
              CSV
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              Новый клиент
            </button>
          </>
        }
      />
      <div className="toolbar">
        <select
          className="select"
          aria-label="Статус"
          value={status}
          onChange={(e) => setParam('status', e.target.value === 'open' ? null : e.target.value)}
        >
          <option value="open">Все, кроме закрытых</option>
          <option value="all">Все статусы</option>
          {CLIENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {CLIENT_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          className="select"
          aria-label="Сортировка"
          value={sort}
          onChange={(e) => setParam('sort', e.target.value === 'name' ? null : e.target.value)}
        >
          <option value="name">По названию</option>
          <option value="tasks">По открытым задачам</option>
          <option value="status">По статусу</option>
          <option value="activity">По активности</option>
        </select>
        {hiddenClosed > 0 ? (
          <span className="small muted">Скрыто закрытых: {hiddenClosed}</span>
        ) : null}
      </div>
      {clients.isPending ? <SkeletonRows rows={4} /> : null}
      {clients.isError ? <EmptyState>Не удалось загрузить клиентов.</EmptyState> : null}
      {clients.data?.length === 0 ? <EmptyState>Клиентов пока нет.</EmptyState> : null}
      {clients.data && clients.data.length > 0 && rows.length === 0 ? (
        <EmptyState>Под этот фильтр никто не попал.</EmptyState>
      ) : null}
      {rows.length > 0 ? (
        <div className="client-cards">
          {rows.map((c) => (
            <Link key={c.id} className="card card-interactive task" to={`/clients/${c.id}`}>
              <div className="task-title">{c.name}</div>
              <div className="task-meta">
                <span className={CLIENT_STATUS_BADGE[c.status]}>
                  {CLIENT_STATUS_LABEL[c.status]}
                </span>
                <span className="muted">{CLIENT_DIRECTION_LABEL[c.direction]}</span>
                {openByClient.get(c.id) ? (
                  <span className="badge">задач: {openByClient.get(c.id)}</span>
                ) : null}
                {lastActivity.get(c.id) ? (
                  <span className="muted small">
                    {formatAgo(lastActivity.get(c.id) as string, todayIso)}
                  </span>
                ) : null}
              </div>
              {contactLine(primaryContact(c.contacts)) ? (
                <div className="small muted">{contactLine(primaryContact(c.contacts))}</div>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}
      {rows.length > 0 ? (
        <div className="table-wrap clients-table">
          <table className="table">
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Направление</th>
                <th>Статус</th>
                <th>Контакт</th>
                <th className="num">Открытых задач</th>
                <th>Активность</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                // Вся строка ведёт в карточку; ссылка в первой ячейке остаётся для клавиатуры и читалок.
                <tr key={c.id} className="row-link" onClick={() => navigate(`/clients/${c.id}`)}>
                  <td>
                    <Link className="link" to={`/clients/${c.id}`}>
                      {c.name}
                    </Link>
                  </td>
                  <td>{CLIENT_DIRECTION_LABEL[c.direction]}</td>
                  <td>
                    <span className={CLIENT_STATUS_BADGE[c.status]}>
                      {CLIENT_STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="muted">{contactLine(primaryContact(c.contacts)) || '—'}</td>
                  <td className="num">{openByClient.get(c.id) ?? 0}</td>
                  <td className="muted">
                    {lastActivity.get(c.id)
                      ? formatAgo(lastActivity.get(c.id) as string, todayIso)
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {creating ? (
        <Modal title="Новый клиент" onClose={() => setCreating(false)} dirty={draftDirty}>
          <ClientForm
            initial={EMPTY_CLIENT}
            submitLabel="Создать"
            busy={create.isPending}
            onSubmit={submitNew}
            onCancel={() => setCreating(false)}
            onDirtyChange={setDraftDirty}
          />
        </Modal>
      ) : null}
    </>
  );
}
