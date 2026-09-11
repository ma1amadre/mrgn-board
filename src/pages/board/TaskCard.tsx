import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties } from 'react';
import type { TaskWithRefs } from '../../shared/api/types';
import { formatDate } from '../../shared/lib/dates';
import { PRIORITY_BADGE, PRIORITY_LABEL } from '../../shared/lib/labels';
import { Avatar } from '../../shared/ui/Avatar';
import { dueBadgeClass } from './dueBadge';

/** Презентационная карточка: в колонке и в DragOverlay. */
export function TaskCardView({
  task,
  today,
  className,
  style,
  onClick,
  ...rest
}: {
  task: TaskWithRefs;
  today: string;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
} & Record<string, unknown>) {
  return (
    <div
      className={`card card-interactive task ${className ?? ''}`}
      style={style}
      onClick={onClick}
      {...rest}
    >
      <div className="task-title">{task.title}</div>
      <div className="task-meta">
        {task.priority !== 'normal' ? (
          <span className={PRIORITY_BADGE[task.priority]}>{PRIORITY_LABEL[task.priority]}</span>
        ) : null}
        {task.due_date ? (
          <span className={dueBadgeClass(task, today)}>{formatDate(task.due_date)}</span>
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
  onOpen,
}: {
  task: TaskWithRefs;
  today: string;
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
      {...attributes}
      {...listeners}
    />
  );
}
