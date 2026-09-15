import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useProfile } from '../../app/auth/authContext';
import { useDealMutations } from '../../shared/api/deals';
import { useTasks } from '../../shared/api/tasks';
import type { Client, DealWithRefs, Profile } from '../../shared/api/types';
import { formatDate, formatDateTime } from '../../shared/lib/dates';
import { formatMoney, isDealOverdue, parseAmount } from '../../shared/lib/deals';
import { DEAL_STAGE_BADGE, DEAL_STAGE_LABEL } from '../../shared/lib/labels';
import { isOpen } from '../../shared/lib/tasks';
import { Avatar } from '../../shared/ui/Avatar';
import { useConfirm } from '../../shared/ui/confirmContext';
import { Drawer } from '../../shared/ui/Drawer';
import { Markdown } from '../../shared/ui/Markdown';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { DealForm, type DealFormValues } from './DealForm';

export function DealDrawer({
  deal,
  clients,
  profiles,
  today,
  onClose,
}: {
  deal: DealWithRefs | undefined;
  clients: Client[];
  profiles: Profile[];
  today: string;
  onClose: () => void;
}) {
  const me = useProfile();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const { update, remove } = useDealMutations();
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  useDocumentTitle(deal?.title ?? null);
  // Задачи клиента сделки: работа по ней живёт на доске, здесь только ссылки.
  const tasks = useTasks();
  const clientTasks = (tasks.data ?? []).filter(
    (t) => deal !== undefined && t.client_id === deal.client_id && isOpen(t),
  );

  if (!deal) {
    return (
      <Drawer title={<h2>Сделка не найдена</h2>} onClose={onClose}>
        <p className="muted">Возможно, её удалили.</p>
      </Drawer>
    );
  }

  const initial: DealFormValues = {
    title: deal.title,
    client_id: deal.client_id,
    stage: deal.stage,
    amount: deal.amount === null ? '' : String(deal.amount).replace('.', ','),
    owner_id: deal.owner_id,
    expected_close: deal.expected_close,
    notes: deal.notes ?? '',
  };

  const save = (values: DealFormValues) => {
    update.mutate(
      {
        id: deal.id,
        patch: {
          title: values.title,
          client_id: values.client_id,
          stage: values.stage,
          amount: parseAmount(values.amount),
          owner_id: values.owner_id,
          expected_close: values.expected_close,
          notes: values.notes || null,
        },
      },
      { onSuccess: () => setEditing(false), onError: (err) => toast.error(err) },
    );
  };

  const del = async () => {
    const ok = await confirm({
      title: `Удалить сделку «${deal.title}»?`,
      text: 'Это действие нельзя отменить.',
    });
    if (!ok) return;
    remove.mutate(deal.id, { onSuccess: onClose, onError: (err) => toast.error(err) });
  };

  const overdue = isDealOverdue(deal, today);

  return (
    <Drawer title={<h2>{deal.title}</h2>} onClose={onClose} dirty={editing && dirty}>
      {editing ? (
        <DealForm
          initial={initial}
          clients={clients}
          profiles={profiles}
          submitLabel="Сохранить"
          busy={update.isPending}
          onSubmit={save}
          onCancel={() => setEditing(false)}
          onDirtyChange={setDirty}
        />
      ) : (
        <>
          <div className="row">
            <span className={DEAL_STAGE_BADGE[deal.stage]}>{DEAL_STAGE_LABEL[deal.stage]}</span>
            {deal.amount !== null ? <strong>{formatMoney(deal.amount)}</strong> : null}
            {deal.expected_close ? (
              <span className={overdue ? 'badge badge-danger' : 'badge'}>
                до {formatDate(deal.expected_close)}
              </span>
            ) : null}
          </div>
          <div className="stack small">
            <div className="row">
              <span className="muted">Клиент:</span>
              {deal.client ? (
                <Link className="link" to={`/clients/${deal.client.id}`}>
                  {deal.client.name}
                </Link>
              ) : (
                <span>—</span>
              )}
            </div>
            <div className="row">
              <span className="muted">Ответственный:</span>
              {deal.owner ? (
                <span className="row">
                  <Avatar name={deal.owner.name} color={deal.owner.color} /> {deal.owner.name}
                </span>
              ) : (
                <span>не назначен</span>
              )}
            </div>
            <div className="row muted">
              <span>Создана {formatDateTime(deal.created_at)}</span>
              {deal.closed_at ? <span>· закрыта {formatDateTime(deal.closed_at)}</span> : null}
            </div>
          </div>
          {deal.notes ? <Markdown text={deal.notes} /> : <p className="muted">Без заметок.</p>}
          <div className="stack small">
            <div className="row">
              <span className="muted">Задачи клиента: {clientTasks.length}</span>
              <Link className="link" to={`/board?client=${deal.client_id}&new=1`}>
                Новая задача
              </Link>
            </div>
            {clientTasks.slice(0, 5).map((t) => (
              <Link key={t.id} className="link" to={`/board?task=${t.id}`}>
                {t.title}
              </Link>
            ))}
            {clientTasks.length > 5 ? (
              <Link className="link muted" to={`/board?client=${deal.client_id}`}>
                Все на доске
              </Link>
            ) : null}
          </div>
          <div className="row">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setEditing(true)}
            >
              Редактировать
            </button>
            {isAdmin || deal.created_by === me.id ? (
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
    </Drawer>
  );
}
