import { useState, type FormEvent } from 'react';
import { useStageMutations, useStages } from '../../shared/api/stages';
import type { Stage } from '../../shared/api/types';
import { EmptyState } from '../../shared/ui/EmptyState';
import { PageHead } from '../../shared/ui/PageHead';
import { useToast } from '../../shared/ui/toastContext';

const HEX = /^#[0-9a-fA-F]{6}$/;

function StageRow({
  stage,
  isFirst,
  isLast,
  busy,
  onSave,
  onMove,
  onDelete,
}: {
  stage: Stage;
  isFirst: boolean;
  isLast: boolean;
  busy: boolean;
  onSave: (patch: { name: string; color: string | null; is_terminal: boolean }) => void;
  onMove: (dir: -1 | 1) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState(stage.name);
  const [color, setColor] = useState(stage.color ?? '');
  const [terminal, setTerminal] = useState(stage.is_terminal);
  const colorValid = color === '' || HEX.test(color);
  const dirty =
    name.trim() !== stage.name || (color || null) !== stage.color || terminal !== stage.is_terminal;

  return (
    <tr>
      <td>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => onMove(-1)}
            disabled={busy || isFirst}
            aria-label="Выше"
          >
            ↑
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={() => onMove(1)}
            disabled={busy || isLast}
            aria-label="Ниже"
          >
            ↓
          </button>
        </div>
      </td>
      <td>
        <input
          className="input"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
      </td>
      <td>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <span
            aria-hidden="true"
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              flex: '0 0 auto',
              background: colorValid && color ? color : 'var(--n-300)',
            }}
          />
          <input
            className="input"
            style={{ width: 110 }}
            placeholder="#1b5fa6"
            value={color}
            aria-invalid={!colorValid}
            onChange={(e) => setColor(e.target.value.trim())}
          />
        </div>
      </td>
      <td>
        <label className="check">
          <input
            type="checkbox"
            checked={terminal}
            onChange={(e) => setTerminal(e.target.checked)}
          />
          <span className="check-box" />
          закрывает задачу
        </label>
      </td>
      <td>
        <div className="row" style={{ flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={busy || !dirty || !colorValid || !name.trim()}
            onClick={() =>
              onSave({ name: name.trim(), color: color || null, is_terminal: terminal })
            }
          >
            Сохранить
          </button>
          <button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={onDelete}>
            Удалить
          </button>
        </div>
      </td>
    </tr>
  );
}

export function StagesPage() {
  const toast = useToast();
  const stages = useStages();
  const { create, update, remove } = useStageMutations();
  const [newName, setNewName] = useState('');
  const busy = create.isPending || update.isPending || remove.isPending;
  const list = stages.data ?? [];

  const onError = (err: unknown) => {
    const code = (err as { code?: string } | null)?.code;
    if (code === '23503') toast.show('Сначала перенесите задачи из этой стадии', 'error');
    else toast.error(err);
  };

  const add = (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const position = list.reduce((m, s) => Math.max(m, s.position), 0) + 1000;
    create.mutate({ name, position }, { onSuccess: () => setNewName(''), onError });
  };

  // Меняем местами position соседей — порядок остаётся целочисленным с шагом 1000.
  const move = async (index: number, dir: -1 | 1) => {
    const a = list[index];
    const b = list[index + dir];
    if (!a || !b) return;
    try {
      await update.mutateAsync({ id: a.id, patch: { position: b.position } });
      await update.mutateAsync({ id: b.id, patch: { position: a.position } });
    } catch (err) {
      onError(err);
    }
  };

  return (
    <>
      <PageHead title="Стадии доски" />
      <p className="muted">
        Порядок стадий — порядок колонок на доске. Стадия с пометкой «закрывает задачу» проставляет
        дату закрытия; такие задачи не считаются просроченными.
      </p>
      {stages.isPending ? <EmptyState>Загрузка…</EmptyState> : null}
      {stages.data ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 80 }}>Порядок</th>
                <th>Название</th>
                <th>Цвет</th>
                <th>Тип</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((s, i) => (
                <StageRow
                  key={s.id}
                  stage={s}
                  isFirst={i === 0}
                  isLast={i === list.length - 1}
                  busy={busy}
                  onSave={(patch) => update.mutate({ id: s.id, patch }, { onError })}
                  onMove={(dir) => void move(i, dir)}
                  onDelete={() => {
                    if (!window.confirm(`Удалить стадию «${s.name}»?`)) return;
                    remove.mutate(s.id, { onError });
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      <form className="row" onSubmit={add}>
        <input
          className="input"
          style={{ width: 260 }}
          placeholder="Новая стадия"
          maxLength={60}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={busy || !newName.trim()}>
          Добавить
        </button>
      </form>
    </>
  );
}
