import { formatDate } from './dates';
import { PRIORITY_LABEL, type Priority } from './labels';

export type ActivityLike = {
  id: string;
  kind: string;
  from_value: string | null;
  to_value: string | null;
  actor_id: string | null;
  created_at: string;
};

const NONE = '—';

function priorityLabel(value: string | null): string {
  if (value === null) return NONE;
  return value in PRIORITY_LABEL ? PRIORITY_LABEL[value as Priority] : value;
}

/** Строка ленты для записи task_activity. Значения там уже подписи (имя стадии, исполнителя),
 *  а не id — см. 005_activity; здесь только приоритет и дата переводятся в человеческий вид. */
export function describeActivity(
  a: Pick<ActivityLike, 'kind' | 'from_value' | 'to_value'>,
  now: Date = new Date(),
): string {
  const from = a.from_value;
  const to = a.to_value;
  switch (a.kind) {
    case 'created':
      return 'Задача создана';
    case 'stage':
      return `Стадия: ${from ?? NONE} → ${to ?? NONE}`;
    case 'assignee':
      return `Исполнитель: ${from ?? 'не назначен'} → ${to ?? 'не назначен'}`;
    case 'assignee_add':
      return `Исполнитель добавлен: ${to ?? ''}`;
    case 'assignee_remove':
      return `Исполнитель снят: ${from ?? ''}`;
    case 'client':
      return `Клиент: ${from ?? NONE} → ${to ?? NONE}`;
    case 'priority':
      return `Приоритет: ${priorityLabel(from)} → ${priorityLabel(to)}`;
    case 'due_date':
      return `Срок: ${from ? formatDate(from, now) : NONE} → ${to ? formatDate(to, now) : NONE}`;
    case 'title':
      return `Название: «${from ?? ''}» → «${to ?? ''}»`;
    case 'description':
      return 'Описание изменено';
    case 'checklist_add':
      return `Пункт добавлен: ${to ?? ''}`;
    case 'checklist_done':
      return `Пункт выполнен: ${to ?? ''}`;
    case 'checklist_undone':
      return `Пункт снова открыт: ${to ?? ''}`;
    case 'checklist_remove':
      return `Пункт удалён: ${from ?? ''}`;
    case 'attachment_add':
      return `Файл добавлен: ${to ?? ''}`;
    case 'attachment_remove':
      return `Файл удалён: ${from ?? ''}`;
    case 'archived':
      return 'Задача в архиве';
    case 'restored':
      return 'Задача восстановлена из архива';
    case 'labels':
      return `Метки: ${from || NONE} → ${to || NONE}`;
    default:
      return `Изменение: ${a.kind}`;
  }
}

export type ActivityGroup<T> = {
  id: string;
  actor_id: string | null;
  created_at: string;
  items: T[];
};

/**
 * Одно сохранение формы даёт несколько строк подряд — склеиваем записи одного автора,
 * попавшие в окно windowMs от первой записи блока. Порядок входа сохраняется, направление любое.
 */
export function groupActivity<T extends ActivityLike>(
  items: T[],
  windowMs = 60_000,
): ActivityGroup<T>[] {
  const groups: ActivityGroup<T>[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    const close =
      last !== undefined &&
      last.actor_id === item.actor_id &&
      Math.abs(Date.parse(item.created_at) - Date.parse(last.created_at)) <= windowMs;
    if (close) {
      last.items.push(item);
    } else {
      groups.push({
        id: item.id,
        actor_id: item.actor_id,
        created_at: item.created_at,
        items: [item],
      });
    }
  }
  return groups;
}
