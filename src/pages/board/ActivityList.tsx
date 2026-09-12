import { useState } from 'react';
import { useActivity } from '../../shared/api/activity';
import { describeActivity, groupActivity } from '../../shared/lib/activity';
import { formatDateTime } from '../../shared/lib/dates';
import { Avatar } from '../../shared/ui/Avatar';

/** Сколько блоков видно без разворачивания: обычно хватает, чтобы понять, что случилось недавно. */
const PREVIEW = 5;

export function ActivityList({ taskId }: { taskId: string }) {
  const activity = useActivity(taskId);
  const [expanded, setExpanded] = useState(false);
  const groups = groupActivity(activity.data ?? []);
  const shown = expanded ? groups : groups.slice(0, PREVIEW);

  return (
    <section className="stack">
      <h3>История</h3>
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
                    <div key={a.id}>{describeActivity(a)}</div>
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
