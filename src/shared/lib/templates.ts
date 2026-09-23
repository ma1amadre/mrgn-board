import type { Priority } from './labels';

export type TemplateLike = {
  title: string;
  description: string | null;
  priority: Priority;
  labels: string[];
  checklist: string[];
};

export type TaskFormLike = {
  title: string;
  description: string;
  stage_id: string;
  assignee_ids: string[];
  client_id: string | null;
  priority: Priority;
  due_date: string | null;
  labels: string[];
};

/** Заготовка формы из шаблона: стадия, клиент и исполнитель — из контекста, а не из шаблона. */
export function templateToForm(
  t: TemplateLike,
  ctx: { stage_id: string; client_id: string | null },
): TaskFormLike {
  return {
    title: t.title,
    description: t.description ?? '',
    stage_id: ctx.stage_id,
    assignee_ids: [],
    client_id: ctx.client_id,
    priority: t.priority,
    due_date: null,
    labels: [...t.labels],
  };
}

/** Шаблон из задачи: пункты чек-листа — по порядку добавления, только текст. */
export function taskToTemplate(
  task: {
    title: string;
    description: string | null;
    priority: Priority;
    labels: string[];
    checklist: { title: string; created_at: string }[];
  },
  name: string,
): TemplateLike & { name: string } {
  return {
    name: name.trim(),
    title: task.title,
    description: task.description,
    priority: task.priority,
    labels: [...task.labels],
    checklist: [...task.checklist]
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .map((i) => i.title),
  };
}
