import { useMemo, useState } from 'react';
import { useClearClientErrors, useClientErrors } from '../../shared/api/clientErrors';
import { useProfiles } from '../../shared/api/profiles';
import { formatDateTime } from '../../shared/lib/dates';
import { useConfirm } from '../../shared/ui/confirmContext';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonRows } from '../../shared/ui/Skeleton';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';

/** Журнал ошибок клиента: одинаковые сообщения свёрнуты, стек по клику. */
export function ErrorsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const errors = useClientErrors();
  const profiles = useProfiles();
  const clear = useClearClientErrors();
  const [openId, setOpenId] = useState<string | null>(null);
  useDocumentTitle('Ошибки клиента');

  const groups = useMemo(() => {
    const map = new Map<
      string,
      {
        message: string;
        count: number;
        last: string;
        url: string | null;
        stack: string | null;
        id: string;
        who: Set<string>;
      }
    >();
    for (const e of errors.data ?? []) {
      const g = map.get(e.message);
      if (g) {
        g.count += 1;
        if (e.profile_id) g.who.add(e.profile_id);
      } else {
        map.set(e.message, {
          message: e.message,
          count: 1,
          last: e.created_at,
          url: e.url,
          stack: e.stack,
          id: e.id,
          who: new Set(e.profile_id ? [e.profile_id] : []),
        });
      }
    }
    return [...map.values()];
  }, [errors.data]);

  const nameOf = (id: string) => profiles.data?.find((p) => p.id === id)?.name ?? '?';

  const clearAll = async () => {
    const ok = await confirm({ title: 'Очистить журнал ошибок?', confirmLabel: 'Очистить' });
    if (!ok) return;
    clear.mutate(undefined, { onError: (err) => toast.error(err) });
  };

  return (
    <>
      <PageHead
        title="Ошибки клиента"
        actions={
          groups.length > 0 ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void clearAll()}
              disabled={clear.isPending}
            >
              Очистить
            </button>
          ) : null
        }
      />
      <p className="muted">
        Ошибки рендера и необработанные исключения из браузеров участников за последние записи (не
        больше 20 в час на человека). Одинаковые сообщения свёрнуты.
      </p>
      {errors.isPending ? <SkeletonRows rows={3} /> : null}
      {errors.isError ? <EmptyState>Не удалось загрузить журнал.</EmptyState> : null}
      {groups.length === 0 && errors.data ? <EmptyState>Ошибок не было.</EmptyState> : null}
      <div className="stack">
        {groups.map((g) => (
          <div key={g.id} className="card stack">
            <div className="row">
              <strong className="grow prewrap">{g.message}</strong>
              <span className="badge">{g.count}</span>
            </div>
            <div className="row small muted">
              <span>Последний раз {formatDateTime(g.last)}</span>
              {g.who.size > 0 ? <span>· {[...g.who].map(nameOf).join(', ')}</span> : null}
              {g.url ? <span className="prewrap">· {g.url}</span> : null}
            </div>
            {g.stack ? (
              <>
                <button
                  type="button"
                  className="link-button small"
                  onClick={() => setOpenId(openId === g.id ? null : g.id)}
                >
                  {openId === g.id ? 'Скрыть стек' : 'Показать стек'}
                </button>
                {openId === g.id ? (
                  <pre className="prewrap small">
                    <code>{g.stack}</code>
                  </pre>
                ) : null}
              </>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
