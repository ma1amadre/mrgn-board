import { useState, type FormEvent } from 'react';
import { useProfile } from '../../app/auth/authContext';
import { useChecklistMutations } from '../../shared/api/checklist';
import type { ChecklistItem } from '../../shared/api/types';
import { useToast } from '../../shared/ui/toastContext';

export function Checklist({ taskId, items }: { taskId: string; items: ChecklistItem[] }) {
  const me = useProfile();
  const toast = useToast();
  const { add, toggle, remove } = useChecklistMutations(taskId);
  const [title, setTitle] = useState('');

  const sorted = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at));
  const done = sorted.filter((i) => i.is_done).length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = title.trim();
    if (!text) return;
    add.mutate(
      { task_id: taskId, created_by: me.id, title: text },
      { onSuccess: () => setTitle(''), onError: (err) => toast.error(err) },
    );
  };

  return (
    <section className="stack">
      {sorted.length > 0 ? (
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={sorted.length}
          aria-valuenow={done}
        >
          <div className="progress-bar" style={{ width: `${(done / sorted.length) * 100}%` }} />
        </div>
      ) : null}
      {sorted.length > 0 ? (
        <ul className="checklist">
          {sorted.map((item) => (
            <li
              key={item.id}
              className={item.is_done ? 'checklist-item is-done' : 'checklist-item'}
            >
              <label className="checklist-label">
                <input
                  type="checkbox"
                  checked={item.is_done}
                  onChange={(e) =>
                    toggle.mutate(
                      { id: item.id, isDone: e.target.checked },
                      { onError: (err) => toast.error(err) },
                    )
                  }
                />
                <span>{item.title}</span>
              </label>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                aria-label={`Удалить пункт «${item.title}»`}
                onClick={() => remove.mutate(item.id, { onError: (err) => toast.error(err) })}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form className="row" onSubmit={submit}>
        <input
          className="input"
          placeholder="Добавить пункт…"
          maxLength={300}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          type="submit"
          className="btn btn-secondary btn-sm"
          disabled={add.isPending || !title.trim()}
        >
          Добавить
        </button>
      </form>
    </section>
  );
}
