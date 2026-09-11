import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Stage, TaskWithRefs } from '../../shared/api/types';
import { SortableTaskCard } from './TaskCard';

export function KanbanColumn({
  stage,
  tasks,
  today,
  onOpen,
}: {
  stage: Stage;
  tasks: TaskWithRefs[];
  today: string;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id, data: { stageId: stage.id } });
  return (
    <section
      className={`column ${isOver ? 'column-over' : ''}`}
      ref={setNodeRef}
      aria-label={stage.name}
    >
      <div className="column-head">
        {stage.color ? (
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: stage.color,
              flex: '0 0 auto',
            }}
          />
        ) : null}
        <span>{stage.name}</span>
        <span className="badge">{tasks.length}</span>
      </div>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map((t) => (
          <SortableTaskCard key={t.id} task={t} today={today} onOpen={onOpen} />
        ))}
      </SortableContext>
      {tasks.length === 0 ? <div className="column-empty">Пусто</div> : null}
    </section>
  );
}
