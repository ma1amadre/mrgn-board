import { Link } from 'react-router-dom';
import type { TaskWithRefs } from '../../shared/api/types';
import { formatDate } from '../../shared/lib/dates';
import { AvatarStack } from '../../shared/ui/AvatarStack';
import { EmptyState } from '../../shared/ui/EmptyState';
import { dueBadgeClass } from '../board/dueBadge';

export function DeadlinesList({ tasks, today }: { tasks: TaskWithRefs[]; today: string }) {
  return (
    <section className="card">
      <h2>Сроки: просроченные и ближайшие 7 дней</h2>
      {tasks.length === 0 ? (
        <EmptyState inline>Ничего не горит: просроченных и задач на неделю нет.</EmptyState>
      ) : null}
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
            <AvatarStack people={t.assignees} />
          </Link>
        ))}
      </div>
    </section>
  );
}
