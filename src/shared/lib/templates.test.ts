import { describe, expect, it } from 'vitest';
import { taskToTemplate, templateToForm } from './templates';

describe('templateToForm', () => {
  it('берёт поля шаблона, контекст — из аргумента, срок и исполнитель пустые', () => {
    const form = templateToForm(
      {
        title: 'Подключить CDN',
        description: null,
        priority: 'high',
        labels: ['cdn'],
        checklist: [],
      },
      { stage_id: 's1', client_id: 'c1' },
    );
    expect(form).toEqual({
      title: 'Подключить CDN',
      description: '',
      stage_id: 's1',
      assignee_ids: [],
      client_id: 'c1',
      priority: 'high',
      due_date: null,
      labels: ['cdn'],
    });
  });
});

describe('taskToTemplate', () => {
  it('чек-лист по порядку создания, имя обрезано', () => {
    const t = taskToTemplate(
      {
        title: 'T',
        description: 'D',
        priority: 'normal',
        labels: ['a'],
        checklist: [
          { title: 'второй', created_at: '2026-09-02' },
          { title: 'первый', created_at: '2026-09-01' },
        ],
      },
      '  Шаблон  ',
    );
    expect(t.name).toBe('Шаблон');
    expect(t.checklist).toEqual(['первый', 'второй']);
    expect(t.labels).toEqual(['a']);
  });
});
