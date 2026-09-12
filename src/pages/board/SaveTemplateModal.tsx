import { useState, type FormEvent } from 'react';
import { useProfile } from '../../app/auth/authContext';
import { useTemplateMutations } from '../../shared/api/templates';
import type { TaskWithRefs } from '../../shared/api/types';
import { taskToTemplate } from '../../shared/lib/templates';
import { Field } from '../../shared/ui/Field';
import { Modal } from '../../shared/ui/Modal';
import { useToast } from '../../shared/ui/toastContext';

/** Сохранить задачу как шаблон: одно поле — имя, остальное берётся из задачи. */
export function SaveTemplateModal({ task, onClose }: { task: TaskWithRefs; onClose: () => void }) {
  const me = useProfile();
  const toast = useToast();
  const { create } = useTemplateMutations();
  const [name, setName] = useState(task.title);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    create.mutate(
      { ...taskToTemplate(task, name), created_by: me.id },
      {
        onSuccess: () => {
          toast.show('Шаблон сохранён', 'success');
          onClose();
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  return (
    <Modal title="Сохранить как шаблон" onClose={onClose} dirty={name.trim() !== task.title}>
      <form className="form" onSubmit={submit}>
        <Field
          label="Название шаблона"
          hint={`В шаблон войдут название, описание, приоритет, метки и ${task.checklist.length} п. чек-листа.`}
        >
          <input
            className="input"
            required
            autoFocus
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="btn btn-primary" disabled={create.isPending}>
            Сохранить
          </button>
        </div>
      </form>
    </Modal>
  );
}
