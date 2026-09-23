import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProfile } from '../../app/auth/authContext';
import { useClients } from '../../shared/api/clients';
import { useDealMutations, useDeals } from '../../shared/api/deals';
import { useProfiles } from '../../shared/api/profiles';
import type { DealWithRefs } from '../../shared/api/types';
import { withCurrentClient } from '../../shared/lib/clients';
import { csvFilename, toCsv } from '../../shared/lib/csv';
import { formatDate, today as todayIso } from '../../shared/lib/dates';
import {
  OPEN_DEAL_STAGES,
  dealQuickActions,
  formatMoney,
  funnel,
  isDealOverdue,
  parseAmount,
  sortDeals,
} from '../../shared/lib/deals';
import { downloadTextFile } from '../../shared/lib/download';
import { DEAL_STAGES, DEAL_STAGE_LABEL, type DealStage } from '../../shared/lib/labels';
import { Avatar } from '../../shared/ui/Avatar';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Menu } from '../../shared/ui/Menu';
import { Modal } from '../../shared/ui/Modal';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonCard } from '../../shared/ui/Skeleton';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { DealDrawer } from './DealDrawer';
import { DealForm, type DealFormValues } from './DealForm';

function matches(d: DealWithRefs, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  return [d.title, d.client?.name ?? '', d.notes ?? ''].some((s) =>
    s.toLowerCase().includes(needle),
  );
}

export function DealsPage() {
  const me = useProfile();
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const deals = useDeals();
  const clients = useClients();
  const profiles = useProfiles();
  const { create, update } = useDealMutations();
  const [creatingLocal, setCreatingLocal] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  useDocumentTitle('Сделки');

  const q = sp.get('q') ?? '';
  const clientFilter = sp.get('client');
  // Выигранные и проигранные копятся и не помещаются в ширину экрана — по умолчанию свёрнуты.
  const showClosed = sp.get('closed') === '1';
  const shownStages = showClosed ? DEAL_STAGES : OPEN_DEAL_STAGES;
  const selectedId = sp.get('deal');
  const today = todayIso();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(sp);
      if (value) next.set(key, value);
      else next.delete(key);
      setSp(next, { replace: true });
    },
    [sp, setSp],
  );

  // ?new=1 приходит с карточки клиента и открывает форму; закрытие убирает его из адреса.
  const creating = creatingLocal || sp.get('new') === '1';
  const setCreating = useCallback(
    (open: boolean) => {
      setCreatingLocal(open);
      if (!open && sp.has('new')) setParam('new', null);
    },
    [sp, setParam],
  );

  const visible = useMemo(
    () =>
      (deals.data ?? []).filter(
        (d) => (!clientFilter || d.client_id === clientFilter) && matches(d, q),
      ),
    [deals.data, clientFilter, q],
  );
  const byStage = useMemo(() => {
    const map = new Map<DealStage, DealWithRefs[]>(DEAL_STAGES.map((s) => [s, []]));
    for (const d of visible) map.get(d.stage)?.push(d);
    for (const [s, list] of map) map.set(s, sortDeals(list));
    return map;
  }, [visible]);
  const totals = useMemo(() => funnel(visible), [visible]);
  // Фильтр по клиенту из ссылки может указывать на архивного: в списке его нет, имя берём из сделок.
  const filterClients = useMemo(
    () =>
      withCurrentClient(
        clients.data ?? [],
        clientFilter
          ? ((deals.data ?? []).find((d) => d.client_id === clientFilter)?.client ?? {
              id: clientFilter,
              name: '',
            })
          : null,
      ),
    [clients.data, deals.data, clientFilter],
  );

  const exportCsv = () => {
    const rows = visible.map((d) => [
      d.title,
      d.client?.name ?? '',
      DEAL_STAGE_LABEL[d.stage],
      d.amount ?? '',
      d.owner?.name ?? '',
      d.expected_close ?? '',
      d.created_at.slice(0, 10),
      d.closed_at?.slice(0, 10) ?? '',
    ]);
    downloadTextFile(
      csvFilename('deals', today),
      toCsv(
        [
          'Название',
          'Клиент',
          'Стадия',
          'Сумма',
          'Ответственный',
          'Ожидаемое закрытие',
          'Создана',
          'Закрыта',
        ],
        rows,
      ),
    );
  };

  const newDealInitial: DealFormValues = {
    title: '',
    client_id: clientFilter ?? '',
    stage: 'new',
    amount: '',
    owner_id: me.id,
    expected_close: null,
    notes: '',
    lost_reason: '',
  };

  const submitNew = (values: DealFormValues) => {
    create.mutate(
      {
        title: values.title,
        client_id: values.client_id,
        stage: values.stage,
        amount: parseAmount(values.amount),
        owner_id: values.owner_id,
        expected_close: values.expected_close,
        notes: values.notes || null,
        lost_reason: values.lost_reason || null,
        created_by: me.id,
      },
      { onSuccess: () => setCreating(false), onError: (err) => toast.error(err) },
    );
  };

  const actionsFor = (d: DealWithRefs) =>
    dealQuickActions(d, me.id, (s) => DEAL_STAGE_LABEL[s]).map((a) => ({
      key: a.key,
      label: a.label,
      onSelect: () =>
        update.mutate({ id: d.id, patch: a.patch }, { onError: (err) => toast.error(err) }),
    }));

  const loading = deals.isPending || clients.isPending || profiles.isPending;
  const failed = deals.isError || clients.isError || profiles.isError;
  const filterActive = Boolean(clientFilter || q.trim());

  return (
    <>
      <PageHead
        title="Сделки"
        actions={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={exportCsv}
              disabled={!deals.data}
              title="Скачать видимые сделки в CSV"
            >
              CSV
            </button>
            <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
              Новая сделка
            </button>
          </>
        }
      />
      <div className="toolbar" role="search">
        <input
          className="input toolbar-search"
          data-hotkey="search"
          aria-label="Поиск по сделкам"
          placeholder="Поиск: название, клиент, заметки"
          value={q}
          onChange={(e) => setParam('q', e.target.value || null)}
        />
        <select
          className="select"
          aria-label="Клиент"
          value={clientFilter ?? ''}
          onChange={(e) => setParam('client', e.target.value || null)}
        >
          <option value="">Все клиенты</option>
          {filterClients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {filterActive ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              const next = new URLSearchParams(sp);
              next.delete('q');
              next.delete('client');
              setSp(next, { replace: true });
            }}
          >
            Сбросить
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: 'auto' }}
          aria-pressed={showClosed}
          onClick={() => setParam('closed', showClosed ? null : '1')}
        >
          {showClosed ? 'Скрыть закрытые' : `Закрытые · ${totals.won.count + totals.lost.count}`}
        </button>
      </div>

      {loading ? (
        <div className="board" aria-busy="true">
          {DEAL_STAGES.map((s) => (
            <div key={s} className="column">
              <SkeletonCard />
            </div>
          ))}
        </div>
      ) : null}
      {failed ? <EmptyState>Не удалось загрузить сделки.</EmptyState> : null}
      {deals.data ? (
        <div className="board">
          {shownStages.map((stage) => {
            const list = byStage.get(stage) ?? [];
            const total = totals[stage];
            return (
              <section key={stage} className="column" aria-label={DEAL_STAGE_LABEL[stage]}>
                <div className="column-head">
                  <span>{DEAL_STAGE_LABEL[stage]}</span>
                  <span className="badge">{total.count}</span>
                  {total.amount > 0 ? (
                    <span className="muted small" style={{ marginLeft: 'auto' }}>
                      {formatMoney(total.amount)}
                    </span>
                  ) : null}
                </div>
                {list.map((d) => (
                  <div
                    key={d.id}
                    className="card card-interactive task"
                    role="button"
                    tabIndex={0}
                    onClick={() => setParam('deal', d.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setParam('deal', d.id);
                      }
                    }}
                  >
                    <div className="task-head">
                      <div className="task-title">{d.title}</div>
                      <Menu label={`Действия: ${d.title}`} items={actionsFor(d)} />
                    </div>
                    <div className="task-meta">
                      {d.amount !== null ? <strong>{formatMoney(d.amount)}</strong> : null}
                      {d.expected_close ? (
                        <span className={isDealOverdue(d, today) ? 'badge badge-danger' : 'badge'}>
                          {formatDate(d.expected_close)}
                        </span>
                      ) : null}
                      {d.client ? <span className="muted">{d.client.name}</span> : null}
                      {d.owner ? <Avatar name={d.owner.name} color={d.owner.color} /> : null}
                    </div>
                  </div>
                ))}
                {list.length === 0 ? <div className="column-empty">Пусто</div> : null}
              </section>
            );
          })}
        </div>
      ) : null}

      {creating ? (
        <Modal title="Новая сделка" onClose={() => setCreating(false)} dirty={draftDirty}>
          <DealForm
            initial={newDealInitial}
            clients={filterClients}
            profiles={profiles.data ?? []}
            meId={me.id}
            submitLabel="Создать"
            busy={create.isPending}
            onSubmit={submitNew}
            onCancel={() => setCreating(false)}
            onDirtyChange={setDraftDirty}
          />
        </Modal>
      ) : null}

      {selectedId ? (
        <DealDrawer
          deal={deals.data?.find((d) => d.id === selectedId)}
          clients={clients.data ?? []}
          profiles={profiles.data ?? []}
          today={today}
          onClose={() => setParam('deal', null)}
        />
      ) : null}
    </>
  );
}
