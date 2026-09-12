import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';
import { keys } from '../../shared/api/keys';
import { fetchTasks, renumberStage, useMoveTask } from '../../shared/api/tasks';
import type { Stage, TaskWithRefs } from '../../shared/api/types';
import { computePosition, needsRenumber, neighborPositions } from '../../shared/lib/ordering';
import { groupByStage, sortByPosition } from '../../shared/lib/tasks';
import { useToast } from '../../shared/ui/toastContext';
import { KanbanColumn } from './KanbanColumn';
import { TaskCardView } from './TaskCard';
import { useTaskQuickActions } from './useTaskQuickActions';

type Columns = Record<string, string[]>;

/** Локальная копия колонок на время перетаскивания; base — кеш, от которого она отделилась. */
type LocalColumns = { cols: Columns; base: Columns };

function deriveColumns(tasks: TaskWithRefs[], stages: Stage[]): Columns {
  const grouped = groupByStage(
    tasks,
    stages.map((s) => s.id),
  );
  const out: Columns = {};
  for (const [stageId, list] of grouped) out[stageId] = list.map((t) => t.id);
  return out;
}

function findColumn(id: string, cols: Columns): string | undefined {
  if (id in cols) return id;
  return Object.keys(cols).find((stageId) => cols[stageId]?.includes(id));
}

export function KanbanBoard({
  stages,
  tasks,
  allTasks,
  today,
  onOpen,
}: {
  stages: Stage[];
  /** Видимые (отфильтрованные) задачи — из них строятся колонки. */
  tasks: TaskWithRefs[];
  /** Все задачи — по ним считается position, чтобы не встать поверх скрытой карточки. */
  allTasks: TaskWithRefs[];
  today: string;
  onOpen: (id: string) => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const move = useMoveTask();

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks]);
  const derived = useMemo(() => deriveColumns(tasks, stages), [tasks, stages]);

  const [local, setLocal] = useState<LocalColumns | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // onDragOver уже поставил карточку на место при переходе между колонками —
  // тогда в onDragEnd arrayMove не нужен, иначе она уедет на позицию ниже.
  const movedAcross = useRef(false);
  // Кеш обновился после переноса — локальная копия своё отработала. Во время drag не трогаем.
  if (local !== null && activeId === null && local.base !== derived) setLocal(null);
  const columns = local?.cols ?? derived;

  const sensors = useSensors(
    // Мышь: порог 5px, чтобы клик открывал карточку, а не начинал drag.
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    // Палец: удержание 250 мс — иначе прокрутка доски по карточкам превращалась бы в перенос.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragStart = (e: DragStartEvent) => {
    movedAcross.current = false;
    setActiveId(String(e.active.id));
    setLocal({ cols: derived, base: derived });
  };

  const onDragOver = (e: DragOverEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeKey = String(active.id);
    const overKey = String(over.id);
    setLocal((prev) => {
      const cols = prev?.cols ?? derived;
      const from = findColumn(activeKey, cols);
      const to = findColumn(overKey, cols);
      if (!from || !to || from === to) return prev;
      movedAcross.current = true;
      const fromList = (cols[from] ?? []).filter((id) => id !== activeKey);
      const toList = [...(cols[to] ?? [])];
      const overIndex = toList.indexOf(overKey);
      const insertAt = overIndex >= 0 ? overIndex : toList.length;
      toList.splice(insertAt, 0, activeKey);
      return { cols: { ...cols, [from]: fromList, [to]: toList }, base: derived };
    });
  };

  const onDragCancel = () => {
    setActiveId(null);
    setLocal(null);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    const activeKey = String(active.id);
    const task = taskById.get(activeKey);
    const stageId = over ? findColumn(activeKey, columns) : undefined;
    if (!over || !task || !stageId) {
      onDragCancel();
      return;
    }
    const overKey = String(over.id);
    let list = [...(columns[stageId] ?? [])];
    const fromIndex = list.indexOf(activeKey);
    const overIndex = list.indexOf(overKey);
    if (!movedAcross.current && fromIndex >= 0 && overIndex >= 0 && fromIndex !== overIndex) {
      list = arrayMove(list, fromIndex, overIndex);
    }
    const index = list.indexOf(activeKey);
    const prevId = list[index - 1];
    const nextId = list[index + 1];

    const columnOf = (source: TaskWithRefs[]) =>
      sortByPosition(source.filter((t) => t.stage_id === stageId && t.id !== activeKey));
    let { prev, next } = neighborPositions(columnOf(allTasks), prevId, nextId);
    try {
      if (needsRenumber(prev, next)) {
        await renumberStage(stageId);
        const fresh = await qc.fetchQuery({ queryKey: keys.tasks.all, queryFn: fetchTasks });
        ({ prev, next } = neighborPositions(columnOf(fresh), prevId, nextId));
      }
    } catch (err) {
      toast.error(err);
      onDragCancel();
      return;
    }

    const position = computePosition(prev, next);
    setLocal({ cols: { ...columns, [stageId]: list }, base: derived });
    setActiveId(null);
    if (stageId !== task.stage_id || position !== task.position) {
      move.mutate(
        { id: activeKey, stage_id: stageId, position },
        { onError: (err) => toast.error(err) },
      );
    }
  };

  const actionsFor = useTaskQuickActions(stages, allTasks, today);

  const activeTask = activeId ? taskById.get(activeId) : undefined;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={(e) => void onDragEnd(e)}
      onDragCancel={onDragCancel}
    >
      <div className="board">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            tasks={(columns[stage.id] ?? [])
              .map((id) => taskById.get(id))
              .filter((t): t is TaskWithRefs => t !== undefined)}
            today={today}
            actionsFor={actionsFor}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <TaskCardView task={activeTask} today={today} className="task-overlay" />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
