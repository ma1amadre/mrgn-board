import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Stage, TaskWithRefs } from '../../shared/api/types';
import type { MenuItem } from '../../shared/ui/Menu';
import { SortableTaskCard } from './TaskCard';

export function KanbanColumn({
  stage,
  tasks,
  today,
  actionsFor,
  onOpen,
}: {
  stage: Stage;
  tasks: TaskWithRefs[];
  today: string;
  actionsFor: (task: TaskWithRefs) => MenuItem[];
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { stageId: stage.id } });
  return (
    <section
      className={`column ${isOver ? 'column-over' : ''}`}
      ref={setNodeRef}
      aria-label={stage.name}
      // Цвет стадии подсвечивает заголовок колонки: доска читается издалека, не только по точке.
      style={stage.color ? ({ '--stage': stage.color } as React.CSSProperties) : undefined}
    >
      <div className="column-head">
        {stage.color ? <span className="stage-dot" aria-hidden="true" /> : null}
        <span>{stage.name}</span>
        <span className="badge">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map((t) => (
          <SortableTaskCard
            key={t.id}
            task={t}
            today={today}
            actions={actionsFor(t)}
            onOpen={onOpen}
          />
        ))}
      </SortableContext>
      {tasks.length === 0 ? <div className="column-empty">Пусто</div> : null}
    </section>
  );
}
