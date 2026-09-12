import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { IdeaWithRefs } from '../../shared/api/types';
import { formatDate } from '../../shared/lib/dates';
import {
  IDEA_STATUSES,
  IDEA_STATUS_BADGE,
  IDEA_STATUS_LABEL,
  type IdeaStatus,
} from '../../shared/lib/labels';
import { Avatar } from '../../shared/ui/Avatar';
import { Linkify } from '../../shared/ui/Linkify';
import { IdeaComments } from './IdeaComments';
import { IdeaForm, type IdeaFormValues } from './IdeaForm';

export function IdeaCard({
  idea,
  myId,
  canDelete,
  busy,
  onVote,
  onStatus,
  onEdit,
  onDelete,
  initialDiscussionOpen = false,
  onConvert,
}: {
  idea: IdeaWithRefs;
  myId: string;
  canDelete: boolean;
  busy: boolean;
  onVote: (hasVote: boolean) => void;
  onStatus: (status: IdeaStatus) => void;
  /** true — сохранено, форму можно закрыть; false — ошибка уже показана, текст остаётся. */
  onEdit: (values: IdeaFormValues) => Promise<boolean>;
  onDelete: () => void;
  onConvert: () => void;
  /** Пришли по ссылке на эту идею — обсуждение сразу развёрнуто. */
  initialDiscussionOpen?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [discussion, setDiscussion] = useState(initialDiscussionOpen);
  const commentsCount = idea.idea_comments.length;
  const hasVote = idea.idea_votes.some((v) => v.profile_id === myId);
  const votes = idea.idea_votes.length;
  const task = idea.tasks[0];

  if (editing) {
    return (
      <div className="card">
        <IdeaForm
          initial={{ title: idea.title, body: idea.body ?? '' }}
          submitLabel="Сохранить"
          busy={busy}
          onSubmit={(values) =>
            void onEdit(values).then((saved) => {
              if (saved) setEditing(false);
            })
          }
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <article className="card" id={`idea-${idea.id}`}>
      <div className="row">
        <button
          type="button"
          className={hasVote ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm'}
          onClick={() => onVote(hasVote)}
          disabled={busy}
          aria-pressed={hasVote}
          title={hasVote ? 'Убрать голос' : 'Поддержать'}
        >
          ▲ {votes}
        </button>
        <h3 className="card-title grow">{idea.title}</h3>
        <span className={IDEA_STATUS_BADGE[idea.status]}>{IDEA_STATUS_LABEL[idea.status]}</span>
      </div>
      {idea.body ? (
        <p className="card-body prewrap">
          <Linkify text={idea.body} />
        </p>
      ) : null}
      <div className="row small muted">
        {idea.author ? <Avatar name={idea.author.name} color={idea.author.color} /> : null}
        <span>{idea.author?.name ?? 'Удалённый пользователь'}</span>
        <span>· {formatDate(idea.created_at)}</span>
      </div>
      <div className="card-footer">
        <select
          className="select"
          style={{ width: 'auto', height: 28, fontSize: 12 }}
          value={idea.status}
          aria-label="Статус идеи"
          disabled={busy}
          onChange={(e) => onStatus(e.target.value as IdeaStatus)}
        >
          {IDEA_STATUSES.map((s) => (
            <option key={s} value={s}>
              {IDEA_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          aria-expanded={discussion}
          onClick={() => setDiscussion((v) => !v)}
        >
          💬 {commentsCount > 0 ? `Обсуждение (${commentsCount})` : 'Обсудить'}
        </button>
        {task ? (
          <Link className="btn btn-ghost btn-sm" to={`/board?task=${task.id}`}>
            Открыть задачу
          </Link>
        ) : (
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onConvert}
            disabled={busy}
          >
            В задачу
          </button>
        )}
        {idea.author_id === myId ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(true)}>
            Изменить
          </button>
        ) : null}
        {canDelete ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onDelete} disabled={busy}>
            Удалить
          </button>
        ) : null}
      </div>
      {discussion ? <IdeaComments ideaId={idea.id} /> : null}
    </article>
  );
}
