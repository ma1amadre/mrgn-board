import { useState } from 'react';
import { useDealActivity } from '../../shared/api/dealActivity';
import { groupActivity } from '../../shared/lib/activity';
import { formatDateTime } from '../../shared/lib/dates';
import { describeDealActivity } from '../../shared/lib/dealActivity';
import { Avatar } from '../../shared/ui/Avatar';

const PREVIEW = 5;

/** История сделки: те же блоки, что у задачи, — автор, время, список изменений. */
export function DealActivityList({ dealId, enabled }: { dealId: string; enabled: boolean }) {
  const activity = useDealActivity(dealId, enabled);
  const [expanded, setExpanded] = useState(false);
  const groups = groupActivity(activity.data ?? []);
  const shown = expanded ? groups : groups.slice(0, PREVIEW);

  return (
    <section className="stack">
      {activity.isPending ? <p className="muted small">Загрузка…</p> : null}
      {activity.isError ? <p className="muted small">Не удалось загрузить историю.</p> : null}
      {activity.data?.length === 0 ? <p className="muted small">Пока пусто.</p> : null}
      {shown.length > 0 ? (
        <ul className="activity">
          {shown.map((g) => {
            const actor = g.items[0]?.actor ?? null;
            return (
              <li key={g.id} className="activity-item">
                <div className="comment-meta">
                  {actor ? <Avatar name={actor.name} color={actor.color} /> : null}
                  <span>{actor?.name ?? 'Система'}</span>
                  <span>·</span>
                  <span>{formatDateTime(g.created_at)}</span>
                </div>
                <div className="activity-lines small">
                  {g.items.map((a) => (
                    <div key={a.id}>{describeDealActivity(a)}</div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
      {groups.length > PREVIEW && !expanded ? (
        <div className="row">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setExpanded(true)}>
            Показать всё ({groups.length})
          </button>
        </div>
      ) : null}
    </section>
  );
}
