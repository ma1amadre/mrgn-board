import { describeActivity, type ActivityLike } from './activity';
import { describeDealActivity, type DealActivityLike } from './dealActivity';

export type FeedActor = { name: string; color: string };

export type FeedEvent = {
  id: string;
  at: string;
  actor: FeedActor | null;
  /** Что изменилось: строка ленты задачи или сделки, либо текст комментария. */
  text: string;
  /** О чём: название задачи или сделки. */
  about: string;
  to: string;
};

export type FeedInput = {
  activity: ReadonlyArray<ActivityLike & { task_id: string; actor: FeedActor | null }>;
  comments: ReadonlyArray<{
    id: string;
    task_id: string;
    body: string;
    created_at: string;
    author: FeedActor | null;
  }>;
  dealActivity: ReadonlyArray<DealActivityLike & { deal_id: string; actor: FeedActor | null }>;
  tasks: ReadonlyArray<{ id: string; title: string }>;
  deals: ReadonlyArray<{ id: string; title: string }>;
};

const COMMENT_PREVIEW = 120;

/** Лента клиента: изменения его задач и сделок и комментарии к задачам, свежие сверху. */
export function buildClientFeed(input: FeedInput, limit = 50, now: Date = new Date()): FeedEvent[] {
  const taskTitle = new Map(input.tasks.map((t) => [t.id, t.title]));
  const dealTitle = new Map(input.deals.map((d) => [d.id, d.title]));
  const events: FeedEvent[] = [];
  for (const a of input.activity) {
    events.push({
      id: `a:${a.id}`,
      at: a.created_at,
      actor: a.actor,
      text: describeActivity(a, now),
      about: taskTitle.get(a.task_id) ?? 'Задача',
      to: `/board?task=${a.task_id}`,
    });
  }
  for (const c of input.comments) {
    const body = c.body.length > COMMENT_PREVIEW ? `${c.body.slice(0, COMMENT_PREVIEW)}…` : c.body;
    events.push({
      id: `c:${c.id}`,
      at: c.created_at,
      actor: c.author,
      text: `Комментарий: ${body}`,
      about: taskTitle.get(c.task_id) ?? 'Задача',
      to: `/board?task=${c.task_id}`,
    });
  }
  for (const a of input.dealActivity) {
    events.push({
      id: `d:${a.id}`,
      at: a.created_at,
      actor: a.actor,
      text: describeDealActivity(a, now),
      about: dealTitle.get(a.deal_id) ?? 'Сделка',
      to: `/deals?deal=${a.deal_id}`,
    });
  }
  return events.sort((x, y) => y.at.localeCompare(x.at)).slice(0, limit);
}

/** Последняя активность клиента: самое свежее из updated_at клиента, его задач и сделок.
 *  Комментарии задачу не трогают, поэтому в оценку не попадают — это грубая, но дешёвая мера. */
export function lastActivityByClient(
  clients: ReadonlyArray<{ id: string; updated_at: string }>,
  tasks: ReadonlyArray<{ client_id: string | null; updated_at: string }>,
  deals: ReadonlyArray<{ client_id: string; updated_at: string }>,
): Map<string, string> {
  const map = new Map<string, string>(clients.map((c) => [c.id, c.updated_at]));
  const bump = (id: string | null, at: string) => {
    if (id === null) return;
    const cur = map.get(id);
    if (cur === undefined || at > cur) map.set(id, at);
  };
  for (const t of tasks) bump(t.client_id, t.updated_at);
  for (const d of deals) bump(d.client_id, d.updated_at);
  return map;
}
