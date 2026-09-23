import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, ReactNode } from 'react';
import type { TaskWithRefs } from '../../shared/api/types';
import { formatDate } from '../../shared/lib/dates';
import { PRIORITY_BADGE, PRIORITY_LABEL } from '../../shared/lib/labels';
import { Avatar } from '../../shared/ui/Avatar';
import { IconCheck, IconPaperclip } from '../../shared/ui/icons';
import { Menu, type MenuItem } from '../../shared/ui/Menu';
import { dueTone } from './dueBadge';

/** На карточке одна цветная вещь: срочность или горящий срок. Метки — текстом, низкий приоритет
 *  не показывается вовсе, спокойный срок — серым; всё остальное читается в карточке задачи. */
export function TaskCardView({
  task,
  today,
  className,
  style,
  onClick,
  menu,
  ...rest
}: {
  task: TaskWithRefs;
  today: string;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  /** Меню быстрых действий; в DragOverlay его нет. */
  menu?: ReactNode;
} & Record<string, unknown>) {
  return (
    <div
      className={`card card-interactive task ${className ?? ''}`}
      style={style}
      onClick={onClick}
      {...rest}
    >
      <div className="task-head">
        <div className="task-title">{task.title}</div>
        {menu}
      </div>
      {task.labels.length > 0 ? (
        <div className="task-labels">
          {task.labels.map((l) => (
            <span key={l} className="task-label">
              #{l}
            </span>
          ))}
        </div>
      ) : null}
      <div className="task-meta">
        {task.priority === 'urgent' || task.priority === 'high' ? (
          <span className={PRIORITY_BADGE[task.priority]}>{PRIORITY_LABEL[task.priority]}</span>
        ) : null}
        {task.due_date
          ? (() => {
              const tone = dueTone(task, today);
              return tone ? (
                <span className={`badge badge-${tone}`}>{formatDate(task.due_date)}</span>
              ) : (
                <span className="muted">{formatDate(task.due_date)}</span>
              );
            })()
          : null}
        {task.checklist.length > 0 ? (
          <span className="muted with-icon" title="Чек-лист">
            <IconCheck size={14} />
            {task.checklist.filter((i) => i.is_done).length}/{task.checklist.length}
          </span>
        ) : null}
        {task.attachments.length > 0 ? (
          <span className="muted with-icon" title="Вложения">
            <IconPaperclip size={14} />
            {task.attachments.length}
          </span>
        ) : null}
        {task.client ? <span className="muted">{task.client.name}</span> : null}
        {task.assignee ? <Avatar name={task.assignee.name} color={task.assignee.color} /> : null}
      </div>
    </div>
  );
}

export function SortableTaskCard({
  task,
  today,
  actions,
  onOpen,
}: {
  task: TaskWithRefs;
  today: string;
  actions: MenuItem[];
  onOpen: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    data: { stageId: task.stage_id },
  });
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition };
  return (
    <TaskCardView
      ref={setNodeRef}
      task={task}
      today={today}
      className={isDragging ? 'task-dragging' : ''}
      style={style}
      onClick={() => onOpen(task.id)}
      menu={<Menu label={`Действия: ${task.title}`} items={actions} />}
      {...attributes}
      {...listeners}
    />
  );
}
