import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useProfile } from '../../app/auth/authContext';
import { useClientMutations, useClients } from '../../shared/api/clients';
import { useTasks } from '../../shared/api/tasks';
import {
  CLIENT_DIRECTION_LABEL,
  CLIENT_STATUS_BADGE,
  CLIENT_STATUS_LABEL,
} from '../../shared/lib/labels';
import { isOpen } from '../../shared/lib/tasks';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Modal } from '../../shared/ui/Modal';
import { PageHead } from '../../shared/ui/PageHead';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { ClientForm, type ClientFormValues } from './ClientForm';

const EMPTY_CLIENT: ClientFormValues = {
  name: '',
  direction: 'other',
  status: 'lead',
  contact_name: '',
  contact: '',
  notes: '',
};

export function ClientsPage() {
  const me = useProfile();
  const toast = useToast();
  const navigate = useNavigate();
  const clients = useClients();
  const tasks = useTasks();
  const { create } = useClientMutations();
  const [creating, setCreating] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  useDocumentTitle('Клиенты');

  const openByClient = useMemo(() => {
    const map = new Map<string, number>();
    for (const t of tasks.data ?? []) {
      if (t.client_id && isOpen(t)) map.set(t.client_id, (map.get(t.client_id) ?? 0) + 1);
    }
    return map;
  }, [tasks.data]);

  const submitNew = (values: ClientFormValues) => {
    create.mutate(
      {
        name: values.name,
        direction: values.direction,
        status: values.status,
        contact_name: values.contact_name || null,
        contact: values.contact || null,
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
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            Новый клиент
          </button>
        }
      />
      {clients.isPending ? <EmptyState>Загрузка…</EmptyState> : null}
      {clients.isError ? <EmptyState>Не удалось загрузить клиентов.</EmptyState> : null}
      {clients.data?.length === 0 ? <EmptyState>Клиентов пока нет.</EmptyState> : null}
      {clients.data && clients.data.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Клиент</th>
                <th>Направление</th>
                <th>Статус</th>
                <th>Контакт</th>
                <th className="num">Открытых задач</th>
              </tr>
            </thead>
            <tbody>
              {clients.data.map((c) => (
                <tr key={c.id}>
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
                  <td className="muted">
                    {[c.contact_name, c.contact].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="num">{openByClient.get(c.id) ?? 0}</td>
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
