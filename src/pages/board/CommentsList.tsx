import { useState, type FormEvent } from 'react';
import { useAuth, useProfile } from '../../app/auth/authContext';
import { useCommentMutations, useComments } from '../../shared/api/comments';
import { formatDateTime } from '../../shared/lib/dates';
import { Avatar } from '../../shared/ui/Avatar';
import { useToast } from '../../shared/ui/toastContext';

export function CommentsList({ taskId }: { taskId: string }) {
  const me = useProfile();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const comments = useComments(taskId);
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
                onClick={() => remove.mutate(c.id, { onError: (err) => toast.error(err) })}
              >
                Удалить
              </button>
            ) : null}
          </div>
          <div className="prewrap">{c.body}</div>
        </div>
      ))}
      <form className="stack" onSubmit={submit}>
        <textarea
          className="textarea"
          placeholder="Написать комментарий…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
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
