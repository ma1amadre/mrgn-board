import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useProfile } from '../../app/auth/authContext';
import { useBoardViewMutations, useBoardViews } from '../../shared/api/boardViews';
import { IconClose } from '../../shared/ui/icons';
import { useToast } from '../../shared/ui/toastContext';

/** Сохранённые виды доски: применить, удалить, сохранить текущий набор фильтров под именем. */
export function BoardViews({
  current,
  canSave,
  onApply,
}: {
  /** Текущие фильтры строкой запроса (без task/new). */
  current: string;
  /** Есть что сохранять — хоть один фильтр выбран. */
  canSave: boolean;
  onApply: (query: string) => void;
}) {
  const me = useProfile();
  const toast = useToast();
  const views = useBoardViews();
  const { create, remove } = useBoardViewMutations();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const list = views.data ?? [];
  const activeView = list.find((v) => v.query === current);

  const save = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    create.mutate(
      { profile_id: me.id, name: trimmed, query: current },
      {
        onSuccess: () => {
          setName('');
          setSaving(false);
        },
        onError: (err) => toast.error(err),
      },
    );
  };

  return (
    <div ref={ref} className="menu views">
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {activeView ? `Вид: ${activeView.name}` : 'Виды'}
      </button>
      {open ? (
        <div className="popover views-popover" role="menu" aria-label="Сохранённые виды">
          {list.length === 0 ? (
            <p className="muted small views-empty">
              Выберите фильтры и сохраните их как вид: он будет здесь.
            </p>
          ) : null}
          {list.map((v) => (
            <div key={v.id} className="views-row">
              <button
                type="button"
                role="menuitem"
                className={v.id === activeView?.id ? 'popover-item is-active' : 'popover-item'}
                onClick={() => {
                  setOpen(false);
                  onApply(v.query);
                }}
              >
                {v.name}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-icon"
                aria-label={`Удалить вид «${v.name}»`}
                onClick={() => remove.mutate(v.id, { onError: (err) => toast.error(err) })}
              >
                <IconClose size={14} />
              </button>
            </div>
          ))}
          {canSave && !activeView ? (
            saving ? (
              <form className="row views-save" onSubmit={save}>
                <input
                  className="input"
                  autoFocus
                  maxLength={60}
                  placeholder="Название вида"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={create.isPending || !name.trim()}
                >
                  Сохранить
                </button>
              </form>
            ) : (
              <button
                type="button"
                role="menuitem"
                className="popover-item views-save-btn"
                onClick={() => setSaving(true)}
              >
                Сохранить текущий вид…
              </button>
            )
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
