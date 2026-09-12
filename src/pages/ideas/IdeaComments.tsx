import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent } from 'react';
import { useAuth, useProfile } from '../../app/auth/authContext';
import { useIdeaCommentMutations, useIdeaComments } from '../../shared/api/ideaComments';
import { keys } from '../../shared/api/keys';
import { useProfiles } from '../../shared/api/profiles';
import type { IdeaCommentWithAuthor } from '../../shared/api/types';
import { formatDateTime } from '../../shared/lib/dates';
import { Avatar } from '../../shared/ui/Avatar';
import { Markdown } from '../../shared/ui/Markdown';
import { MentionTextarea } from '../../shared/ui/MentionTextarea';
import { useToast } from '../../shared/ui/toastContext';
import { useUndoable } from '../../shared/ui/useUndoable';

/** Обсуждение под идеей: то же, что комментарии к задаче, но своя таблица и свой получатель. */
export function IdeaComments({ ideaId }: { ideaId: string }) {
  const me = useProfile();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const undoable = useUndoable();
  const comments = useIdeaComments(ideaId, true);
  const profiles = useProfiles();
  const { add, remove } = useIdeaCommentMutations(ideaId);
  const [body, setBody] = useState('');

  const names = useMemo(() => (profiles.data ?? []).map((p) => p.name), [profiles.data]);
  const mentionable = useMemo(
    () => (profiles.data ?? []).filter((p) => p.is_active && p.id !== me.id),
    [profiles.data, me.id],
  );

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    add.mutate(
      { idea_id: ideaId, author_id: me.id, body: text },
      { onSuccess: () => setBody(''), onError: (err) => toast.error(err) },
    );
  };

  const del = (id: string) => {
    const key = keys.ideaComments.byIdea(ideaId);
    qc.setQueryData<IdeaCommentWithAuthor[]>(key, (xs) => xs?.filter((c) => c.id !== id));
    undoable('Комментарий удалён', {
      commit: () => remove.mutate(id, { onError: (err) => toast.error(err) }),
      undo: () => void qc.invalidateQueries({ queryKey: key }),
    });
  };

  return (
    <div className="stack idea-discussion">
      {comments.isPending ? <p className="muted small">Загрузка…</p> : null}
      {comments.data?.length === 0 ? <p className="muted small">Пока никто не написал.</p> : null}
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
          placeholder="Написать в обсуждение… @имя — упомянуть"
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
    </div>
  );
}
