import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useProfile } from '../../app/auth/authContext';
import { useIdeaMutations, useIdeas } from '../../shared/api/ideas';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Modal } from '../../shared/ui/Modal';
import { PageHead } from '../../shared/ui/PageHead';
import { useToast } from '../../shared/ui/toastContext';
import { IdeaCard } from './IdeaCard';
import { IdeaForm, type IdeaFormValues } from './IdeaForm';

export function IdeasPage() {
  const me = useProfile();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const ideas = useIdeas();
  const { create, update, remove, vote, convert } = useIdeaMutations();
  const [creating, setCreating] = useState(false);

  // Сначала самые поддержанные, внутри — новые.
  const sorted = useMemo(
    () =>
      [...(ideas.data ?? [])].sort(
        (a, b) =>
          b.idea_votes.length - a.idea_votes.length || b.created_at.localeCompare(a.created_at),
      ),
    [ideas.data],
  );

  const busy = update.isPending || remove.isPending || vote.isPending || convert.isPending;

  const submitNew = (values: IdeaFormValues) => {
    create.mutate(
      { title: values.title, body: values.body || null, author_id: me.id },
      { onSuccess: () => setCreating(false), onError: (err) => toast.error(err) },
    );
  };

  return (
    <>
      <PageHead
        title="Идеи"
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}>
            Новая идея
          </button>
        }
      />
      {ideas.isPending ? <EmptyState>Загрузка…</EmptyState> : null}
      {ideas.isError ? <EmptyState>Не удалось загрузить идеи.</EmptyState> : null}
      {ideas.data?.length === 0 ? (
        <EmptyState>Идей пока нет — предложите первую.</EmptyState>
      ) : null}
      <div className="stack">
        {sorted.map((idea) => (
          <IdeaCard
            key={idea.id}
            idea={idea}
            myId={me.id}
            canDelete={isAdmin || idea.author_id === me.id}
            busy={busy}
            onVote={(hasVote) =>
              vote.mutate(
                { ideaId: idea.id, profileId: me.id, hasVote },
                { onError: (err) => toast.error(err) },
              )
            }
            onStatus={(status) =>
              update.mutate(
                { id: idea.id, patch: { status } },
                { onError: (err) => toast.error(err) },
              )
            }
            onEdit={(values) =>
              update
                .mutateAsync({
                  id: idea.id,
                  patch: { title: values.title, body: values.body || null },
                })
                .catch((err: unknown) => toast.error(err))
            }
            onDelete={() => {
              if (!window.confirm(`Удалить идею «${idea.title}»?`)) return;
              remove.mutate(idea.id, { onError: (err) => toast.error(err) });
            }}
            onConvert={() =>
              convert.mutate(idea.id, {
                onSuccess: (taskId) => navigate(`/board?task=${taskId}`),
                onError: (err) => toast.error(err),
              })
            }
          />
        ))}
      </div>
      {creating ? (
        <Modal title="Новая идея" onClose={() => setCreating(false)}>
          <IdeaForm
            initial={{ title: '', body: '' }}
            submitLabel="Предложить"
            busy={create.isPending}
            onSubmit={submitNew}
            onCancel={() => setCreating(false)}
          />
        </Modal>
      ) : null}
    </>
  );
}
