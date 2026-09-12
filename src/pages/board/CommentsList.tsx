import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { useAuth, useProfile } from '../../app/auth/authContext';
import { useCommentMutations, useComments } from '../../shared/api/comments';
import { keys } from '../../shared/api/keys';
import { useProfiles } from '../../shared/api/profiles';
import type { CommentWithAuthor } from '../../shared/api/types';
import { formatDateTime } from '../../shared/lib/dates';
import { Avatar } from '../../shared/ui/Avatar';
import { Markdown } from '../../shared/ui/Markdown';
import { MentionTextarea } from '../../shared/ui/MentionTextarea';
import { useToast } from '../../shared/ui/toastContext';
import { useUndoable } from '../../shared/ui/useUndoable';

export function CommentsList({ taskId }: { taskId: string }) {
  const me = useProfile();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const undoable = useUndoable();
  const comments = useComments(taskId);
  const profiles = useProfiles();
  const names = useMemo(() => (profiles.data ?? []).map((p) => p.name), [profiles.data]);
  // Себя упоминать незачем; выключенных — тоже, уведомление им всё равно не уйдёт.
  const mentionable = useMemo(
    () => (profiles.data ?? []).filter((p) => p.is_active && p.id !== me.id),
    [profiles.data, me.id],
  );
  const { add, remove } = useCommentMutations(taskId);
  const [body, setBody] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    add.mutate(
      { task_id: taskId, author_id: me.id, body: text },
      { onSuccess: () => setBody(''), onError: (err) => toast.error(err) },
    );
  };

  // Комментарий пропадает сразу, запрос уходит через 5 секунд — есть время нажать «Отменить».
  const del = (id: string) => {
    const key = keys.comments.byTask(taskId);
    qc.setQueryData<CommentWithAuthor[]>(key, (xs) => xs?.filter((c) => c.id !== id));
    undoable('Комментарий удалён', {
      commit: () => remove.mutate(id, { onError: (err) => toast.error(err) }),
      undo: () => void qc.invalidateQueries({ queryKey: key }),
    });
  };

  return (
    <section className="stack">
      <h3>Комментарии</h3>
      {comments.isPending ? <p className="muted small">Загрузка…</p> : null}
      {comments.data?.length === 0 ? <p className="muted small">Пока пусто.</p> : null}
      {comments.data?.map((c) => (
        <div key={c.id} className="comment">
          <div className="comment-meta">
            {c.author ? <Avatar name={c.author.name} color={c.author.color} /> : null}
            <span>{c.author?.name ?? 'Удалённый пользователь'}</span>
            <span>·</span>
            <span>{formatDateTime(c.created_at)}</span>
            {isAdmin || c.author_id === me.id ? (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginLeft: 'auto' }}
                onClick={() => del(c.id)}
              >
                Удалить
              </button>
            ) : null}
          </div>
          <Markdown text={c.body} mentions={names} />
        </div>
      ))}
      <form className="stack" onSubmit={submit}>
        <MentionTextarea
          value={body}
          onChange={setBody}
          profiles={mentionable}
          placeholder="Написать комментарий… @имя — упомянуть"
        />
        <div className="row">
          <button
            type="submit"
            className="btn btn-secondary btn-sm"
            disabled={add.isPending || !body.trim()}
          >
            Отправить
          </button>
        </div>
      </form>
    </section>
  );
}
