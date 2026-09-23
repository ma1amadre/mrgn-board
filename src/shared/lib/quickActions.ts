import { addDays } from './dates';
import { GAP } from './ordering';

export type QuickStage = {
  id: string;
  name: string;
  position: number;
  is_terminal: boolean;
  created_at: string;
};

export type QuickTask = {
  id: string;
  stage_id: string;
  assignee_ids: string[];
  due_date: string | null;
};

/** Патч задачи для быстрого действия; stage_id всегда идёт вместе с position.
 *  assign/unassign — добавить или снять одного исполнителя (task_assignees), не патч колонки. */
export type QuickPatch = {
  stage_id?: string;
  position?: number;
  assign?: string;
  unassign?: string;
  due_date?: string | null;
};

export type QuickAction = { key: string; label: string; patch: QuickPatch };

export function sortStages<T extends Pick<QuickStage, 'position' | 'created_at'>>(
  stages: T[],
): T[] {
  return [...stages].sort(
    (a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at),
  );
}

export function nextStage(stages: QuickStage[], currentId: string): QuickStage | undefined {
  const sorted = sortStages(stages);
  const i = sorted.findIndex((s) => s.id === currentId);
  return i >= 0 ? sorted[i + 1] : undefined;
}

/** Первая терминальная стадия — туда уходит «Закрыть». */
export function terminalStage(stages: QuickStage[]): QuickStage | undefined {
  return sortStages(stages).find((s) => s.is_terminal);
}

/** Первая открытая стадия — туда возвращается закрытая задача. */
export function firstOpenStage(stages: QuickStage[]): QuickStage | undefined {
  return sortStages(stages).find((s) => !s.is_terminal);
}

/** В конец колонки: за последней карточкой, включая скрытые фильтром. */
export function endPosition(
  tasks: ReadonlyArray<{ stage_id: string; position: number }>,
  stageId: string,
): number {
  let max = 0;
  for (const t of tasks) if (t.stage_id === stageId && t.position > max) max = t.position;
  return max + GAP;
}

/**
 * Действия из меню «⋯» на карточке. Только то, ради чего иначе пришлось бы открывать задачу
 * и форму: взять себе, следующая стадия, закрыть/вернуть, быстрый срок.
 */
export function quickActions(
  task: QuickTask,
  ctx: {
    stages: QuickStage[];
    tasks: ReadonlyArray<{ stage_id: string; position: number }>;
    meId: string;
    today: string;
  },
): QuickAction[] {
  const out: QuickAction[] = [];
  const current = ctx.stages.find((s) => s.id === task.stage_id);

  if (task.assignee_ids.includes(ctx.meId)) {
    out.push({ key: 'unassign', label: 'Снять с себя', patch: { unassign: ctx.meId } });
  } else {
    out.push({ key: 'assign_me', label: 'Взять себе', patch: { assign: ctx.meId } });
  }

  const toStage = (s: QuickStage): QuickPatch => ({
    stage_id: s.id,
    position: endPosition(ctx.tasks, s.id),
  });
  const next = nextStage(ctx.stages, task.stage_id);
  if (next) out.push({ key: 'next_stage', label: `Дальше: ${next.name}`, patch: toStage(next) });
  const done = terminalStage(ctx.stages);
  if (current && !current.is_terminal && done && done.id !== next?.id) {
    out.push({ key: 'close', label: `Закрыть: ${done.name}`, patch: toStage(done) });
  }
  if (current?.is_terminal) {
    const open = firstOpenStage(ctx.stages);
    if (open) out.push({ key: 'reopen', label: `Вернуть: ${open.name}`, patch: toStage(open) });
  }

  const tomorrow = addDays(ctx.today, 1);
  const week = addDays(ctx.today, 7);
  if (task.due_date !== tomorrow) {
    out.push({ key: 'due_tomorrow', label: 'Срок: завтра', patch: { due_date: tomorrow } });
  }
  if (task.due_date !== week) {
    out.push({ key: 'due_week', label: 'Срок: через неделю', patch: { due_date: week } });
  }
  if (task.due_date !== null) {
    out.push({ key: 'due_clear', label: 'Убрать срок', patch: { due_date: null } });
  }
  return out;
}
