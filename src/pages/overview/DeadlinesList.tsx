import { Link } from 'react-router-dom';
import type { TaskWithRefs } from '../../shared/api/types';
import { formatDate } from '../../shared/lib/dates';
import { Avatar } from '../../shared/ui/Avatar';
import { dueBadgeClass } from '../board/dueBadge';

export function DeadlinesList({ tasks, today }: { tasks: TaskWithRefs[]; today: string }) {
  return (
    <section className="card">
      <h2>Сроки: просроченные и ближайшие 7 дней</h2>
      {tasks.length === 0 ? <p className="muted">Ничего не горит.</p> : null}
      <div className="tile-rows">
        {tasks.map((t) => (
          <Link
            key={t.id}
            className="tile-row"
            to={`/board?task=${t.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <span
              className={dueBadgeClass(t, today)}
              style={{ minWidth: 64, justifyContent: 'center' }}
            >
              {t.due_date ? formatDate(t.due_date) : '—'}
            </span>
            <span className="grow">{t.title}</span>
            {t.client ? <span className="muted small">{t.client.name}</span> : null}
            {t.assignee ? <Avatar name={t.assignee.name} color={t.assignee.color} /> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
