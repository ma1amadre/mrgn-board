import { useState } from 'react';
import type { ProfileRef } from '../api/types';
import { formatDateTime } from '../lib/dates';
import { Avatar } from './Avatar';
import { Markdown } from './Markdown';
import { MentionTextarea } from './MentionTextarea';

export type CommentLike = {
  id: string;
  author_id: string;
  author: ProfileRef | null;
  body: string;
  created_at: string;
  updated_at: string;
};

/** Комментарий к задаче или идее: просмотр, правка на месте автором, удаление. */
export function CommentItem({
  comment,
  names,
  mentionable,
  canEdit,
  canDelete,
  onSave,
  onDelete,
}: {
  comment: CommentLike;
  names: readonly string[];
  mentionable: readonly ProfileRef[];
  canEdit: boolean;
  canDelete: boolean;
  /** true — сохранено; false — ошибка уже показана, форма остаётся открытой. */
  onSave: (body: string) => Promise<boolean>;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [saving, setSaving] = useState(false);
  // updated_at ставит триггер при любом UPDATE; секунда запаса на разницу часов вставки и триггера.
  const edited =
    new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime() > 1000;

  const startEdit = () => {
    setDraft(comment.body);
    setEditing(true);
  };

  const save = async () => {
    const text = draft.trim();
    if (!text || text === comment.body) {
      setEditing(false);
      return;
    }
    setSaving(true);
    const ok = await onSave(text);
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <div className="comment">
      <div className="comment-meta">
        {comment.author ? <Avatar name={comment.author.name} color={comment.author.color} /> : null}
        <span>{comment.author?.name ?? 'Удалённый пользователь'}</span>
        <span>·</span>
        <span>{formatDateTime(comment.created_at)}</span>
        {edited ? (
          <span title={`Изменён ${formatDateTime(comment.updated_at)}`}>· изменён</span>
        ) : null}
        <span className="row" style={{ marginLeft: 'auto', gap: 0 }}>
          {canEdit && !editing ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={startEdit}>
              Изменить
            </button>
          ) : null}
          {canDelete && !editing ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onDelete}>
              Удалить
            </button>
          ) : null}
        </span>
      </div>
      {editing ? (
        <div className="stack">
          <MentionTextarea value={draft} onChange={setDraft} profiles={mentionable} />
          <div className="row">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void save()}
              disabled={saving || !draft.trim()}
            >
              Сохранить
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setEditing(false)}
              disabled={saving}
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <Markdown text={comment.body} mentions={names} />
      )}
    </div>
  );
}
