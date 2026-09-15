import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  useMarkAllRead,
  useMarkRead,
  useNotificationsHistory,
  useUnreadCount,
  type Notification,
} from '../../shared/api/notifications';
import { formatRelative } from '../../shared/lib/dates';
import { NOTIFICATION_KIND_LABEL } from '../../shared/lib/labels';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonRows } from '../../shared/ui/Skeleton';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';

/** Вся история уведомлений постранично; колокольчик показывает только последние. */
export function NotificationsFeedPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [sp, setSp] = useSearchParams();
  const onlyUnread = sp.get('unread') === '1';
  const history = useNotificationsHistory(onlyUnread);
  const unread = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  useDocumentTitle('Уведомления');

  const onError = (err: unknown) => toast.error(err);
  const setOnlyUnread = (value: boolean) => {
    const next = new URLSearchParams(sp);
    if (value) next.set('unread', '1');
    else next.delete('unread');
    setSp(next, { replace: true });
  };

  const open = (n: Notification) => {
    if (n.read_at === null) markRead.mutate([n.id], { onError });
    if (n.link) navigate(n.link);
  };

  const items = history.data?.pages.flat() ?? [];

  return (
    <>
      <PageHead
        title="Уведомления"
        actions={
          <>
            <div className="row" role="group" aria-label="Какие показывать">
              <button
                type="button"
                className={onlyUnread ? 'btn btn-ghost btn-sm' : 'btn btn-secondary btn-sm'}
                aria-pressed={!onlyUnread}
                onClick={() => setOnlyUnread(false)}
              >
                Все
              </button>
              <button
                type="button"
                className={onlyUnread ? 'btn btn-secondary btn-sm' : 'btn btn-ghost btn-sm'}
                aria-pressed={onlyUnread}
                onClick={() => setOnlyUnread(true)}
              >
                Непрочитанные{unread.data ? ` · ${unread.data}` : ''}
              </button>
            </div>
            {(unread.data ?? 0) > 0 ? (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => markAll.mutate(undefined, { onError })}
                disabled={markAll.isPending}
              >
                Прочитать все
              </button>
            ) : null}
          </>
        }
      />
      {history.isPending ? <SkeletonRows rows={4} /> : null}
      {history.isError ? <EmptyState>Не удалось загрузить уведомления.</EmptyState> : null}
      {history.data && items.length === 0 ? (
        <EmptyState>
          {onlyUnread
            ? 'Непрочитанных нет.'
            : 'Пока ничего: назначения, комментарии и упоминания появятся здесь.'}
        </EmptyState>
      ) : null}
      {items.length > 0 ? (
        <div className="notif-page">
          {items.map((n) => (
            <div key={n.id} className={n.read_at === null ? 'notif-row is-unread' : 'notif-row'}>
              <button type="button" className="notif-item" onClick={() => open(n)}>
                <span className="notif-title">{n.title}</span>
                {n.body ? <span className="notif-body">{n.body}</span> : null}
                <span className="notif-time muted small">
                  {NOTIFICATION_KIND_LABEL[n.kind] ?? n.kind} · {formatRelative(n.created_at)}
                </span>
              </button>
              {n.read_at === null ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  aria-label={`Отметить прочитанным: ${n.title}`}
                  title="Отметить прочитанным"
                  onClick={() => markRead.mutate([n.id], { onError })}
                  disabled={markRead.isPending}
                >
                  ✓
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      {history.hasNextPage ? (
        <div className="row">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void history.fetchNextPage()}
            disabled={history.isFetchingNextPage}
          >
            {history.isFetchingNextPage ? 'Загрузка…' : 'Показать ещё'}
          </button>
        </div>
      ) : null}
    </>
  );
}
