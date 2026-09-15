import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  useMarkAllRead,
  useMarkRead,
  useRecentNotifications,
  useUnreadCount,
  type Notification,
} from '../shared/api/notifications';
import { formatRelative } from '../shared/lib/dates';
import { useToast } from '../shared/ui/toastContext';

/** Колокольчик с непрочитанными; список — последние уведомления, клик открывает объект.
 *  Счётчик — отдельный count по базе: список обрезан лимитом, и по нему считать нельзя. */
export function NotificationsBell() {
  const navigate = useNavigate();
  const toast = useToast();
  const list = useRecentNotifications();
  const unreadCount = useUnreadCount();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const items = list.data ?? [];
  const unread = unreadCount.data ?? 0;

  const openItem = (n: Notification) => {
    setOpen(false);
    if (n.read_at === null) markRead.mutate([n.id], { onError: (err) => toast.error(err) });
    if (n.link) navigate(n.link);
  };

  return (
    <div ref={ref} className="bell">
      <button
        type="button"
        className="btn btn-ghost btn-sm btn-icon"
        aria-label={unread > 0 ? `Уведомления, непрочитанных: ${unread}` : 'Уведомления'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path d="M10 20a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" />
        </svg>
        {unread > 0 ? <span className="bell-count">{unread > 99 ? '99+' : unread}</span> : null}
      </button>
      {open ? (
        <div className="popover notif-list" role="dialog" aria-label="Уведомления">
          <div className="notif-head">
            <strong>Уведомления</strong>
            <span className="row">
              {unread > 0 ? (
                <button
                  type="button"
                  className="link-button"
                  onClick={() => markAll.mutate(undefined, { onError: (err) => toast.error(err) })}
                >
                  Прочитать все
                </button>
              ) : null}
              <Link className="link small" to="/notifications" onClick={() => setOpen(false)}>
                Все
              </Link>
            </span>
          </div>
          {list.isPending ? <p className="muted small">Загрузка…</p> : null}
          {items.length === 0 && !list.isPending ? (
            <p className="muted small">
              Пока ничего: назначения, комментарии и упоминания появятся здесь.
            </p>
          ) : null}
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              className={n.read_at === null ? 'notif-item is-unread' : 'notif-item'}
              onClick={() => openItem(n)}
            >
              <span className="notif-title">{n.title}</span>
              {n.body ? <span className="notif-body">{n.body}</span> : null}
              <span className="notif-time muted small">{formatRelative(n.created_at)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
