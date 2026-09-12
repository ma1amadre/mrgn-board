import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useProfile } from '../../app/auth/authContext';
import { useIdeaMutations, useIdeas } from '../../shared/api/ideas';
import { useConfirm } from '../../shared/ui/confirmContext';
import { EmptyState } from '../../shared/ui/EmptyState';
import { Modal } from '../../shared/ui/Modal';
import { PageHead } from '../../shared/ui/PageHead';
import { SkeletonCard } from '../../shared/ui/Skeleton';
import { useToast } from '../../shared/ui/toastContext';
import { useDocumentTitle } from '../../shared/ui/useDocumentTitle';
import { IdeaCard } from './IdeaCard';
import { IdeaForm, type IdeaFormValues } from './IdeaForm';

export function IdeasPage() {
  const me = useProfile();
  const { isAdmin } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const ideas = useIdeas();
  const { create, update, remove, vote, convert } = useIdeaMutations();
  const [creating, setCreating] = useState(false);
  const [draftDirty, setDraftDirty] = useState(false);
  useDocumentTitle('Идеи');

  // Сначала самые поддержанные, внутри — новые.
  const sorted = useMemo(
    () =>
      [...(ideas.data ?? [])].sort(
        (a, b) =>
          b.idea_votes.length - a.idea_votes.length || b.created_at.localeCompare(a.created_at),
      ),
    [ideas.data],
  );

  // Блокируем кнопки только у той идеи, с которой идёт запрос.
  const pendingId =
    (update.isPending && update.variables?.id) ||
    (remove.isPending && remove.variables) ||
    (vote.isPending && vote.variables?.ideaId) ||
    (convert.isPending && convert.variables) ||
    null;

  const submitNew = (values: IdeaFormValues) => {
    create.mutate(
      { title: values.title, body: values.body || null, author_id: me.id },
      { onSuccess: () => setCreating(false), onError: (err) => toast.error(err) },
    );
  };

  const edit = async (id: string, values: IdeaFormValues): Promise<boolean> => {
    try {
      await update.mutateAsync({ id, patch: { title: values.title, body: values.body || null } });
      return true;
    } catch (err) {
      toast.error(err);
      return false;
    }
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
      {ideas.isPending ? (
        <div className="stack" aria-busy="true">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}
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
            busy={pendingId === idea.id}
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
            onEdit={(values) => edit(idea.id, values)}
            onDelete={() => {
              void confirm({
                title: `Удалить идею «${idea.title}»?`,
                text: 'Голоса за неё тоже пропадут.',
              }).then((ok) => {
                if (ok) remove.mutate(idea.id, { onError: (err) => toast.error(err) });
              });
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
        <Modal title="Новая идея" onClose={() => setCreating(false)} dirty={draftDirty}>
          <IdeaForm
            initial={{ title: '', body: '' }}
            submitLabel="Предложить"
            busy={create.isPending}
            onSubmit={submitNew}
            onCancel={() => setCreating(false)}
            onDirtyChange={setDraftDirty}
          />
        </Modal>
      ) : null}
    </>
  );
}
