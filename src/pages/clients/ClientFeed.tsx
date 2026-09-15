import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ClientFeedData } from '../../shared/api/feed';
import { formatDateTime } from '../../shared/lib/dates';
import { buildClientFeed } from '../../shared/lib/feed';
import { Avatar } from '../../shared/ui/Avatar';

const PREVIEW = 15;

/** Что происходило с клиентом: задачи, сделки, комментарии — одной лентой, свежие сверху. */
export function ClientFeed({
  data,
  pending,
  error,
  tasks,
  deals,
}: {
  data: ClientFeedData | undefined;
  pending: boolean;
  error: boolean;
  tasks: ReadonlyArray<{ id: string; title: string }>;
  deals: ReadonlyArray<{ id: string; title: string }>;
}) {
  const [expanded, setExpanded] = useState(false);
  const events = useMemo(
    () => (data ? buildClientFeed({ ...data, tasks, deals }) : []),
    [data, tasks, deals],
  );
  const shown = expanded ? events : events.slice(0, PREVIEW);

  return (
    <section className="stack">
      <h2>Лента{data ? ` (${events.length})` : ''}</h2>
      {pending ? <p className="muted small">Загрузка…</p> : null}
      {error ? <p className="muted small">Не удалось загрузить ленту.</p> : null}
      {data && events.length === 0 ? <p className="muted">Пока ничего не происходило.</p> : null}
      {shown.length > 0 ? (
        <ul className="activity">
          {shown.map((e) => (
            <li key={e.id} className="activity-item">
              <div className="comment-meta">
                {e.actor ? <Avatar name={e.actor.name} color={e.actor.color} /> : null}
                <span>{e.actor?.name ?? 'Система'}</span>
                <span>·</span>
                <span>{formatDateTime(e.at)}</span>
                <span>·</span>
                <Link className="link" to={e.to}>
                  {e.about}
                </Link>
              </div>
              <div className="activity-lines small">{e.text}</div>
            </li>
          ))}
        </ul>
      ) : null}
      {events.length > PREVIEW && !expanded ? (
        <div className="row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded(true)}>
            Показать всё ({events.length})
          </button>
        </div>
      ) : null}
    </section>
  );
}
