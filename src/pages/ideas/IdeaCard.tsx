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
import { Markdown } from '../../shared/ui/Markdown';
import { Menu } from '../../shared/ui/Menu';
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
        {/* Статус один раз: бейдж и есть переключатель, отдельный селект в футере не нужен. */}
        <Menu
          label={`Статус: ${IDEA_STATUS_LABEL[idea.status]}`}
          triggerClassName={`${IDEA_STATUS_BADGE[idea.status]} badge-button`}
          trigger={<>{IDEA_STATUS_LABEL[idea.status]} ▾</>}
          items={IDEA_STATUSES.filter((s) => s !== idea.status).map((s) => ({
            key: s,
            label: IDEA_STATUS_LABEL[s],
            onSelect: () => onStatus(s),
          }))}
        />
        {idea.author_id === myId || canDelete ? (
          <Menu
            label={`Действия: ${idea.title}`}
            items={[
              ...(idea.author_id === myId
                ? [{ key: 'edit', label: 'Изменить', onSelect: () => setEditing(true) }]
                : []),
              ...(canDelete ? [{ key: 'delete', label: 'Удалить…', onSelect: onDelete }] : []),
            ]}
          />
        ) : null}
      </div>
      {idea.body ? (
        <div className="card-body">
          <Markdown text={idea.body} />
        </div>
      ) : null}
      <div className="row small muted">
        {idea.author ? <Avatar name={idea.author.name} color={idea.author.color} /> : null}
        <span>{idea.author?.name ?? 'Удалённый пользователь'}</span>
        <span>· {formatDate(idea.created_at)}</span>
      </div>
      <div className="card-footer">
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
      </div>
      {discussion ? <IdeaComments ideaId={idea.id} /> : null}
    </article>
  );
}
